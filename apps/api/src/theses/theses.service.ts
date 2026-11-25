import { Inject, Injectable } from '@nestjs/common';
import { MEMBERSHIP_ROLES } from '@thesispartner/types';
import type {
  createThesisSchema,
  inviteMemberSchema,
  updateThesisSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { cleared, formatDay, parseDay } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { isMasterSpaceEmail } from '../master/master-space';
import { MasterProjectsService } from '../master/master-projects.service';
import { InvitationsService } from '../invitations/invitations.service';
import { StandardPathService } from '../objectives/standard-path.service';
import { resolveAvatarUrl } from '../profile/profile.service';

type CreateThesisBody = z.infer<typeof createThesisSchema>;
type InviteBody = z.infer<typeof inviteMemberSchema>;
type UpdateThesisBody = z.infer<typeof updateThesisSchema>;

@Injectable()
export class ThesesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
    private readonly standardPath: StandardPathService,
    private readonly invitations: InvitationsService,
    private readonly masterProjects: MasterProjectsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async list(userId: string) {
    const memberships = await this.prisma.thesisMembership.findMany({
      where: { userId },
      include: { thesis: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      theses: memberships.map((membership) => ({
        id: membership.thesis.id,
        title: membership.thesis.title,
        status: membership.thesis.status,
        track: membership.thesis.track,
        role: membership.role,
      })),
    };
  }

  async get(userId: string, thesisId: string) {
    await this.access.assertCanAccess({
      actorId: userId,
      thesisId,
      allowedRoles: MEMBERSHIP_ROLES,
    });
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
      include: {
        memberships: {
          include: { user: { include: { profile: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const membership = thesis?.memberships.find((item) => item.userId === userId);
    if (!thesis) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }
    let role = membership?.role;
    if (!role) {
      const actor = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (thesis.track !== 'MASTER' || !isMasterSpaceEmail(actor?.email, this.env)) {
        throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      }
      role = 'SUPERVISOR';
    }
    return {
      id: thesis.id,
      title: thesis.title,
      description: thesis.description,
      status: thesis.status,
      track: thesis.track,
      role,
      discipline: thesis.discipline,
      institution: thesis.institution,
      startedOn: formatDay(thesis.startedOn),
      expectedDefenseOn: formatDay(thesis.expectedDefenseOn),
      doctoralYear: thesis.doctoralYear,
      members: thesis.memberships.flatMap((membership) => {
        if (!membership.user.profile) return [];
        return [
          {
            id: membership.id,
            userId: membership.userId,
            displayName: membership.user.profile.displayName,
            givenName: membership.user.profile.givenName,
            familyName: membership.user.profile.familyName,
            email: membership.user.email,
            phone: membership.user.profile.phone,
            role: membership.role,
            academicTitle: membership.user.profile.academicTitle,
            institution: membership.user.profile.institution,
            laboratory: membership.user.profile.laboratory,
            doctoralSchool: membership.user.profile.doctoralSchool,
            specialty: membership.user.profile.specialty,
            avatarUrl: resolveAvatarUrl(membership.userId, membership.user.profile.avatarUrl),
            orcid: membership.user.profile.orcid,
            googleScholarUrl: membership.user.profile.googleScholarUrl,
            linkedinUrl: membership.user.profile.linkedinUrl,
          },
        ];
      }),
    };
  }

  async create(userId: string, body: CreateThesisBody, requestId?: string, locale?: string) {
    if (body.masterStudent) {
      await this.access.assertEmailVerified(userId);
      const alreadyStudent = await this.prisma.thesisMembership.count({
        where: { userId, role: 'DOCTORAL_STUDENT' },
      });
      if (alreadyStudent > 0 && process.env.NODE_ENV !== 'test') {
        throw new AppException(409, 'CONFLICT', 'V1 covers one main thesis per doctoral student');
      }
      const thesis = await this.masterProjects.bootstrap({
        userId,
        title: body.title,
        requestId,
      });
      return {
        id: thesis.id,
        title: thesis.title,
        status: thesis.status,
        track: thesis.track,
        role: 'DOCTORAL_STUDENT' as const,
      };
    }
    await this.access.assertCanCreateThesis(userId);
    const thesis = await this.prisma.$transaction(async (tx) => {
      const created = await tx.thesis.create({
        data: {
          title: body.title,
          memberships: {
            create: { userId, role: 'DOCTORAL_STUDENT' },
          },
        },
      });
      await this.audit.record(tx, {
        actorId: userId,
        thesisId: created.id,
        action: 'thesis.create',
        entityType: 'thesis',
        entityId: created.id,
        requestId,
      });
      await this.standardPath.apply(tx, created.id, userId, locale);
      return created;
    });
    return {
      id: thesis.id,
      title: thesis.title,
      status: thesis.status,
      track: thesis.track,
      role: 'DOCTORAL_STUDENT' as const,
    };
  }

  async convertToMaster(userId: string, thesisId: string, requestId?: string) {
    await this.access.assertEmailVerified(userId);
    const thesis = await this.masterProjects.convertExisting({ userId, thesisId, requestId });
    return this.get(userId, thesis.id);
  }

  async update(userId: string, thesisId: string, body: UpdateThesisBody, requestId?: string) {
    await this.access.assertCanAccess({
      actorId: userId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR'],
      write: true,
    });
    const data = {
      title: body.title,
      description: cleared(body.description),
      discipline: cleared(body.discipline),
      institution: cleared(body.institution),
      doctoralYear: body.doctoralYear,
      startedOn:
        body.startedOn === undefined
          ? undefined
          : body.startedOn === ''
            ? null
            : parseDay(body.startedOn),
      expectedDefenseOn:
        body.expectedDefenseOn === undefined
          ? undefined
          : body.expectedDefenseOn === ''
            ? null
            : parseDay(body.expectedDefenseOn),
    };
    const changes = Object.fromEntries(
      Object.entries(data).filter((entry) => entry[1] !== undefined),
    );
    if (Object.keys(changes).length === 0) return this.get(userId, thesisId);

    await this.prisma.$transaction(async (tx) => {
      await tx.thesis.update({ where: { id: thesisId }, data: changes });
      await this.audit.record(tx, {
        actorId: userId,
        thesisId,
        action: 'thesis.update',
        entityType: 'thesis',
        entityId: thesisId,
        requestId,
      });
    });
    return this.get(userId, thesisId);
  }

  async remove(userId: string, thesisId: string, requestId?: string) {
    await this.access.assertCanAccess({
      actorId: userId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT'],
      write: true,
    });
    await this.prisma.$transaction(async (tx) => {
      await this.audit.record(tx, {
        actorId: userId,
        thesisId,
        action: 'thesis.deleted',
        entityType: 'thesis',
        entityId: thesisId,
        requestId,
      });
      await tx.thesis.delete({ where: { id: thesisId } });
    });
    return { id: thesisId };
  }

  async standardPathState(actorId: string, thesisId: string) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'],
    });
    return { applied: await this.standardPath.applied(thesisId) };
  }

  async applyStandardPath(actorId: string, thesisId: string, locale?: string) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR'],
      write: true,
    });
    const created = await this.prisma.$transaction((tx) =>
      this.standardPath.apply(tx, thesisId, actorId, locale),
    );
    return { applied: true, created };
  }

  async localizeStandardPath(actorId: string, thesisId: string, locale?: string) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'],
    });
    await this.standardPath.localize(thesisId, locale);
    return { localized: true };
  }

  /** @deprecated Prefer POST /theses/:id/invitations — kept for compatibility. */
  async invite(actorId: string, thesisId: string, body: InviteBody, requestId?: string) {
    return this.invitations.create(actorId, thesisId, body, requestId);
  }
}
