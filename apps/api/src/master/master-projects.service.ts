import { Inject, Injectable } from '@nestjs/common';
import { AuthMailer } from '../auth/auth-mailer';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { createOpaqueToken, hashOpaqueToken } from '../common/security/opaque-token';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { buildInviteMail } from '../invitations/invite-mail';
import { isMasterSpaceEmail, masterSpaceEmails, masterSupervisorEmail } from './master-space';

const INVITATION_OPEN_UNTIL = new Date('9999-12-31T00:00:00.000Z');

@Injectable()
export class MasterProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailer: AuthMailer,
    private readonly logger: StructuredLogger,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async bootstrap(input: { userId: string; title: string; requestId?: string }) {
    const title = input.title.trim();
    const created = await this.prisma.$transaction(async (tx) => {
      const thesis = await tx.thesis.create({
        data: {
          title,
          track: 'MASTER',
          memberships: {
            create: { userId: input.userId, role: 'DOCTORAL_STUDENT' },
          },
        },
      });
      await this.audit.record(tx, {
        actorId: input.userId,
        thesisId: thesis.id,
        action: 'thesis.master_project_created',
        entityType: 'thesis',
        entityId: thesis.id,
        requestId: input.requestId,
      });
      return thesis;
    });

    await this.inviteDefaultStaff({
      actorId: input.userId,
      thesisId: created.id,
      thesisTitle: created.title,
      requestId: input.requestId,
    });
    return created;
  }

  async convertExisting(input: { userId: string; thesisId: string; requestId?: string }) {
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId: input.thesisId, userId: input.userId } },
      include: { thesis: true },
    });
    if (membership?.role !== 'DOCTORAL_STUDENT' || !membership.thesis) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }
    if (membership.thesis.track === 'MASTER') return membership.thesis;

    const thesis = await this.prisma.thesis.update({
      where: { id: input.thesisId },
      data: { track: 'MASTER' },
    });
    await this.audit.record(this.prisma, {
      actorId: input.userId,
      thesisId: thesis.id,
      action: 'thesis.master_project_converted',
      entityType: 'thesis',
      entityId: thesis.id,
      requestId: input.requestId,
    });
    await this.inviteDefaultStaff({
      actorId: input.userId,
      thesisId: thesis.id,
      thesisTitle: thesis.title,
      requestId: input.requestId,
    });
    return thesis;
  }

  isSpaceEmail(email: string | null | undefined): boolean {
    return isMasterSpaceEmail(email, this.env);
  }

  private async inviteDefaultStaff(input: {
    actorId: string;
    thesisId: string;
    thesisTitle: string;
    requestId?: string;
  }) {
    const student = await this.prisma.user.findUnique({
      where: { id: input.actorId },
      include: { profile: true },
    });
    const studentEmail = student?.email ?? '';
    const staff = [
      ...new Set([...masterSpaceEmails(this.env), masterSupervisorEmail(this.env)]),
    ].filter((email) => email !== studentEmail);

    for (const email of staff) {
      await this.grantOrInvite({
        actorId: input.actorId,
        thesisId: input.thesisId,
        thesisTitle: input.thesisTitle,
        inviterName: student?.profile?.displayName ?? 'Thesis Flow',
        email,
        requestId: input.requestId,
      });
    }
  }

  private async grantOrInvite(input: {
    actorId: string;
    thesisId: string;
    thesisTitle: string;
    inviterName: string;
    email: string;
    requestId?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, disabledAt: true, deletedAt: true },
    });
    if (existing && !existing.disabledAt && !existing.deletedAt) {
      await this.prisma.thesisMembership.upsert({
        where: { thesisId_userId: { thesisId: input.thesisId, userId: existing.id } },
        update: { role: 'SUPERVISOR' },
        create: { thesisId: input.thesisId, userId: existing.id, role: 'SUPERVISOR' },
      });
      return;
    }

    const pending = await this.prisma.invitation.findFirst({
      where: {
        thesisId: input.thesisId,
        email: input.email,
        role: 'SUPERVISOR',
        status: 'PENDING',
      },
    });
    if (pending) return;

    const token = createOpaqueToken();
    const invitation = await this.prisma.invitation.create({
      data: {
        thesisId: input.thesisId,
        email: input.email,
        role: 'SUPERVISOR',
        status: 'PENDING',
        tokenHash: hashOpaqueToken(token),
        invitedById: input.actorId,
        expiresAt: INVITATION_OPEN_UNTIL,
      },
    });
    await this.audit.record(this.prisma, {
      actorId: input.actorId,
      thesisId: input.thesisId,
      action: 'invitation.created',
      entityType: 'invitation',
      entityId: invitation.id,
      requestId: input.requestId,
      metadata: { email: input.email, role: 'SUPERVISOR', track: 'MASTER' },
    });

    const acceptUrl = `${this.env.APP_URL.replace(/\/$/, '')}/invitations/repondre?token=${encodeURIComponent(token)}`;
    const mail = buildInviteMail({
      appUrl: this.env.APP_URL,
      thesisTitle: input.thesisTitle,
      inviterName: input.inviterName,
      role: 'SUPERVISOR',
      acceptUrl,
      replacesSupervisor: false,
    });
    try {
      await this.mailer.send({ to: input.email, ...mail });
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { emailStatus: 'SENT', emailSentAt: new Date(), emailAttemptedAt: new Date() },
      });
    } catch {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { emailStatus: 'FAILED', emailAttemptedAt: new Date(), emailLastError: 'smtp' },
      });
      this.logger.write({
        level: 'error',
        msg: 'master.invite_mail_failed',
        thesisId: input.thesisId,
      });
    }
  }
}
