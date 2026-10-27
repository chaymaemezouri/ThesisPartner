import { Injectable } from '@nestjs/common';
import type { MembershipRole, Prisma } from '@prisma/client';
import type {
  createRemarkReplySchema,
  createRemarkSchema,
  resolveRemarkSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { lockRemark } from './remark-lock';
import {
  canClose,
  canCreateRemark,
  canReopen,
  canReply,
  canResolve,
  canViewRemark,
} from './remark-policy';
import { sortRemarks, type RemarkPriority, type RemarkStatus } from './remark-rules';

const READ_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;

type CreateBody = z.infer<typeof createRemarkSchema>;
type ReplyBody = z.infer<typeof createRemarkReplySchema>;
type ResolveBody = z.infer<typeof resolveRemarkSchema>;
type ListQuery = {
  status?: RemarkStatus;
  priority?: RemarkPriority;
  search?: string;
};

const authorSelect = {
  id: true,
  profile: { select: { givenName: true, familyName: true } },
} satisfies Prisma.UserSelect;

const remarkInclude = {
  author: { select: authorSelect },
  objective: { select: { id: true, title: true } },
  task: { select: { id: true, title: true, objectiveId: true } },
  deliverable: { select: { id: true, title: true } },
  deliverableVersion: {
    select: {
      id: true,
      versionNumber: true,
      deliverableId: true,
      deliverable: { select: { id: true, title: true, thesisId: true } },
    },
  },
  correctionVersion: {
    select: {
      id: true,
      versionNumber: true,
      deliverableId: true,
      deliverable: { select: { id: true, title: true, thesisId: true } },
    },
  },
  replies: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: authorSelect } },
  },
} satisfies Prisma.RemarkInclude;

type RemarkRow = Prisma.RemarkGetPayload<{ include: typeof remarkInclude }>;

