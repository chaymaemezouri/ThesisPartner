import { Injectable } from '@nestjs/common';
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
import { PrismaService } from '../infrastructure/prisma/prisma.service';
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
    const actor = thesis?.memberships.find((membership) => membership.userId === userId);
    if (!thesis || !actor) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }
    return {
      id: thesis.id,
      title: thesis.title,
      status: thesis.status,
      role: actor.role,
      discipline: thesis.discipline,
      institution: thesis.institution,
      startedOn: formatDay(thesis.startedOn),
      expectedDefenseOn: formatDay(thesis.expectedDefenseOn),
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
          },
        ];
      }),
    };
  }

  async create(userId: string, body: CreateThesisBody, requestId?: string) {
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
      await this.standardPath.apply(tx, created.id, userId);
      return created;
    });
    return {
      id: thesis.id,
      title: thesis.title,
      status: thesis.status,
      role: 'DOCTORAL_STUDENT' as const,
    };
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
      discipline: cleared(body.discipline),
      institution: cleared(body.institution),
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

  async applyStandardPath(actorId: string, thesisId: string) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR'],
      write: true,
    });
    const created = await this.prisma.$transaction((tx) =>
      this.standardPath.apply(tx, thesisId, actorId),
    );
    return { applied: true, created };
  }

  /** @deprecated Prefer POST /theses/:id/invitations — kept for compatibility. */
  async invite(actorId: string, thesisId: string, body: InviteBody, requestId?: string) {
    return this.invitations.create(actorId, thesisId, body, requestId);
  }
}
