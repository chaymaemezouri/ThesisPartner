import { Injectable } from '@nestjs/common';
import type { MembershipRole, ObjectiveReviewStatus, Prisma } from '@prisma/client';
import type { createObjectiveSchema, updateObjectiveSchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { formatDay, parseDay } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { lockObjective } from './objective-lock';
import { ObjectiveProgressService } from './objective-progress.service';
import {
  isOverdue,
  ObjectiveRuleError,
  sortObjectives,
  type ObjectivePriority,
  type ObjectiveStatus,
} from './objective-rules';

const READ_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;
const WRITE_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR'] as const;

type CreateBody = z.infer<typeof createObjectiveSchema>;
type UpdateBody = z.infer<typeof updateObjectiveSchema>;
type ListQuery = {
  status?: ObjectiveStatus;
  priority?: ObjectivePriority;
  search?: string;
  overdue?: 'true' | 'false';
};

const objectiveInclude = {
  responsibleUser: { include: { profile: true } },
  validatedBy: { include: { profile: true } },
  tasks: { select: { status: true } },
} satisfies Prisma.ObjectiveInclude;

type ObjectiveRow = Prisma.ObjectiveGetPayload<{ include: typeof objectiveInclude }>;

@Injectable()
export class ObjectivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
    private readonly progress: ObjectiveProgressService,
  ) {}

  async list(actorId: string, thesisId: string, query: ListQuery) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    const where = this.where(thesisId, query);
    if (!where) return { objectives: [] };
    const rows = await this.prisma.objective.findMany({ where, include: objectiveInclude });
    const now = new Date();
    return {
      objectives: sortObjectives(rows, now, query.status).map((row) => this.toDto(row, now)),
    };
  }

  async get(actorId: string, thesisId: string, objectiveId: string) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    const row = await this.findInThesis(thesisId, objectiveId);
    return this.toDto(row, new Date());
  }

  async create(actorId: string, thesisId: string, body: CreateBody, requestId?: string) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: WRITE_ROLES });
    const role = await this.roleOf(actorId, thesisId);
    this.assertMayComplete(role, body.status);
    await this.assertResponsible(thesisId, body.responsibleUserId);
    const now = new Date();
    const normalized = this.normalize(
      {
        status: body.status ?? 'PLANNED',
        priority: body.priority ?? this.progress.defaultPriority(),
        progress: body.progress ?? 0,
        startDate: body.startDate ? parseDay(body.startDate) : null,
        dueDate: body.dueDate ? parseDay(body.dueDate) : null,
        completedAt: null,
      },
      now,
    );
    const created = await this.prisma.$transaction(async (tx) => {
      const objective = await tx.objective.create({
        data: {
          thesisId,
          title: body.title,
          description: blankToNull(body.description),
          status: normalized.status,
          priority: normalized.priority,
          startDate: normalized.startDate,
          dueDate: normalized.dueDate,
          completedAt: normalized.completedAt,
          progress: normalized.progress,
          manualProgress: normalized.progress,
          origin: role === 'SUPERVISOR' ? 'SUPERVISOR' : 'DOCTORAL_STUDENT',
          createdById: actorId,
          responsibleUserId: body.responsibleUserId ?? null,
        },
        include: objectiveInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: normalized.status === 'COMPLETED' ? 'objective.completed' : 'objective.create',
        entityType: 'objective',
        entityId: objective.id,
        requestId,
      });
      return objective;
    });
    return this.toDto(created, now);
  }

  async update(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    body: UpdateBody,
    requestId?: string,
  ) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: WRITE_ROLES });
    const role = await this.roleOf(actorId, thesisId);
    const existing = await this.findInThesis(thesisId, objectiveId);
    this.assertStudentMayRevise(role, existing);
    this.assertMayComplete(role, body.status);
    if (body.responsibleUserId) await this.assertResponsible(thesisId, body.responsibleUserId);
    const now = new Date();
    const measured = this.progress.measure(existing.manualProgress, existing.tasks);
    const nextStatus = body.status ?? existing.status;
    if (
      measured.mode === 'TASK_BASED' &&
      nextStatus === 'COMPLETED' &&
      existing.status !== 'COMPLETED'
    ) {
      throw new AppException(
        400,
        'COMPLETION_NOT_READY',
        'La validation de l’objectif passe par la demande du doctorant',
      );
    }
    const normalized = this.normalize(
      {
        status: nextStatus,
        priority: body.priority ?? existing.priority,
        progress:
          measured.mode === 'TASK_BASED'
            ? measured.progress
            : (body.progress ?? existing.manualProgress),
        startDate: resolveDate(body.startDate, existing.startDate),
        dueDate: resolveDate(body.dueDate, existing.dueDate),
        completedAt: existing.completedAt,
      },
      now,
    );
    const description = body.description === undefined ? undefined : blankToNull(body.description);
    const resetReview =
      normalized.status === 'CANCELLED' ||
      (existing.status === 'COMPLETED' && normalized.status !== 'COMPLETED');
    const updated = await this.prisma.$transaction(async (tx) => {
      const objective = await tx.objective.update({
        where: { id: existing.id },
        data: {
          title: body.title,
          description,
          status: normalized.status,
          priority: normalized.priority,
          startDate: normalized.startDate,
          dueDate: normalized.dueDate,
          completedAt: normalized.completedAt,
          progress: normalized.progress,
          manualProgress: measured.mode === 'TASK_BASED' ? undefined : normalized.progress,
          responsibleUserId:
            body.responsibleUserId === undefined ? undefined : body.responsibleUserId,
          ...(resetReview ? clearedReview() : {}),
        },
        include: objectiveInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: auditAction(existing.status, normalized.status),
        entityType: 'objective',
        entityId: objective.id,
        requestId,
      });
      return objective;
    });
    return this.toDto(updated, now);
  }

  async remove(actorId: string, thesisId: string, objectiveId: string, requestId?: string) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: WRITE_ROLES });
    const role = await this.roleOf(actorId, thesisId);
    const existing = await this.findInThesis(thesisId, objectiveId);
    this.assertStudentMayRevise(role, existing);
    await this.prisma.$transaction(async (tx) => {
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'objective.deleted',
        entityType: 'objective',
        entityId: existing.id,
        requestId,
      });
      await tx.objective.delete({ where: { id: existing.id } });
    });
    return { id: existing.id };
  }

  async requestCompletion(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    requestId?: string,
  ) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT'],
    });
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await lockObjective(tx, objectiveId, thesisId, now);
      const current = await this.findLocked(tx, thesisId, objectiveId);
      this.assertOpen(current);
      const measured = this.progress.measure(current.manualProgress, current.tasks);
      if (measured.progress !== 100) {
        throw new AppException(
          400,
          'COMPLETION_NOT_READY',
          'La progression doit être à 100 % avant de demander la validation',
        );
      }
      if (current.reviewStatus === 'PENDING') {
        throw new AppException(
          400,
          'COMPLETION_NOT_READY',
          'Une demande de validation est déjà en cours',
        );
      }
      const objective = await tx.objective.update({
        where: { id: current.id },
        data: {
          status: 'IN_PROGRESS',
          progress: 100,
          reviewStatus: 'PENDING',
          completionRequestedAt: now,
          completionRequestedById: actorId,
          reviewMessage: null,
        },
        include: objectiveInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'objective.completion_requested',
        entityType: 'objective',
        entityId: objective.id,
        requestId,
      });
      return objective;
    });
    return this.toDto(updated, now);
  }

  async approveCompletion(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    requestId?: string,
  ) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: ['SUPERVISOR'] });
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await lockObjective(tx, objectiveId, thesisId, now);
      const current = await this.findLocked(tx, thesisId, objectiveId);
      this.assertPending(current);
      const measured = this.progress.measure(current.manualProgress, current.tasks);
      if (measured.progress !== 100) {
        throw new AppException(
          400,
          'COMPLETION_NOT_READY',
          'La progression doit être à 100 % avant de valider l’objectif',
        );
      }
      const objective = await tx.objective.update({
        where: { id: current.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: now,
          reviewStatus: 'APPROVED',
          validatedAt: now,
          validatedById: actorId,
          reviewMessage: null,
        },
        include: objectiveInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'objective.completion_approved',
        entityType: 'objective',
        entityId: objective.id,
        requestId,
      });
      return objective;
    });
    return this.toDto(updated, now);
  }

  async requestChanges(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    message: string | undefined,
    requestId?: string,
  ) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: ['SUPERVISOR'] });
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await lockObjective(tx, objectiveId, thesisId, now);
      const current = await this.findLocked(tx, thesisId, objectiveId);
      this.assertPending(current);
      const objective = await tx.objective.update({
        where: { id: current.id },
        data: {
          status: 'IN_PROGRESS',
          reviewStatus: 'CHANGES_REQUESTED',
          reviewMessage: blankToNull(message),
          validatedAt: null,
          validatedById: null,
          completedAt: null,
        },
        include: objectiveInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'objective.changes_requested',
        entityType: 'objective',
        entityId: objective.id,
        requestId,
      });
      return objective;
    });
    return this.toDto(updated, now);
  }

  private where(thesisId: string, query: ListQuery): Prisma.ObjectiveWhereInput | null {
    const search = query.search?.trim();
    const where: Prisma.ObjectiveWhereInput = { thesisId };
    if (query.priority) where.priority = query.priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (query.overdue === 'true') {
      if (query.status === 'COMPLETED' || query.status === 'CANCELLED') return null;
      where.status = query.status ?? { in: ['PLANNED', 'IN_PROGRESS'] };
      where.dueDate = { lt: utcDay(new Date()) };
      return where;
    }
    if (query.status) where.status = query.status;
    return where;
  }

  private async findInThesis(thesisId: string, objectiveId: string): Promise<ObjectiveRow> {
    const row = await this.prisma.objective.findFirst({
      where: { id: objectiveId, thesisId },
      include: objectiveInclude,
    });
    if (!row) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return row;
  }

  private async findLocked(
    tx: Prisma.TransactionClient,
    thesisId: string,
    objectiveId: string,
  ): Promise<ObjectiveRow> {
    const row = await tx.objective.findFirst({
      where: { id: objectiveId, thesisId },
      include: objectiveInclude,
    });
    if (!row) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return row;
  }

  private assertOpen(row: { status: ObjectiveStatus }) {
    if (row.status === 'CANCELLED') {
      throw new AppException(
        400,
        'COMPLETION_NOT_READY',
        'Un objectif annulé ne peut pas être soumis à validation',
      );
    }
    if (row.status === 'COMPLETED') {
      throw new AppException(400, 'COMPLETION_NOT_READY', 'Cet objectif est déjà validé');
    }
  }

  private assertPending(row: { status: ObjectiveStatus; reviewStatus: ObjectiveReviewStatus }) {
    if (row.status === 'CANCELLED') {
      throw new AppException(
        400,
        'COMPLETION_NOT_READY',
        'Un objectif annulé ne peut pas être validé',
      );
    }
    if (row.reviewStatus !== 'PENDING') {
      throw new AppException(
        400,
        'COMPLETION_NOT_READY',
        'Aucune demande de validation n’est en attente',
      );
    }
  }

  private async roleOf(actorId: string, thesisId: string): Promise<MembershipRole> {
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
    });
    if (!membership) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return membership.role;
  }

  private assertStudentMayRevise(
    role: MembershipRole,
    objective: { status: ObjectiveStatus; reviewStatus: ObjectiveReviewStatus },
  ) {
    if (role !== 'DOCTORAL_STUDENT') return;
    if (objective.reviewStatus === 'APPROVED' || objective.status === 'COMPLETED') {
      throw new AppException(403, 'FORBIDDEN', 'Un objectif validé ne peut pas être modifié');
    }
  }

  private assertMayComplete(role: MembershipRole, status: ObjectiveStatus | undefined) {
    if (role === 'DOCTORAL_STUDENT' && status === 'COMPLETED') {
      throw new AppException(403, 'FORBIDDEN', 'La validation passe par une demande à l’encadrant');
    }
  }

  private async assertResponsible(thesisId: string, userId: string | null | undefined) {
    if (!userId) return;
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId } },
    });
    if (!membership) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
        { field: 'responsibleUserId', message: 'Le responsable doit être membre de la thèse' },
      ]);
    }
  }

  private normalize(
    draft: Parameters<ObjectiveProgressService['resolve']>[0],
    now: Date,
  ): ReturnType<ObjectiveProgressService['resolve']> {
    try {
      return this.progress.resolve(draft, now);
    } catch (error) {
      if (error instanceof ObjectiveRuleError) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          { field: error.field, message: error.message },
        ]);
      }
      throw error;
    }
  }

  private toDto(row: ObjectiveRow, now: Date) {
    const profile = row.responsibleUser?.profile ?? null;
    const measured = this.progress.measure(row.manualProgress, row.tasks);
    return {
      id: row.id,
      thesisId: row.thesisId,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      startDate: formatDay(row.startDate),
      dueDate: formatDay(row.dueDate),
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      progress: row.status === 'COMPLETED' ? 100 : measured.progress,
      progressMode: measured.mode,
      taskSummary: measured.summary,
      completionReview: {
        status: row.reviewStatus,
        requestedAt: row.completionRequestedAt ? row.completionRequestedAt.toISOString() : null,
        validatedAt: row.validatedAt ? row.validatedAt.toISOString() : null,
        message: row.reviewMessage,
        validatedByName: row.validatedBy?.profile?.displayName ?? null,
      },
      isOverdue: isOverdue(row, now),
      responsible: profile
        ? {
            id: row.responsibleUser!.id,
            givenName: profile.givenName,
            familyName: profile.familyName,
            displayName: profile.displayName,
          }
        : null,
      origin: row.origin,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function clearedReview() {
  return {
    reviewStatus: 'NOT_REQUESTED' as const,
    completionRequestedAt: null,
    completionRequestedById: null,
    validatedAt: null,
    validatedById: null,
    reviewMessage: null,
  };
}

function blankToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function resolveDate(next: string | null | undefined, current: Date | null): Date | null {
  if (next === undefined) return current;
  if (next === null) return null;
  return parseDay(next);
}

function utcDay(now: Date): Date {
  return new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function auditAction(previous: ObjectiveStatus, next: ObjectiveStatus): string {
  if (previous !== next && next === 'COMPLETED') return 'objective.completed';
  return 'objective.update';
}