@Injectable()
export class RemarksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
  ) {}

  async list(actorId: string, thesisId: string, query: ListQuery) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    const search = query.search?.trim();
    const where: Prisma.RemarkWhereInput = { thesisId };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.remark.findMany({ where, include: remarkInclude });
    return { remarks: sortRemarks(rows).map((row) => this.toListItem(row)) };
  }

  async get(actorId: string, thesisId: string, remarkId: string) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    return this.toDetail(await this.findInThesis(thesisId, remarkId));
  }

  async create(actorId: string, thesisId: string, body: CreateBody, requestId?: string) {
    const role = await this.memberRole(actorId, thesisId);
    if (!canCreateRemark(role)) {
      throw new AppException(403, 'FORBIDDEN', 'Seul un encadrant peut créer une remarque');
    }
    const targets = await this.resolveTargets(thesisId, body);
    const created = await this.prisma.$transaction(async (tx) => {
      const remark = await tx.remark.create({
        data: {
          thesisId,
          authorId: actorId,
          title: body.title.trim(),
          message: body.message.trim(),
          priority: body.priority ?? 'MEDIUM',
          status: 'OPEN',
          objectiveId: targets.objectiveId,
          taskId: targets.taskId,
          deliverableId: targets.deliverableId,
          deliverableVersionId: targets.deliverableVersionId,
          location: blankToNull(body.location),
        },
        include: remarkInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'remark.created',
        entityType: 'remark',
        entityId: remark.id,
        requestId,
      });
      return remark;
    });
    return this.toDetail(created);
  }

  async reply(
    actorId: string,
    thesisId: string,
    remarkId: string,
    body: ReplyBody,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await lockRemark(tx, thesisId, remarkId);
      if (!locked) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      if (!canReply(role, locked.status)) {
        if (role !== 'DOCTORAL_STUDENT' && role !== 'SUPERVISOR') {
          throw new AppException(403, 'FORBIDDEN', 'Réponse non autorisée');
        }
        throw new AppException(400, 'BAD_REQUEST', 'Cette remarque n’accepte plus de réponses');
      }
      await tx.remarkReply.create({
        data: {
          remarkId,
          authorId: actorId,
          message: body.message.trim(),
        },
      });
      const nextStatus =
        locked.status === 'OPEN' && role === 'DOCTORAL_STUDENT' ? 'IN_PROGRESS' : locked.status;
      const remark = await tx.remark.update({
        where: { id: remarkId },
        data: { status: nextStatus },
        include: remarkInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'remark.replied',
        entityType: 'remark',
        entityId: remark.id,
        requestId,
      });
      return remark;
    });
    return this.toDetail(updated);
  }

  async resolve(
    actorId: string,
    thesisId: string,
    remarkId: string,
    body: ResolveBody,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await lockRemark(tx, thesisId, remarkId);
      if (!locked) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      if (!canResolve(role, locked.status)) {
        if (role !== 'DOCTORAL_STUDENT') {
          throw new AppException(
            403,
            'FORBIDDEN',
            'Seul le doctorant peut indiquer une correction effectuée',
          );
        }
        throw new AppException(
          400,
          'BAD_REQUEST',
          'Seules les remarques ouvertes ou en cours peuvent être marquées corrigées',
        );
      }
      const correctionVersionId = await this.assertCorrectionVersion(
        thesisId,
        body.correctionVersionId,
      );
      const remark = await tx.remark.update({
        where: { id: remarkId },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
          closedAt: null,
          correctionVersionId,
        },
        include: remarkInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'remark.resolved',
        entityType: 'remark',
        entityId: remark.id,
        requestId,
      });
      return remark;
    });
    return this.toDetail(updated);
  }

  async close(actorId: string, thesisId: string, remarkId: string, requestId?: string) {
    const role = await this.memberRole(actorId, thesisId);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await lockRemark(tx, thesisId, remarkId);
      if (!locked) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      if (!canClose(role, locked.status)) {
        if (role !== 'SUPERVISOR') {
          throw new AppException(403, 'FORBIDDEN', 'Seul un encadrant peut fermer une remarque');
        }
        throw new AppException(
          400,
          'BAD_REQUEST',
          'Seules les remarques corrigées peuvent être fermées',
        );
      }
      const remark = await tx.remark.update({
        where: { id: remarkId },
        data: { status: 'CLOSED', closedAt: now },
        include: remarkInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'remark.closed',
        entityType: 'remark',
        entityId: remark.id,
        requestId,
      });
      return remark;
    });
    return this.toDetail(updated);
  }

  async reopen(actorId: string, thesisId: string, remarkId: string, requestId?: string) {
    const role = await this.memberRole(actorId, thesisId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await lockRemark(tx, thesisId, remarkId);
      if (!locked) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      if (!canReopen(role, locked.status)) {
        if (role !== 'SUPERVISOR') {
          throw new AppException(403, 'FORBIDDEN', 'Seul un encadrant peut rouvrir une remarque');
        }
        throw new AppException(
          400,
          'BAD_REQUEST',
          'Seules les remarques corrigées ou fermées peuvent être rouvertes',
        );
      }
      const remark = await tx.remark.update({
        where: { id: remarkId },
        data: {
          status: 'OPEN',
          resolvedAt: null,
          closedAt: null,
        },
        include: remarkInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'remark.reopened',
        entityType: 'remark',
        entityId: remark.id,
        requestId,
      });
      return remark;
    });
    return this.toDetail(updated);
  }

  private async memberRole(actorId: string, thesisId: string): Promise<MembershipRole> {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES, write: true });
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
    });
    if (!membership) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    if (!canViewRemark(membership.role)) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }
    return membership.role;
  }

  private async findInThesis(thesisId: string, remarkId: string): Promise<RemarkRow> {
    const row = await this.prisma.remark.findFirst({
      where: { id: remarkId, thesisId },
      include: remarkInclude,
    });
    if (!row) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return row;
  }

  private async resolveTargets(thesisId: string, body: CreateBody) {
    let objectiveId = body.objectiveId ?? null;
    let taskId = body.taskId ?? null;
    let deliverableId = body.deliverableId ?? null;
    const deliverableVersionId = body.deliverableVersionId ?? null;

    if (taskId) {
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
      objectiveId = task.objectiveId;
    }

    if (objectiveId) {
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

    if (deliverableVersionId) {
      const version = await this.prisma.deliverableVersion.findFirst({
        where: { id: deliverableVersionId, deliverable: { thesisId } },
        select: { id: true, deliverableId: true },
      });
      if (!version) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          { field: 'deliverableVersionId', message: 'La version doit appartenir à la thèse' },
        ]);
      }
      if (deliverableId && deliverableId !== version.deliverableId) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          {
            field: 'deliverableVersionId',
            message: 'La version doit appartenir au livrable choisi',
          },
        ]);
      }
      deliverableId = version.deliverableId;
    }

    if (deliverableId) {
      const deliverable = await this.prisma.deliverable.findFirst({
        where: { id: deliverableId, thesisId },
        select: { id: true, objectiveId: true, taskId: true },
      });
      if (!deliverable) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          { field: 'deliverableId', message: 'Le livrable doit appartenir à la thèse' },
        ]);
      }
      if (objectiveId && deliverable.objectiveId && objectiveId !== deliverable.objectiveId) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          { field: 'deliverableId', message: 'Le livrable doit appartenir à l’objectif choisi' },
        ]);
      }
      if (taskId && deliverable.taskId && taskId !== deliverable.taskId) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          { field: 'deliverableId', message: 'Le livrable doit appartenir à l’étape choisie' },
        ]);
      }
      if (!objectiveId && deliverable.objectiveId) objectiveId = deliverable.objectiveId;
      if (!taskId && deliverable.taskId) taskId = deliverable.taskId;
    }

    return { objectiveId, taskId, deliverableId, deliverableVersionId };
  }

  private async assertCorrectionVersion(
    thesisId: string,
    correctionVersionId: string | null | undefined,
  ): Promise<string | null> {
    if (correctionVersionId === undefined || correctionVersionId === null) return null;
    const version = await this.prisma.deliverableVersion.findFirst({
      where: { id: correctionVersionId, deliverable: { thesisId } },
      select: { id: true },
    });
    if (!version) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
        {
          field: 'correctionVersionId',
          message: 'La version de correction doit appartenir à la thèse',
        },
      ]);
    }
    return version.id;
  }

  private toListItem(row: RemarkRow) {
    const lastReply = row.replies[row.replies.length - 1];
    const lastActivityAt = lastReply
      ? lastReply.createdAt > row.updatedAt
        ? lastReply.createdAt
        : row.updatedAt
      : row.updatedAt;
    return {
      id: row.id,
      thesisId: row.thesisId,
      title: row.title,
      status: row.status,
      priority: row.priority,
      target: this.targetOf(row),
      location: row.location,
      author: toAuthor(row.author),
      replyCount: row.replies.length,
      lastActivityAt: lastActivityAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetail(row: RemarkRow) {
    return {
      ...this.toListItem(row),
      message: row.message,
      objectiveId: row.objectiveId,
      taskId: row.taskId,
      deliverableId: row.deliverableId,
      deliverableVersionId: row.deliverableVersionId,
      correctionVersion: row.correctionVersion
        ? {
            id: row.correctionVersion.id,
            versionNumber: row.correctionVersion.versionNumber,
            deliverableId: row.correctionVersion.deliverableId,
            deliverableTitle: row.correctionVersion.deliverable.title,
          }
        : null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      replies: row.replies.map((reply) => ({
        id: reply.id,
        message: reply.message,
        author: toAuthor(reply.author),
        createdAt: reply.createdAt.toISOString(),
      })),
    };
  }

  private targetOf(row: RemarkRow) {
    if (row.deliverableVersion) {
      return {
        kind: 'DELIVERABLE_VERSION' as const,
        id: row.deliverableVersion.id,
        label: `${row.deliverableVersion.deliverable.title} · V${row.deliverableVersion.versionNumber}`,
      };
    }
    if (row.deliverable) {
      return {
        kind: 'DELIVERABLE' as const,
        id: row.deliverable.id,
        label: row.deliverable.title,
      };
    }
    if (row.task) {
      return { kind: 'TASK' as const, id: row.task.id, label: row.task.title };
    }
    if (row.objective) {
      return { kind: 'OBJECTIVE' as const, id: row.objective.id, label: row.objective.title };
    }
    return { kind: 'THESIS' as const, id: null, label: 'Thèse' };
  }
}

function toAuthor(user: { id: string; profile: { givenName: string; familyName: string } | null }) {
  if (!user.profile) throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
  return {
    id: user.id,
    givenName: user.profile.givenName,
    familyName: user.profile.familyName,
  };
}

function blankToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
