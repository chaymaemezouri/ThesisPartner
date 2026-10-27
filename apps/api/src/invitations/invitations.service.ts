import { Inject, Injectable } from '@nestjs/common';
import type {
  InvitationEmailStatus,
  InvitationStatus,
  MembershipRole,
  Prisma,
} from '@prisma/client';
import { MEMBERSHIP_ROLES } from '@thesispartner/types';
import type { inviteMemberSchema, supervisorChangeBodySchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AuthMailer } from '../auth/auth-mailer';
import { AppException } from '../common/errors/app.exception';
import { createOpaqueToken, hashOpaqueToken } from '../common/security/opaque-token';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { assertCanInvite } from '../theses/invite.policy';
import { buildInviteMail } from './invite-mail';

const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

type InviteBody = z.infer<typeof inviteMemberSchema>;
type ChangeBody = z.infer<typeof supervisorChangeBodySchema>;

type InvitationRow = {
  id: string;
  thesisId: string;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  emailStatus: InvitationEmailStatus;
  replacesSupervisor: boolean;
  changeReason: string | null;
  expiresAt: Date;
  createdAt: Date;
  respondedAt: Date | null;
  thesis: { id: string; title: string };
  invitedBy: { profile: { displayName: string } | null };
};

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
    private readonly mailer: AuthMailer,
    private readonly logger: StructuredLogger,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async create(actorId: string, thesisId: string, body: InviteBody, requestId?: string) {
    return this.createInvitation(actorId, thesisId, {
      email: body.email,
      role: body.role,
      replacesSupervisor: false,
      changeReason: null,
      requestId,
    });
  }

  async requestSupervisorChange(
    actorId: string,
    thesisId: string,
    body: ChangeBody,
    requestId?: string,
  ) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT'],
    });
    const current = await this.prisma.thesisMembership.findFirst({
      where: { thesisId, role: 'SUPERVISOR' },
      select: { id: true, user: { select: { email: true } } },
    });
    if (!current) {
      throw new AppException(
        400,
        'BAD_REQUEST',
        'No active supervisor to replace. Invite a supervisor first.',
      );
    }
    if (current.user.email === body.email) {
      throw new AppException(409, 'CONFLICT', 'This person is already the supervisor');
    }
    return this.createInvitation(actorId, thesisId, {
      email: body.email,
      role: 'SUPERVISOR',
      replacesSupervisor: true,
      changeReason: body.reason,
      requestId,
    });
  }

  async listForThesis(actorId: string, thesisId: string) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: MEMBERSHIP_ROLES,
    });
    await this.expirePending();
    const rows = await this.prisma.invitation.findMany({
      where: { thesisId },
      include: {
        thesis: { select: { id: true, title: true } },
        invitedBy: { include: { profile: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { invitations: rows.map((row) => this.toSummary(row)) };
  }

  async inbox(actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { email: true },
    });
    if (!user) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    await this.expirePending();
    const rows = await this.prisma.invitation.findMany({
      where: { email: user.email, status: { in: ['PENDING', 'ACCEPTED', 'REJECTED'] } },
      include: {
        thesis: { select: { id: true, title: true } },
        invitedBy: { include: { profile: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { invitations: rows.map((row) => this.toSummary(row)) };
  }

  async previewByToken(token: string) {
    await this.expirePending();
    const invitation = await this.findByToken(token);
    const account = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, disabledAt: true },
    });
    return {
      thesisTitle: invitation.thesis.title,
      role: invitation.role,
      email: invitation.email,
      status: invitation.status,
      replacesSupervisor: invitation.replacesSupervisor,
      invitedByName: invitation.invitedBy.profile?.displayName ?? 'Thesis Flow',
      expiresAt: invitation.expiresAt.toISOString(),
      requiresAccount: !account || account.disabledAt != null,
    };
  }

  async accept(actorId: string, token: string, requestId?: string) {
    const invitation = await this.findByToken(token);
    return this.acceptInvitation(actorId, invitation.id, requestId);
  }

  async acceptById(actorId: string, invitationId: string, requestId?: string) {
    return this.acceptInvitation(actorId, invitationId, requestId);
  }

  async reject(actorId: string, token: string, requestId?: string) {
    const invitation = await this.findByToken(token);
    return this.rejectInvitation(actorId, invitation.id, requestId);
  }

  async rejectById(actorId: string, invitationId: string, requestId?: string) {
    return this.rejectInvitation(actorId, invitationId, requestId);
  }

  private async acceptInvitation(actorId: string, invitationId: string, requestId?: string) {
    await this.expirePending();
    const actor = await this.requireUser(actorId);
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        thesis: { select: { id: true, title: true } },
        invitedBy: { include: { profile: { select: { displayName: true } } } },
      },
    });
    if (!invitation) throw new AppException(404, 'NOT_FOUND', 'Invitation not found');
    this.assertPending(invitation);
    if (actor.email !== invitation.email) {
      throw new AppException(
        403,
        'FORBIDDEN',
        'Sign in with the invited email address to accept this invitation',
      );
    }
    if (actor.disabledAt) {
      throw new AppException(403, 'FORBIDDEN', 'This account is suspended');
    }

    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.invitation.findUnique({ where: { id: invitation.id } });
      if (!fresh || fresh.status !== 'PENDING') {
        throw new AppException(409, 'CONFLICT', 'This invitation is no longer pending');
      }

      const existingMember = await tx.thesisMembership.findUnique({
        where: { thesisId_userId: { thesisId: invitation.thesisId, userId: actorId } },
      });
      if (existingMember) {
        throw new AppException(409, 'CONFLICT', 'This person is already a member');
      }

      if (invitation.role === 'SUPERVISOR') {
        const currentSupervisor = await tx.thesisMembership.findFirst({
          where: { thesisId: invitation.thesisId, role: 'SUPERVISOR' },
        });
        if (currentSupervisor && !invitation.replacesSupervisor) {
          throw new AppException(
            409,
            'CONFLICT',
            'Cette thèse a déjà un encadrant. Le co-encadrement n’est pas disponible dans cette version.',
          );
        }
        if (currentSupervisor && invitation.replacesSupervisor) {
          await tx.supervisionHistory.create({
            data: {
              thesisId: invitation.thesisId,
              supervisorUserId: currentSupervisor.userId,
              startedAt: currentSupervisor.createdAt,
              endedAt: new Date(),
              endedReason: 'REPLACED',
              changeReason: invitation.changeReason,
              invitationId: invitation.id,
            },
          });
          await tx.thesisMembership.delete({ where: { id: currentSupervisor.id } });
          await this.audit.record(tx, {
            actorId,
            thesisId: invitation.thesisId,
            action: 'supervision.replaced',
            entityType: 'thesis_membership',
            entityId: currentSupervisor.id,
            requestId,
            metadata: {
              previousSupervisorId: currentSupervisor.userId,
              invitationId: invitation.id,
              reason: invitation.changeReason,
            },
          });
        }
      }

      const membership = await tx.thesisMembership.create({
        data: {
          thesisId: invitation.thesisId,
          userId: actorId,
          role: invitation.role,
        },
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
      await tx.invitation.updateMany({
        where: {
          thesisId: invitation.thesisId,
          role: 'SUPERVISOR',
          status: 'PENDING',
          id: { not: invitation.id },
        },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId: invitation.thesisId,
        action: 'invitation.accepted',
        entityType: 'invitation',
        entityId: invitation.id,
        requestId,
        metadata: { membershipId: membership.id, role: invitation.role },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId: invitation.thesisId,
        action: 'membership.create',
        entityType: 'thesis_membership',
        entityId: membership.id,
        requestId,
      });
    });

    return this.getSummaryById(invitation.id);
  }

  private async rejectInvitation(actorId: string, invitationId: string, requestId?: string) {
    await this.expirePending();
    const actor = await this.requireUser(actorId);
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) throw new AppException(404, 'NOT_FOUND', 'Invitation not found');
    this.assertPending(invitation);
    if (actor.email !== invitation.email) {
      throw new AppException(
        403,
        'FORBIDDEN',
        'Sign in with the invited email address to reject this invitation',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.invitation.updateMany({
        where: { id: invitationId, status: 'PENDING' },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });
      if (updated.count === 0) {
        throw new AppException(409, 'CONFLICT', 'This invitation is no longer pending');
      }
      await this.audit.record(tx, {
        actorId,
        thesisId: invitation.thesisId,
        action: 'invitation.rejected',
        entityType: 'invitation',
        entityId: invitationId,
        requestId,
      });
    });

    return this.getSummaryById(invitationId);
  }

  async cancel(actorId: string, thesisId: string, invitationId: string, requestId?: string) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'],
    });
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, thesisId },
    });
    if (!invitation) throw new AppException(404, 'NOT_FOUND', 'Invitation not found');
    if (invitation.status !== 'PENDING') {
      throw new AppException(409, 'CONFLICT', 'Only pending invitations can be cancelled');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'invitation.cancelled',
        entityType: 'invitation',
        entityId: invitationId,
        requestId,
      });
    });
    return this.getSummaryById(invitationId);
  }

  async resend(actorId: string, thesisId: string, invitationId: string, requestId?: string) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'],
    });
    await this.expirePending();
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, thesisId },
      include: {
        thesis: { select: { id: true, title: true } },
        invitedBy: { include: { profile: { select: { displayName: true } } } },
      },
    });
    if (!invitation) throw new AppException(404, 'NOT_FOUND', 'Invitation not found');
    if (invitation.status !== 'PENDING') {
      throw new AppException(409, 'CONFLICT', 'Only pending invitations can be resent');
    }
    if (
      this.env.NODE_ENV !== 'test' &&
      invitation.emailAttemptedAt &&
      Date.now() - invitation.emailAttemptedAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      throw new AppException(
        429,
        'RATE_LIMITED',
        'Wait a minute before sending this invitation again',
      );
    }

    const token = createOpaqueToken();
    await this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitationId },
        data: {
          tokenHash: hashOpaqueToken(token),
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'invitation.resent',
        entityType: 'invitation',
        entityId: invitationId,
        requestId,
      });
    });

    await this.deliverInviteEmail({
      invitationId,
      to: invitation.email,
      thesisTitle: invitation.thesis.title,
      inviterName: invitation.invitedBy.profile?.displayName ?? 'Thesis Flow',
      role: invitation.role,
      token,
      replacesSupervisor: invitation.replacesSupervisor,
    });

    return this.getSummaryById(invitationId);
  }

  async adminList(query: {
    search?: string;
    status?: InvitationStatus;
    page: number;
    pageSize: number;
  }) {
    await this.expirePending();
    const where: Prisma.InvitationWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { email: { contains: search.toLowerCase(), mode: 'insensitive' } },
        { thesis: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.invitation.count({ where }),
      this.prisma.invitation.findMany({
        where,
        include: {
          thesis: { select: { id: true, title: true } },
          invitedBy: { include: { profile: { select: { displayName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      invitations: rows.map((row) => this.toSummary(row)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async adminThesisRelations(thesisId: string) {
    await this.expirePending();
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
      include: {
        memberships: {
          include: { user: { include: { profile: true } } },
          orderBy: { createdAt: 'asc' },
        },
        invitations: {
          include: {
            thesis: { select: { id: true, title: true } },
            invitedBy: { include: { profile: { select: { displayName: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        supervisionHistory: {
          include: { supervisor: { include: { profile: true } } },
          orderBy: { endedAt: 'desc' },
          take: 100,
        },
      },
    });
    if (!thesis) throw new AppException(404, 'NOT_FOUND', 'Thesis not found');

    return {
      thesisId: thesis.id,
      thesisTitle: thesis.title,
      thesisStatus: thesis.status,
      members: thesis.memberships.flatMap((item) => {
        if (!item.user.profile) return [];
        return [
          {
            userId: item.userId,
            email: item.user.email,
            displayName: item.user.profile.displayName,
            role: item.role,
            since: item.createdAt.toISOString(),
          },
        ];
      }),
      invitations: thesis.invitations.map((row) => this.toSummary(row)),
      supervisionHistory: thesis.supervisionHistory.flatMap((row) => {
        if (!row.supervisor.profile) return [];
        return [
          {
            id: row.id,
            supervisorUserId: row.supervisorUserId,
            supervisorName: row.supervisor.profile.displayName,
            supervisorEmail: row.supervisor.email,
            startedAt: row.startedAt.toISOString(),
            endedAt: row.endedAt.toISOString(),
            endedReason: row.endedReason,
            changeReason: row.changeReason,
          },
        ];
      }),
    };
  }

  private async createInvitation(
    actorId: string,
    thesisId: string,
    input: {
      email: string;
      role: MembershipRole;
      replacesSupervisor: boolean;
      changeReason: string | null;
      requestId?: string;
    },
  ) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: MEMBERSHIP_ROLES,
    });
    const actor = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
      include: { user: { include: { profile: true } }, thesis: true },
    });
    if (!actor) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    assertCanInvite(actor.role, input.role);

    const email = input.email.trim().toLowerCase();
    if (email === actor.user.email) {
      throw new AppException(409, 'CONFLICT', 'This person is already a member');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser?.disabledAt) {
      throw new AppException(404, 'NOT_FOUND', 'No active account matches this email');
    }
    if (existingUser) {
      const alreadyMember = await this.prisma.thesisMembership.findUnique({
        where: { thesisId_userId: { thesisId, userId: existingUser.id } },
      });
      if (alreadyMember) {
        throw new AppException(409, 'CONFLICT', 'This person is already a member');
      }
    }

    await this.expirePending();

    if (input.role === 'SUPERVISOR' && !input.replacesSupervisor) {
      const supervisor = await this.prisma.thesisMembership.findFirst({
        where: { thesisId, role: 'SUPERVISOR' },
        select: { id: true },
      });
      if (supervisor) {
        throw new AppException(
          409,
          'CONFLICT',
          'Cette thèse a déjà un encadrant. Utilisez le changement d’encadrant pour le remplacer.',
        );
      }
    }

    const pendingSame = await this.prisma.invitation.findFirst({
      where: { thesisId, email, role: input.role, status: 'PENDING' },
    });
    if (pendingSame) {
      throw new AppException(409, 'CONFLICT', 'A pending invitation already exists for this email');
    }

    if (input.role === 'SUPERVISOR') {
      const pendingSupervisor = await this.prisma.invitation.findFirst({
        where: { thesisId, role: 'SUPERVISOR', status: 'PENDING' },
      });
      if (pendingSupervisor) {
        throw new AppException(
          409,
          'CONFLICT',
          'A pending supervisor invitation already exists. Cancel or wait for a response.',
        );
      }
    }

    const token = createOpaqueToken();
    const invitation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invitation.create({
        data: {
          thesisId,
          email,
          role: input.role,
          status: 'PENDING',
          tokenHash: hashOpaqueToken(token),
          invitedById: actorId,
          replacesSupervisor: input.replacesSupervisor,
          changeReason: input.changeReason,
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: input.replacesSupervisor
          ? 'invitation.supervisor_change_created'
          : 'invitation.created',
        entityType: 'invitation',
        entityId: created.id,
        requestId: input.requestId,
        metadata: {
          email,
          role: input.role,
          replacesSupervisor: input.replacesSupervisor,
        },
      });
      return created;
    });

    const emailStatus = await this.deliverInviteEmail({
      invitationId: invitation.id,
      to: email,
      thesisTitle: actor.thesis.title,
      inviterName: actor.user.profile?.displayName ?? 'Thesis Flow',
      role: input.role,
      token,
      replacesSupervisor: input.replacesSupervisor,
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      emailStatus,
      expiresAt: invitation.expiresAt.toISOString(),
      replacesSupervisor: invitation.replacesSupervisor,
    };
  }

  private async findByToken(token: string) {
    if (!token || token.length < 20 || token.length > 200) {
      throw new AppException(400, 'BAD_REQUEST', 'This link is invalid or expired');
    }
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
      include: {
        thesis: { select: { id: true, title: true } },
        invitedBy: { include: { profile: { select: { displayName: true } } } },
      },
    });
    if (!invitation) {
      throw new AppException(400, 'BAD_REQUEST', 'This link is invalid or expired');
    }
    return invitation;
  }

  private assertPending(invitation: { status: InvitationStatus; expiresAt: Date }) {
    if (invitation.status === 'EXPIRED' || invitation.expiresAt.getTime() <= Date.now()) {
      throw new AppException(400, 'BAD_REQUEST', 'This invitation has expired');
    }
    if (invitation.status !== 'PENDING') {
      throw new AppException(409, 'CONFLICT', 'This invitation is no longer pending');
    }
  }

  private async expirePending(): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { status: 'PENDING', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    return user;
  }

  private async getSummaryById(id: string) {
    const row = await this.prisma.invitation.findUniqueOrThrow({
      where: { id },
      include: {
        thesis: { select: { id: true, title: true } },
        invitedBy: { include: { profile: { select: { displayName: true } } } },
      },
    });
    return this.toSummary(row);
  }

  private toSummary(row: InvitationRow) {
    return {
      id: row.id,
      thesisId: row.thesisId,
      thesisTitle: row.thesis.title,
      email: row.email,
      role: row.role,
      status: row.status,
      emailStatus: row.emailStatus,
      replacesSupervisor: row.replacesSupervisor,
      changeReason: row.changeReason,
      invitedByName: row.invitedBy.profile?.displayName ?? 'Thesis Flow',
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      respondedAt: row.respondedAt?.toISOString() ?? null,
    };
  }

  private async deliverInviteEmail(input: {
    invitationId: string;
    to: string;
    thesisTitle: string;
    inviterName: string;
    role: MembershipRole;
    token: string;
    replacesSupervisor: boolean;
  }): Promise<InvitationEmailStatus> {
    const acceptUrl = `${this.env.APP_URL.replace(/\/$/, '')}/invitation?token=${encodeURIComponent(input.token)}`;
    const mail = buildInviteMail({
      thesisTitle: input.thesisTitle,
      inviterName: input.inviterName,
      role: input.role,
      acceptUrl,
      replacesSupervisor: input.replacesSupervisor,
    });
    await this.prisma.invitation.update({
      where: { id: input.invitationId },
      data: { emailAttemptedAt: new Date() },
    });
    try {
      await this.mailer.send({
        to: input.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      await this.prisma.invitation.update({
        where: { id: input.invitationId },
        data: {
          emailStatus: 'SENT',
          emailSentAt: new Date(),
          emailLastError: null,
        },
      });
      return 'SENT';
    } catch {
      await this.prisma.invitation.update({
        where: { id: input.invitationId },
        data: {
          emailStatus: 'FAILED',
          emailLastError: 'smtp_error',
        },
      });
      this.logger.write({ level: 'error', msg: 'invitation.mail.failed' });
      return 'FAILED';
    }
  }
}
