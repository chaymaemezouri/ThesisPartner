import { Injectable } from '@nestjs/common';
import type { MembershipRole, Prisma, TaskStatus } from '@prisma/client';
import type {
  createTaskSchema,
  reorderTasksSchema,
  updateTaskSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { formatDay, parseDay } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { lockObjective } from './objective-lock';
import { ObjectiveProgressService } from './objective-progress.service';

const READ_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;

type CreateBody = z.infer<typeof createTaskSchema>;
type UpdateBody = z.infer<typeof updateTaskSchema>;
type ReorderBody = z.infer<typeof reorderTasksSchema>;

const taskOrder = [{ position: 'asc' as const }, { createdAt: 'asc' as const }];

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
    private readonly progress: ObjectiveProgressService,
  ) {}

  async list(actorId: string, thesisId: string, objectiveId: string) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    await this.requireObjective(thesisId, objectiveId);
    const tasks = await this.prisma.task.findMany({
      where: { objectiveId },
      orderBy: taskOrder,
    });
    return { tasks: tasks.map(toDto) };
  }

  async create(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    body: CreateBody,
    requestId?: string,
  ) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR'],
    });
    const role = await this.roleOf(actorId, thesisId);
    const now = new Date();
    const status = body.status ?? 'TODO';
    const created = await this.prisma.$transaction(async (tx) => {
      const objective = await this.lockOpen(tx, thesisId, objectiveId, now);
      this.assertStudentMayRevise(role, objective.reviewStatus);
      const last = await tx.task.aggregate({
        where: { objectiveId },
        _max: { position: true },
      });
      const task = await tx.task.create({
        data: {
          objectiveId,
          title: body.title.trim(),
          description: blankToNull(body.description),
          status,
          dueDate: body.dueDate ? parseDay(body.dueDate) : null,
          position: (last._max.position ?? 0) + 1,
          origin: role === 'SUPERVISOR' ? 'SUPERVISOR' : 'DOCTORAL_STUDENT',
          createdById: actorId,
          completedAt: this.progress.taskCompletedAt(status, now),
        },
      });
      await this.syncProgress(tx, objective, true);
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'task.created',
        entityType: 'task',
        entityId: task.id,
        requestId,
      });
      const followUp = statusAudit(null, status);
      if (followUp) {
        await this.audit.record(tx, {
          actorId,
          thesisId,
          action: followUp,
          entityType: 'task',
          entityId: task.id,
          requestId,
        });
      }
      return task;
    });
    return toDto(created);
  }

  async update(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    taskId: string,
    body: UpdateBody,
    requestId?: string,
  ) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    const role = await this.roleOf(actorId, thesisId);
    this.assertCanEdit(role);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const objective = await this.lockOpen(tx, thesisId, objectiveId, now);
      this.assertStudentMayRevise(role, objective.reviewStatus);
      const existing = await tx.task.findFirst({ where: { id: taskId, objectiveId } });
      if (!existing) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      const status = body.status ?? existing.status;
      const task = await tx.task.update({
        where: { id: existing.id },
        data: {
          title: body.title?.trim(),
          description: body.description === undefined ? undefined : blankToNull(body.description),
          dueDate:
            body.dueDate === undefined ? undefined : body.dueDate ? parseDay(body.dueDate) : null,
          status,
          completedAt: this.progress.taskCompletedAt(status, now, existing),
        },
      });
      await this.syncProgress(tx, objective, true);
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: statusAudit(existing.status, status) ?? 'task.updated',
        entityType: 'task',
        entityId: task.id,
        requestId,
      });
      return task;
    });
    return toDto(updated);
  }

  async remove(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    taskId: string,
    requestId?: string,
  ) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR'],
    });
    const role = await this.roleOf(actorId, thesisId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const objective = await this.lockOpen(tx, thesisId, objectiveId, now);
      this.assertStudentMayRevise(role, objective.reviewStatus);
      const existing = await tx.task.findFirst({ where: { id: taskId, objectiveId } });
      if (!existing) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'task.deleted',
        entityType: 'task',
        entityId: existing.id,
        requestId,
      });
      await tx.task.delete({ where: { id: existing.id } });
      await this.syncProgress(tx, objective, true);
    });
    return { id: taskId };
  }

  async reorder(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    body: ReorderBody,
    requestId?: string,
  ) {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR'],
    });
    const role = await this.roleOf(actorId, thesisId);
    const now = new Date();
    const tasks = await this.prisma.$transaction(async (tx) => {
      const objective = await this.lockOpen(tx, thesisId, objectiveId, now);
      this.assertStudentMayRevise(role, objective.reviewStatus);
      const rows = await tx.task.findMany({
        where: { objectiveId },
        select: { id: true },
      });
      if (body.tasks.length !== rows.length) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          { field: 'tasks', message: 'Le réordonnancement doit citer chaque tâche de l’objectif' },
        ]);
      }
      const known = new Set(rows.map((row) => row.id));
      const seen = new Set<string>();
      const positions = new Set<number>();
      for (const item of body.tasks) {
        if (!known.has(item.taskId)) {
          throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
            { field: 'taskId', message: 'La tâche n’appartient pas à cet objectif' },
          ]);
        }
        if (seen.has(item.taskId) || positions.has(item.position)) {
          throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
            {
              field: seen.has(item.taskId) ? 'taskId' : 'position',
              message: seen.has(item.taskId) ? 'Tâche en double' : 'Position en double',
            },
          ]);
        }
        seen.add(item.taskId);
        positions.add(item.position);
      }
      for (const item of body.tasks) {
        await tx.task.update({
          where: { id: item.taskId },
          data: { position: item.position },
        });
      }
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'task.reordered',
        entityType: 'objective',
        entityId: objectiveId,
        requestId,
      });
      return tx.task.findMany({ where: { objectiveId }, orderBy: taskOrder });
    });
    return { tasks: tasks.map(toDto) };
  }

  private async roleOf(actorId: string, thesisId: string): Promise<MembershipRole> {
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
    });
    if (!membership) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return membership.role;
  }

  private assertCanEdit(role: MembershipRole) {
    if (role === 'SUPERVISOR' || role === 'DOCTORAL_STUDENT') return;
    throw new AppException(403, 'FORBIDDEN', 'Action not allowed');
  }

  private assertStudentMayRevise(role: MembershipRole, reviewStatus: string) {
    if (role === 'DOCTORAL_STUDENT' && reviewStatus === 'APPROVED') {
      throw new AppException(403, 'FORBIDDEN', 'Un objectif validé ne peut pas être modifié');
    }
  }

  private async requireObjective(thesisId: string, objectiveId: string) {
    const objective = await this.prisma.objective.findFirst({
      where: { id: objectiveId, thesisId },
      select: { id: true },
    });
    if (!objective) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
  }

  private async lockOpen(
    tx: Prisma.TransactionClient,
    thesisId: string,
    objectiveId: string,
    now: Date,
  ) {
    await lockObjective(tx, objectiveId, thesisId, now);
    const objective = await tx.objective.findFirst({
      where: { id: objectiveId, thesisId },
      select: { id: true, status: true, manualProgress: true, reviewStatus: true },
    });
    if (!objective) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    if (objective.status === 'COMPLETED') {
      throw new AppException(400, 'BAD_REQUEST', 'Cet objectif est déjà validé');
    }
    if (objective.status === 'CANCELLED') {
      throw new AppException(400, 'BAD_REQUEST', 'Cet objectif est annulé');
    }
    return objective;
  }

  private async syncProgress(
    tx: Prisma.TransactionClient,
    objective: { id: string; manualProgress: number; reviewStatus: string },
    invalidateReview: boolean,
  ) {
    const tasks = await tx.task.findMany({
      where: { objectiveId: objective.id },
      select: { status: true },
    });
    const measured = this.progress.measure(objective.manualProgress, tasks);
    const reset =
      invalidateReview &&
      (objective.reviewStatus === 'PENDING' || objective.reviewStatus === 'CHANGES_REQUESTED');
    await tx.objective.update({
      where: { id: objective.id },
      data: {
        progress: measured.progress,
        ...(reset
          ? {
              reviewStatus: 'NOT_REQUESTED',
              completionRequestedAt: null,
              completionRequestedById: null,
              reviewMessage: null,
            }
          : {}),
      },
    });
  }
}

function statusAudit(previous: TaskStatus | null, next: TaskStatus): string | null {
  if (next === 'CANCELLED' && previous !== 'CANCELLED') return 'task.cancelled';
  if (next === 'DONE' && previous !== 'DONE') return 'task.completed';
  if (next === 'IN_PROGRESS' && previous !== 'IN_PROGRESS') return 'task.started';
  return null;
}

function toDto(task: {
  id: string;
  objectiveId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | null;
  position: number;
  origin: 'STANDARD_TEMPLATE' | 'DOCTORAL_STUDENT' | 'SUPERVISOR';
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: task.id,
    objectiveId: task.objectiveId,
    title: task.title,
    description: task.description,
    status: task.status,
    dueDate: formatDay(task.dueDate),
    position: task.position,
    origin: task.origin,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function blankToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
