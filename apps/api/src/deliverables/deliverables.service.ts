import { Injectable } from '@nestjs/common';
import type { MembershipRole, Prisma } from '@prisma/client';
import type { createDeliverableSchema, updateDeliverableSchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { formatDay, parseDay } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { lockDeliverable } from './deliverable-lock';
import {
  canCancel,
  canCreateDeliverable,
  canEditMetadata,
  canRequestChanges,
  canSubmit,
  canValidate,
} from './deliverable-policy';
import {
  isDeliverableOverdue,
  sortDeliverables,
  type DeliverableSort,
  type DeliverableStatus,
  type DeliverableType,
} from './deliverable-rules';

const READ_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;

type CreateBody = z.infer<typeof createDeliverableSchema>;
type UpdateBody = z.infer<typeof updateDeliverableSchema>;
type ListQuery = {
  status?: DeliverableStatus;
  type?: DeliverableType;
  objectiveId?: string;
  search?: string;
  sort?: DeliverableSort;
};

const deliverableInclude = {
  objective: { select: { id: true, title: true } },
  createdBy: { select: { id: true, profile: { select: { givenName: true, familyName: true } } } },
  reviewedBy: {
    select: { id: true, profile: { select: { givenName: true, familyName: true } } },
  },
} satisfies Prisma.DeliverableInclude;

type DeliverableRow = Prisma.DeliverableGetPayload<{ include: typeof deliverableInclude }>;

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
  ) {}

  async list(actorId: string, thesisId: string, query: ListQuery) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    const search = query.search?.trim();
    const where: Prisma.DeliverableWhereInput = { thesisId };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.objectiveId) where.objectiveId = query.objectiveId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.deliverable.findMany({ where, include: deliverableInclude });
    const counts = await this.versionCounts(rows.map((row) => row.id));
    const now = new Date();
    return {
      deliverables: sortDeliverables(rows, query.sort ?? 'due').map((row) =>
        this.toListItem(row, now, counts.get(row.id)),
      ),
    };
  }

  async get(actorId: string, thesisId: string, deliverableId: string) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    const row = await this.findInThesis(thesisId, deliverableId);
    return this.toDetail(row, new Date(), await this.versionsSummary(row.id));
  }

  async create(actorId: string, thesisId: string, body: CreateBody, requestId?: string) {
    const role = await this.memberRole(actorId, thesisId);
    if (!canCreateDeliverable(role)) {
      throw new AppException(403, 'FORBIDDEN', 'Création de livrable non autorisée');
    }
    await this.assertObjective(thesisId, body.objectiveId);
    const taskLink = await this.assertTask(thesisId, body.taskId, body.objectiveId);
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const deliverable = await tx.deliverable.create({
        data: {
          thesisId,
          objectiveId: taskLink.objectiveId ?? body.objectiveId ?? null,
          taskId: taskLink.taskId,
          title: body.title.trim(),
          description: blankToNull(body.description),
          type: body.type,
          status: 'DRAFT',
          dueDate: body.dueDate ? parseDay(body.dueDate) : null,
          createdById: actorId,
        },
        include: deliverableInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'deliverable.created',
        entityType: 'deliverable',
        entityId: deliverable.id,
        requestId,
      });
      if (deliverable.objectiveId) {
        await this.audit.record(tx, {
          actorId,
          thesisId,
          action: 'deliverable.objective_linked',
          entityType: 'deliverable',
          entityId: deliverable.id,
          requestId,
        });
      }
      return deliverable;
    });
    return this.toDetail(created, now, await this.versionsSummary(created.id));
  }

  async update(
    actorId: string,
    thesisId: string,
    deliverableId: string,
    body: UpdateBody,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId);
    if (body.status === 'CANCELLED') {
      if (Object.keys(body).some((key) => key !== 'status')) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          { field: 'status', message: 'L’annulation ne se combine pas à d’autres champs' },
        ]);
      }
      return this.cancel(actorId, role, thesisId, deliverableId, requestId);
    }
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.findLocked(tx, thesisId, deliverableId);
      if (role !== 'DOCTORAL_STUDENT') {
        throw new AppException(403, 'FORBIDDEN', 'Seul un doctorant peut modifier un livrable');
      }
      if (!canEditMetadata(role, current.status)) {
        throw new AppException(400, 'BAD_REQUEST', 'Ce livrable n’est plus modifiable');
      }
      if (body.objectiveId) await this.assertObjective(thesisId, body.objectiveId);
      const nextObjective = body.objectiveId === undefined ? current.objectiveId : body.objectiveId;
      const deliverable = await tx.deliverable.update({
        where: { id: current.id },
        data: {
          title: body.title?.trim(),
          description: body.description === undefined ? undefined : blankToNull(body.description),
          type: body.type,
          objectiveId: body.objectiveId === undefined ? undefined : body.objectiveId,
          dueDate:
            body.dueDate === undefined ? undefined : body.dueDate ? parseDay(body.dueDate) : null,
        },
        include: deliverableInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'deliverable.updated',
        entityType: 'deliverable',
        entityId: deliverable.id,
        requestId,
      });
      if (nextObjective && nextObjective !== current.objectiveId) {
        await this.audit.record(tx, {
          actorId,
          thesisId,
          action: 'deliverable.objective_linked',
          entityType: 'deliverable',
          entityId: deliverable.id,
          requestId,
        });
      }
      return deliverable;
    });
    return this.toDetail(updated, now, await this.versionsSummary(updated.id));
  }

  async submit(actorId: string, thesisId: string, deliverableId: string, requestId?: string) {
    const role = await this.memberRole(actorId, thesisId);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await lockDeliverable(tx, thesisId, deliverableId);
      if (!locked) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      const current = await this.findLocked(tx, thesisId, deliverableId);
      if (!canSubmit(role, current.status)) {
        if (role !== 'DOCTORAL_STUDENT') {
          throw new AppException(403, 'FORBIDDEN', 'Seul un doctorant peut soumettre un livrable');
        }
        throw new AppException(400, 'BAD_REQUEST', submitBlockedMessage(current.status));
      }
      const versions = await tx.deliverableVersion.findMany({
        where: { deliverableId: current.id },
        select: { id: true, createdAt: true },
        orderBy: { versionNumber: 'desc' },
        take: 1,
      });
      if (versions.length === 0) {
        throw new AppException(
          400,
          'BAD_REQUEST',
          'Ajoutez au moins une version avant de soumettre le livrable',
        );
      }
      if (
        current.status === 'CHANGES_REQUESTED' &&
        current.reviewedAt &&
        versions[0]!.createdAt <= current.reviewedAt
      ) {
        throw new AppException(
          400,
          'BAD_REQUEST',
          'Ajoutez une nouvelle version avant de resoumettre le livrable',
        );
      }
      const deliverable = await tx.deliverable.update({
        where: { id: current.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: now,
          reviewMessage: null,
          reviewedAt: null,
          reviewedById: null,
        },
        include: deliverableInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'deliverable.submitted',
        entityType: 'deliverable',
        entityId: deliverable.id,
        requestId,
      });
      return deliverable;
    });
    return this.toDetail(updated, now, await this.versionsSummary(updated.id));
  }

  async requestChanges(
    actorId: string,
    thesisId: string,
    deliverableId: string,
    message: string | undefined,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await lockDeliverable(tx, thesisId, deliverableId);
      if (!locked) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      const current = await this.findLocked(tx, thesisId, deliverableId);
      if (!canRequestChanges(role, current.status)) {
        if (role !== 'SUPERVISOR') {
          throw new AppException(
            403,
            'FORBIDDEN',
            'Seul un encadrant peut demander des modifications',
          );
        }
        throw new AppException(
          400,
          'BAD_REQUEST',
          'Seuls les livrables soumis peuvent faire l’objet d’une demande de modifications',
        );
      }
      const deliverable = await tx.deliverable.update({
        where: { id: current.id },
        data: {
          status: 'CHANGES_REQUESTED',
          reviewMessage: blankToNull(message),
          reviewedAt: now,
          reviewedById: actorId,
        },
        include: deliverableInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'deliverable.changes_requested',
        entityType: 'deliverable',
        entityId: deliverable.id,
        requestId,
      });
      return deliverable;
    });
    return this.toDetail(updated, now, await this.versionsSummary(updated.id));
  }

  async approve(actorId: string, thesisId: string, deliverableId: string, requestId?: string) {
    const role = await this.memberRole(actorId, thesisId);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await lockDeliverable(tx, thesisId, deliverableId);
      if (!locked) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      const current = await this.findLocked(tx, thesisId, deliverableId);
      if (!canValidate(role, current.status)) {
        if (role !== 'SUPERVISOR') {
          throw new AppException(403, 'FORBIDDEN', 'Seul un encadrant peut valider un livrable');
        }
        throw new AppException(
          400,
          'BAD_REQUEST',
          'Seuls les livrables soumis peuvent être validés',
        );
      }
      const deliverable = await tx.deliverable.update({
        where: { id: current.id },
        data: {
          status: 'VALIDATED',
          reviewMessage: null,
          reviewedAt: now,
          reviewedById: actorId,
        },
        include: deliverableInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'deliverable.validated',
        entityType: 'deliverable',
        entityId: deliverable.id,
        requestId,
      });
      return deliverable;
    });
    return this.toDetail(updated, now, await this.versionsSummary(updated.id));
  }

  private async cancel(
    actorId: string,
    role: MembershipRole,
    thesisId: string,
    deliverableId: string,
    requestId?: string,
  ) {
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await lockDeliverable(tx, thesisId, deliverableId);
      if (!locked) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      const current = await this.findLocked(tx, thesisId, deliverableId);
      if (role !== 'DOCTORAL_STUDENT') {
        throw new AppException(403, 'FORBIDDEN', 'Seul un doctorant peut annuler un livrable');
      }
      if (!canCancel(role, current.status)) {
        throw new AppException(400, 'BAD_REQUEST', 'Seul un brouillon peut être annulé');
      }
      const deliverable = await tx.deliverable.update({
        where: { id: current.id },
        data: { status: 'CANCELLED' },
        include: deliverableInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'deliverable.cancelled',
        entityType: 'deliverable',
        entityId: deliverable.id,
        requestId,
      });
      return deliverable;
    });
    return this.toDetail(updated, now, await this.versionsSummary(updated.id));
  }

  private async memberRole(actorId: string, thesisId: string): Promise<MembershipRole> {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
    });
    if (!membership) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return membership.role;
  }

  private async assertObjective(thesisId: string, objectiveId: string | null | undefined) {
    if (!objectiveId) return;
    const objective = await this.prisma.objective.findFirst({
      where: { id: objectiveId, thesisId },
      select: { id: true },
    });
    if (!objective) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
        { field: 'objectiveId', message: 'L’objectif doit appartenir à la thèse' },
      ]);
    }
  }

  private async assertTask(
    thesisId: string,
    taskId: string | null | undefined,
    objectiveId: string | null | undefined,
  ): Promise<{ taskId: string | null; objectiveId: string | null }> {
    if (!taskId) return { taskId: null, objectiveId: objectiveId ?? null };
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, objective: { thesisId } },
      select: { id: true, objectiveId: true },
    });
    if (!task) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
        { field: 'taskId', message: 'L’étape doit appartenir à la thèse' },
      ]);
    }
    if (objectiveId && objectiveId !== task.objectiveId) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
        { field: 'taskId', message: 'L’étape doit appartenir à l’objectif choisi' },
      ]);
    }
    const existing = await this.prisma.deliverable.findUnique({
      where: { taskId },
      select: { id: true },
    });
    if (existing) {
      throw new AppException(
        409,
        'CONFLICT',
        'Cette étape a déjà un livrable. Ajoutez une nouvelle version depuis Livrables.',
      );
    }
    return { taskId: task.id, objectiveId: task.objectiveId };
  }

  private async findInThesis(thesisId: string, deliverableId: string): Promise<DeliverableRow> {
    const row = await this.prisma.deliverable.findFirst({
      where: { id: deliverableId, thesisId },
      include: deliverableInclude,
    });
    if (!row) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return row;
  }

  private async findLocked(
    tx: Prisma.TransactionClient,
    thesisId: string,
    deliverableId: string,
  ): Promise<DeliverableRow> {
    const row = await tx.deliverable.findFirst({
      where: { id: deliverableId, thesisId },
      include: deliverableInclude,
    });
    if (!row) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return row;
  }

  private async versionCounts(ids: string[]) {
    const counts = new Map<string, { count: number; latestVersionNumber: number | null }>();
    if (ids.length === 0) return counts;
    const grouped = await this.prisma.deliverableVersion.groupBy({
      by: ['deliverableId'],
      where: { deliverableId: { in: ids } },
      _count: { _all: true },
      _max: { versionNumber: true },
    });
    for (const row of grouped) {
      counts.set(row.deliverableId, {
        count: row._count._all,
        latestVersionNumber: row._max.versionNumber,
      });
    }
    return counts;
  }

  private async versionsSummary(deliverableId: string) {
    const grouped = await this.prisma.deliverableVersion.aggregate({
      where: { deliverableId },
      _count: { _all: true },
      _max: { versionNumber: true },
    });
    const latestVersionNumber = grouped._max.versionNumber;
    if (latestVersionNumber == null) {
      return { count: 0, latestVersionNumber: null, latestVersionCreatedAt: null };
    }
    const latest = await this.prisma.deliverableVersion.findFirst({
      where: { deliverableId, versionNumber: latestVersionNumber },
      select: { createdAt: true },
    });
    return {
      count: grouped._count._all,
      latestVersionNumber,
      latestVersionCreatedAt: latest?.createdAt.toISOString() ?? null,
    };
  }

  private toListItem(
    row: DeliverableRow,
    now: Date,
    counts?: { count: number; latestVersionNumber: number | null },
  ) {
    return {
      id: row.id,
      thesisId: row.thesisId,
      title: row.title,
      type: row.type,
      status: row.status,
      dueDate: formatDay(row.dueDate),
      isOverdue: isDeliverableOverdue(row, now),
      objective: row.objective,
      taskId: row.taskId,
      createdBy: author(row),
      versionCount: counts?.count ?? 0,
      latestVersionNumber: counts?.latestVersionNumber ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetail(
    row: DeliverableRow,
    now: Date,
    summary: {
      count: number;
      latestVersionNumber: number | null;
      latestVersionCreatedAt: string | null;
    },
  ) {
    return {
      ...this.toListItem(row, now, summary),
      description: row.description,
      versionsSummary: summary,
      reviewMessage: row.reviewMessage,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewedBy: reviewer(row),
    };
  }
}

function author(row: DeliverableRow) {
  const profile = row.createdBy.profile;
  if (!profile) throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
  return {
    id: row.createdBy.id,
    givenName: profile.givenName,
    familyName: profile.familyName,
  };
}

function reviewer(row: DeliverableRow) {
  if (!row.reviewedBy) return null;
  const profile = row.reviewedBy.profile;
  if (!profile) throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
  return {
    id: row.reviewedBy.id,
    givenName: profile.givenName,
    familyName: profile.familyName,
  };
}

function blankToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function submitBlockedMessage(status: DeliverableStatus): string {
  if (status === 'SUBMITTED') return 'Ce livrable est déjà soumis';
  if (status === 'VALIDATED') return 'Un livrable validé ne peut plus être soumis';
  if (status === 'CANCELLED') return 'Un livrable annulé ne peut plus être soumis';
  return 'Ce livrable ne peut pas être soumis à ce stade';
}
