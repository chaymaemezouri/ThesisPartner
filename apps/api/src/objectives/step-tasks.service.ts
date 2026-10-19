import { Inject, Injectable } from '@nestjs/common';
import type { MembershipRole, Prisma, StepTaskStatus } from '@prisma/client';
import type {
  createStepTaskSchema,
  reviewStepTaskSchema,
  stepTaskRemarkSchema,
  updateStepTaskSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage';
import {
  canEditStepTask,
  canReviewStepTask,
  canSubmitStepTask,
  reviewNeedsMessage,
} from './step-task-rules';

const READ_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;
const WRITE_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR'] as const;

type CreateBody = z.infer<typeof createStepTaskSchema>;
type UpdateBody = z.infer<typeof updateStepTaskSchema>;
type ReviewBody = z.infer<typeof reviewStepTaskSchema>;
type RemarkBody = z.infer<typeof stepTaskRemarkSchema>;

const include = {
  deliverable: {
    include: {
      versions: {
        orderBy: { versionNumber: 'asc' as const },
        include: { file: true },
      },
    },
  },
  remarks: {
    orderBy: { createdAt: 'desc' as const },
    take: 100,
    include: { author: { include: { profile: true } } },
  },
} satisfies Prisma.StepTaskInclude;

type Row = Prisma.StepTaskGetPayload<{ include: typeof include }>;

@Injectable()
export class StepTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async list(actorId: string, thesisId: string, objectiveId: string, taskId: string) {
    await this.read(actorId, thesisId);
    await this.requireStep(thesisId, objectiveId, taskId);
    const [rows, remarks] = await Promise.all([
      this.prisma.stepTask.findMany({
        where: { taskId },
        include,
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.remark.findMany({
        where: {
          thesisId,
          OR: [{ taskId }, { objectiveId, taskId: null, stepTaskId: null }],
        },
        include: { author: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return {
      tasks: rows.map(toDto),
      remarks: remarks.flatMap((row) => {
        const view = remarkView(row);
        return view ? [view] : [];
      }),
    };
  }

  async create(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    taskId: string,
    body: CreateBody,
    requestId?: string,
  ) {
    await this.write(actorId, thesisId);
    const role = await this.roleOf(actorId, thesisId);
    if (role === 'SUPERVISOR') {
      throw new AppException(403, 'FORBIDDEN', 'Seul le doctorant ajoute une tâche à l’étape');
    }
    const created = await this.prisma.$transaction(async (tx) => {
      await this.requireOpen(tx, thesisId, objectiveId, taskId);
      const last = await tx.stepTask.aggregate({ where: { taskId }, _max: { position: true } });
      const stepTask = await tx.stepTask.create({
        data: {
          taskId,
          title: body.title.trim(),
          description: blankToNull(body.description),
          position: (last._max.position ?? 0) + 1,
          createdById: actorId,
          deliverable: {
            create: {
              thesisId,
              objectiveId,
              title: body.title.trim(),
              description: blankToNull(body.description),
              type: 'REPORT',
              status: 'DRAFT',
              createdById: actorId,
            },
          },
        },
        include,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'step_task.created',
        entityType: 'step_task',
        entityId: stepTask.id,
        requestId,
      });
      return stepTask;
    });
    return toDto(created);
  }

  async update(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    taskId: string,
    stepTaskId: string,
    body: UpdateBody,
    requestId?: string,
  ) {
    await this.write(actorId, thesisId);
    await this.assertStudent(actorId, thesisId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.requireOpen(tx, thesisId, objectiveId, taskId);
      const current = await this.lock(tx, taskId, stepTaskId);
      this.assertEditable(current.status);
      const stepTask = await tx.stepTask.update({
        where: { id: current.id },
        data: {
          title: body.title?.trim(),
          description: body.description === undefined ? undefined : blankToNull(body.description),
        },
        include,
      });
      if (body.title && stepTask.deliverable) {
        await tx.deliverable.update({
          where: { id: stepTask.deliverable.id },
          data: { title: body.title.trim() },
        });
      }
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'step_task.updated',
        entityType: 'step_task',
        entityId: stepTask.id,
        requestId,
      });
      return stepTask;
    });
    return toDto(updated);
  }

  async remove(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    taskId: string,
    stepTaskId: string,
    requestId?: string,
  ) {
    await this.write(actorId, thesisId);
    await this.assertStudent(actorId, thesisId);
    const removed = await this.prisma.$transaction(async (tx) => {
      await this.requireOpen(tx, thesisId, objectiveId, taskId);
      const current = await this.lock(tx, taskId, stepTaskId);
      this.assertEditable(current.status);
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'step_task.deleted',
        entityType: 'step_task',
        entityId: current.id,
        requestId,
      });
      const keys =
        current.deliverable?.versions.flatMap((version) =>
          version.file ? [version.file.storageKey] : [],
        ) ?? [];
      if (current.deliverable) {
        await tx.deliverable.delete({ where: { id: current.deliverable.id } });
      }
      await tx.stepTask.delete({ where: { id: current.id } });
      return keys;
    });
    for (const key of removed) {
      await this.storage.deleteObject(key).catch(() => undefined);
    }
    return { id: stepTaskId };
  }

  async submit(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    taskId: string,
    stepTaskId: string,
    requestId?: string,
  ) {
    await this.write(actorId, thesisId);
    await this.assertStudent(actorId, thesisId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.requireOpen(tx, thesisId, objectiveId, taskId);
      const current = await this.lock(tx, taskId, stepTaskId);
      if (!canSubmitStepTask(current.status)) {
        throw new AppException(403, 'FORBIDDEN', 'Cette tâche ne peut plus être soumise');
      }
      const files = current.deliverable?.versions.filter((version) => version.file) ?? [];
      if (files.length === 0) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Ajoutez le livrable avant de soumettre', [
          { field: 'file', message: 'Ajoutez le livrable avant de soumettre' },
        ]);
      }
      const stepTask = await tx.stepTask.update({
        where: { id: current.id },
        data: { status: 'SUBMITTED', submittedAt: new Date(), reviewMessage: null },
        include,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'step_task.submitted',
        entityType: 'step_task',
        entityId: stepTask.id,
        requestId,
      });
      return stepTask;
    });
    return toDto(updated);
  }

  async review(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    taskId: string,
    stepTaskId: string,
    body: ReviewBody,
    requestId?: string,
  ) {
    await this.write(actorId, thesisId);
    const role = await this.roleOf(actorId, thesisId);
    if (role !== 'SUPERVISOR') {
      throw new AppException(403, 'FORBIDDEN', 'Seul l’encadrant valide une tâche');
    }
    const message = body.message?.trim() ?? '';
    if (reviewNeedsMessage(body.decision) && message.length === 0) {
      throw new AppException(400, 'VALIDATION_ERROR', 'La remarque est requise', [
        { field: 'message', message: 'La remarque est requise' },
      ]);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const objective = await this.requireOpen(tx, thesisId, objectiveId, taskId);
      const current = await this.lock(tx, taskId, stepTaskId);
      if (!canReviewStepTask(current.status, body.decision)) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Cette décision n’est pas possible');
      }
      if (message) {
        await tx.remark.create({
          data: {
            thesisId,
            authorId: actorId,
            title: reviewTitle(body.decision),
            message,
            objectiveId,
            taskId,
            stepTaskId,
          },
        });
      }
      const stepTask = await tx.stepTask.update({
        where: { id: current.id },
        data: {
          status: body.decision,
          reviewMessage: message || null,
          reviewedAt: new Date(),
          reviewedById: actorId,
        },
        include,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: `step_task.${body.decision.toLowerCase()}`,
        entityType: 'step_task',
        entityId: stepTask.id,
        requestId,
        metadata: { objectiveId: objective.id },
      });
      return stepTask;
    });
    return toDto(updated);
  }

  async addRemark(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    taskId: string,
    stepTaskId: string,
    body: RemarkBody,
    requestId?: string,
  ) {
    await this.write(actorId, thesisId);
    const role = await this.roleOf(actorId, thesisId);
    if (role !== 'SUPERVISOR') {
      throw new AppException(403, 'FORBIDDEN', 'Seul l’encadrant rédige une remarque');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.requireOpen(tx, thesisId, objectiveId, taskId);
      const current = await this.lock(tx, taskId, stepTaskId);
      await tx.remark.create({
        data: {
          thesisId,
          authorId: actorId,
          title: 'Remarque',
          message: body.message.trim(),
          objectiveId,
          taskId,
          stepTaskId,
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'remark.created',
        entityType: 'remark',
        entityId: current.id,
        requestId,
      });
      return tx.stepTask.findUniqueOrThrow({ where: { id: current.id }, include });
    });
    return toDto(updated);
  }

  async deleteFile(
    actorId: string,
    thesisId: string,
    objectiveId: string,
    taskId: string,
    versionId: string,
    stepTaskId: string | null,
    requestId?: string,
  ) {
    await this.write(actorId, thesisId);
    if (stepTaskId) await this.assertStudent(actorId, thesisId);
    const version = await this.prisma.deliverableVersion.findFirst({
      where: {
        id: versionId,
        deliverable: {
          thesisId,
          objectiveId,
          ...(stepTaskId ? { stepTaskId } : { taskId }),
        },
      },
      include: { file: true, deliverable: { include: { stepTask: true } } },
    });
    if (!version) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    const status = version.deliverable.stepTask?.status;
    if (stepTaskId && status && !canEditStepTask(status)) {
      throw new AppException(
        403,
        'FORBIDDEN',
        'Le livrable d’une tâche soumise ne peut pas être retiré',
      );
    }
    if (!stepTaskId) {
      const objective = await this.prisma.objective.findFirst({
        where: { id: objectiveId, thesisId },
        select: { status: true },
      });
      if (!objective || objective.status === 'COMPLETED' || objective.status === 'CANCELLED') {
        throw new AppException(403, 'FORBIDDEN', 'Cette étape ne peut plus être modifiée');
      }
    }
    if (version.file) {
      await this.storage.deleteObject(version.file.storageKey);
    }
    await this.prisma.deliverableVersion.delete({ where: { id: version.id } });
    await this.audit.record(this.prisma, {
      actorId,
      thesisId,
      action: 'step_task.file_deleted',
      entityType: 'deliverable_version',
      entityId: version.id,
      requestId,
    });
    return { id: version.id };
  }

  private async read(actorId: string, thesisId: string) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
  }

  private async write(actorId: string, thesisId: string) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: WRITE_ROLES });
  }

  private async assertStudent(actorId: string, thesisId: string) {
    const role = await this.roleOf(actorId, thesisId);
    if (role !== 'DOCTORAL_STUDENT') {
      throw new AppException(403, 'FORBIDDEN', 'Seul le doctorant modifie cette tâche');
    }
  }

  private async roleOf(actorId: string, thesisId: string): Promise<MembershipRole> {
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
    });
    if (!membership) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return membership.role;
  }

  private async requireStep(thesisId: string, objectiveId: string, taskId: string) {
    const step = await this.prisma.task.findFirst({
      where: { id: taskId, objectiveId, objective: { thesisId } },
      select: { id: true },
    });
    if (!step) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
  }

  private async requireOpen(
    tx: Prisma.TransactionClient,
    thesisId: string,
    objectiveId: string,
    taskId: string,
  ) {
    const objective = await tx.objective.findFirst({
      where: { id: objectiveId, thesisId },
    });
    if (!objective) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    const step = await tx.task.findFirst({
      where: { id: taskId, objectiveId },
      select: { id: true },
    });
    if (!step) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    if (objective.status === 'COMPLETED' || objective.status === 'CANCELLED') {
      throw new AppException(403, 'FORBIDDEN', 'Cet objectif ne peut plus être modifié');
    }
    return objective;
  }

  private async lock(tx: Prisma.TransactionClient, taskId: string, stepTaskId: string) {
    const row = await tx.stepTask.findFirst({ where: { id: stepTaskId, taskId }, include });
    if (!row) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return row;
  }

  private assertEditable(status: StepTaskStatus) {
    if (!canEditStepTask(status)) {
      throw new AppException(403, 'FORBIDDEN', 'Cette tâche ne peut plus être modifiée');
    }
  }
}

function toDto(row: Row) {
  return {
    id: row.id,
    taskId: row.taskId,
    title: row.title,
    description: row.description,
    status: row.status,
    position: row.position,
    reviewMessage: row.reviewMessage,
    deliverableId: row.deliverable?.id ?? null,
    files: (row.deliverable?.versions ?? []).flatMap((version) =>
      version.file
        ? [
            {
              versionId: version.id,
              versionNumber: version.versionNumber,
              originalName: version.file.originalName,
              mimeType: version.file.mimeType,
            },
          ]
        : [],
    ),
    remarks: row.remarks.flatMap((remark) => {
      const view = remarkView(remark);
      return view ? [view] : [];
    }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function remarkView(row: {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  author: { profile: { displayName: string } | null };
}) {
  if (!row.author.profile) return null;
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    authorName: row.author.profile.displayName,
    createdAt: row.createdAt.toISOString(),
  };
}

function reviewTitle(decision: ReviewBody['decision']): string {
  if (decision === 'VALIDATED') return 'Tâche validée';
  if (decision === 'REJECTED') return 'Tâche rejetée';
  if (decision === 'CHANGES_REQUESTED') return 'Corrections demandées';
  return 'Évaluation en cours';
}

function blankToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
