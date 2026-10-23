import { Inject, Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { MembershipRole } from '@prisma/client';
import type {
  documentReviewSchema,
  documentSynthesisSchema,
  thesisDocumentInputSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { formatDay, parseDay } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage';

type DocumentBody = z.infer<typeof thesisDocumentInputSchema>;
type SynthesisBody = z.infer<typeof documentSynthesisSchema>;
type ReviewBody = z.infer<typeof documentReviewSchema>;

const EDITABLE = new Set(['TO_READ', 'READ', 'SYNTHESIS_DRAFT', 'CHANGES_REQUESTED']);
const PRIORITY_RANK = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const;

const include = {
  objective: { select: { id: true, title: true } },
  task: { select: { id: true, title: true, objectiveId: true } },
  study: true,
} as const;

@Injectable()
export class ThesisDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async list(actorId: string, thesisId: string) {
    const role = await this.role(actorId, thesisId);
    const [objectives, documents] = await Promise.all([
      this.prisma.objective.findMany({
        where: { thesisId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          tasks: { orderBy: { position: 'asc' }, select: { id: true, title: true } },
        },
      }),
      this.prisma.thesisDocument.findMany({
        where: { thesisId },
        include,
        take: 200,
      }),
    ]);
    const creatorIds = [...new Set(documents.map((row) => row.createdById))];
    const memberships =
      creatorIds.length === 0
        ? []
        : await this.prisma.thesisMembership.findMany({
            where: { thesisId, userId: { in: creatorIds } },
            select: { userId: true, role: true },
          });
    const roleByUser = new Map(memberships.map((row) => [row.userId, row.role]));
    const canManage = role === 'SUPERVISOR';
    const rows = documents
      .map((row) =>
        this.toDto(row, canManage, {
          actorId,
          source: roleByUser.get(row.createdById) === 'SUPERVISOR' ? 'SUPERVISOR' : 'STUDENT',
        }),
      )
      .sort(
        (a, b) =>
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.title.localeCompare(b.title),
      );
    return {
      canManage,
      objectives: objectives.map((objective) => ({
        id: objective.id,
        title: objective.title,
        steps: objective.tasks,
      })),
      documents: rows,
      summary: summarize(rows),
    };
  }

  async create(actorId: string, thesisId: string, body: DocumentBody, requestId?: string) {
    const role = await this.role(actorId, thesisId);
    if (role !== 'SUPERVISOR' && role !== 'DOCTORAL_STUDENT') {
      throw new AppException(403, 'FORBIDDEN', 'Vous ne pouvez pas ajouter un document');
    }
    const link = await this.resolveLink(thesisId, body.objectiveId, body.taskId);
    const studentOwned = role === 'DOCTORAL_STUDENT';
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.thesisDocument.create({
        data: {
          thesisId,
          createdById: actorId,
          title: body.title.trim(),
          kind: body.kind,
          authors: blank(body.authors),
          reference: blank(body.reference),
          url: blank(body.url),
          objectiveId: link.objectiveId,
          taskId: link.taskId,
          importance: studentOwned ? 'MEDIUM' : body.importance,
          priority: studentOwned ? 'NORMAL' : body.priority,
          access: studentOwned ? 'SHARED' : body.access,
          dueDate: studentOwned ? null : body.dueDate ? parseDay(body.dueDate) : null,
          instructions: studentOwned ? null : blank(body.instructions),
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: studentOwned ? 'document.added_by_student' : 'document.proposed',
        entityType: 'thesis_document',
        entityId: row.id,
        requestId,
      });
    });
    return this.list(actorId, thesisId);
  }

  async update(
    actorId: string,
    thesisId: string,
    documentId: string,
    body: DocumentBody,
    requestId?: string,
  ) {
    const role = await this.role(actorId, thesisId);
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
    });
    if (!existing) throw new AppException(404, 'NOT_FOUND', 'Ce document est introuvable');
    const mine = existing.createdById === actorId;
    if (role !== 'SUPERVISOR' && !(role === 'DOCTORAL_STUDENT' && mine)) {
      throw new AppException(403, 'FORBIDDEN', 'Vous ne pouvez pas modifier ce document');
    }
    const link = await this.resolveLink(thesisId, body.objectiveId, body.taskId);
    const studentOwned = role === 'DOCTORAL_STUDENT';
    await this.prisma.$transaction(async (tx) => {
      await tx.thesisDocument.update({
        where: { id: documentId },
        data: {
          title: body.title.trim(),
          kind: body.kind,
          authors: blank(body.authors),
          reference: blank(body.reference),
          url: blank(body.url),
          objectiveId: link.objectiveId,
          taskId: link.taskId,
          importance: studentOwned ? existing.importance : body.importance,
          priority: studentOwned ? existing.priority : body.priority,
          access: studentOwned ? 'SHARED' : body.access,
          dueDate: studentOwned ? existing.dueDate : body.dueDate ? parseDay(body.dueDate) : null,
          instructions: studentOwned ? existing.instructions : blank(body.instructions),
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'document.updated',
        entityType: 'thesis_document',
        entityId: documentId,
        requestId,
      });
    });
    return this.list(actorId, thesisId);
  }

  async remove(actorId: string, thesisId: string, documentId: string, requestId?: string) {
    const role = await this.role(actorId, thesisId);
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
    });
    if (!existing) throw new AppException(404, 'NOT_FOUND', 'Ce document est introuvable');
    const mine = existing.createdById === actorId;
    if (role !== 'SUPERVISOR' && !(role === 'DOCTORAL_STUDENT' && mine)) {
      throw new AppException(403, 'FORBIDDEN', 'Vous ne pouvez pas supprimer ce document');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.thesisDocument.delete({ where: { id: documentId } });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'document.removed',
        entityType: 'thesis_document',
        entityId: documentId,
        requestId,
      });
    });
    if (existing.fileKey) await this.storage.deleteObject(existing.fileKey).catch(() => undefined);
    return this.list(actorId, thesisId);
  }

  async attachFile(
    actorId: string,
    thesisId: string,
    documentId: string,
    file: { path: string; originalName: string; declaredMime: string } | undefined,
    requestId?: string,
  ) {
    const role = await this.role(actorId, thesisId);
    if (!file) throw new AppException(400, 'VALIDATION_ERROR', 'Aucun fichier');
    if (!acceptedFile(file.originalName, file.declaredMime)) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Formats acceptés : PDF, DOC ou DOCX');
    }
    const info = await stat(file.path);
    if (info.size > this.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Le fichier dépasse la taille autorisée');
    }
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
    });
    if (!existing) throw new AppException(404, 'NOT_FOUND', 'Ce document est introuvable');
    const mine = existing.createdById === actorId;
    if (role !== 'SUPERVISOR' && !(role === 'DOCTORAL_STUDENT' && mine)) {
      throw new AppException(403, 'FORBIDDEN', 'Vous ne pouvez pas joindre un fichier');
    }
    const key = `theses/${thesisId}/documents/${documentId}/${randomUUID()}`;
    try {
      try {
        await this.storage.putObject({
          key,
          body: createReadStream(file.path),
          contentType: file.declaredMime || 'application/octet-stream',
          contentLength: info.size,
          downloadName: file.originalName,
        });
      } catch {
        throw new AppException(503, 'INTERNAL_ERROR', 'Le stockage est indisponible.');
      }
      await this.prisma.thesisDocument.update({
        where: { id: documentId },
        data: {
          fileKey: key,
          fileName: file.originalName.slice(0, 180),
          fileMime: file.declaredMime.slice(0, 160),
        },
      });
      await this.audit.record(this.prisma, {
        actorId,
        thesisId,
        action: 'document.file_attached',
        entityType: 'thesis_document',
        entityId: documentId,
        requestId,
      });
      if (existing.fileKey)
        await this.storage.deleteObject(existing.fileKey).catch(() => undefined);
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
    return this.list(actorId, thesisId);
  }

  async removeFile(actorId: string, thesisId: string, documentId: string, requestId?: string) {
    const role = await this.role(actorId, thesisId);
    if (role !== 'SUPERVISOR') {
      throw new AppException(403, 'FORBIDDEN', 'Seul le superviseur peut retirer un fichier');
    }
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
    });
    if (!existing) throw new AppException(404, 'NOT_FOUND', 'Ce document est introuvable');
    if (existing.fileKey) await this.storage.deleteObject(existing.fileKey).catch(() => undefined);
    await this.prisma.thesisDocument.update({
      where: { id: documentId },
      data: { fileKey: null, fileName: null, fileMime: null },
    });
    await this.audit.record(this.prisma, {
      actorId,
      thesisId,
      action: 'document.file_removed',
      entityType: 'thesis_document',
      entityId: documentId,
      requestId,
    });
    return this.list(actorId, thesisId);
  }

  async download(actorId: string, thesisId: string, documentId: string, inline: boolean) {
    const role = await this.role(actorId, thesisId);
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
    });
    if (!existing?.fileKey || !existing.fileName) {
      throw new AppException(404, 'NOT_FOUND', 'Aucun fichier n’est joint');
    }
    this.assertCanOpen(role, existing.access);
    if (role === 'DOCTORAL_STUDENT') await this.markRead(actorId, existing.id);
    return this.storage.createSignedDownloadUrl({
      key: existing.fileKey,
      downloadName: existing.fileName,
      contentType: existing.fileMime || 'application/octet-stream',
      ttlSeconds: this.env.SIGNED_URL_TTL_SECONDS,
      inline,
    });
  }

  async consult(actorId: string, thesisId: string, documentId: string) {
    const role = await this.role(actorId, thesisId);
    if (role !== 'DOCTORAL_STUDENT') {
      throw new AppException(403, 'FORBIDDEN', 'Seul le doctorant enregistre une consultation');
    }
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
    });
    if (!existing) throw new AppException(404, 'NOT_FOUND', 'Ce document est introuvable');
    await this.markRead(actorId, existing.id);
    return this.list(actorId, thesisId);
  }

  async saveSynthesis(
    actorId: string,
    thesisId: string,
    documentId: string,
    body: SynthesisBody,
    requestId?: string,
  ) {
    const role = await this.role(actorId, thesisId);
    if (role !== 'DOCTORAL_STUDENT') {
      throw new AppException(403, 'FORBIDDEN', 'Seul le doctorant rédige la synthèse');
    }
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
      include: { study: true },
    });
    if (!existing) throw new AppException(404, 'NOT_FOUND', 'Ce document est introuvable');
    const status = existing.study?.status ?? 'TO_READ';
    if (!EDITABLE.has(status)) {
      throw new AppException(403, 'FORBIDDEN', 'Cette synthèse ne peut plus être modifiée');
    }
    const summary = blank(body.summary);
    const hasSynthesisFile = Boolean(existing.study?.synthesisFileKey);
    if (body.submit && !summary && !hasSynthesisFile) {
      throw new AppException(
        400,
        'VALIDATION_ERROR',
        'Ajoutez un fichier Word/PDF ou un résumé pour soumettre la synthèse',
        [{ field: 'summary', message: 'Champ requis' }],
      );
    }
    const subjectRelevance =
      body.subjectRelevance === 'IMPORTANT' || body.subjectRelevance === 'NOT_IMPORTANT'
        ? body.subjectRelevance
        : (existing.study?.subjectRelevance ?? 'UNSET');
    if (body.submit && subjectRelevance === 'UNSET') {
      throw new AppException(
        400,
        'VALIDATION_ERROR',
        'Indiquez si ce document est important pour votre sujet',
        [{ field: 'subjectRelevance', message: 'Champ requis' }],
      );
    }
    const link = await this.resolveLink(thesisId, body.objectiveId, body.taskId);
    const now = new Date();
    const nextStatus = body.submit
      ? 'SUBMITTED'
      : status === 'CHANGES_REQUESTED'
        ? 'CHANGES_REQUESTED'
        : 'SYNTHESIS_DRAFT';
    await this.prisma.$transaction(async (tx) => {
      if (body.objectiveId !== undefined || body.taskId !== undefined) {
        await tx.thesisDocument.update({
          where: { id: documentId },
          data: { objectiveId: link.objectiveId, taskId: link.taskId },
        });
      }
      await tx.documentStudy.upsert({
        where: { documentId },
        create: {
          documentId,
          studentId: actorId,
          status: nextStatus,
          consultedAt: now,
          summary,
          methodology: blank(body.methodology),
          results: blank(body.results),
          limits: blank(body.limits),
          thesisLink: blank(body.thesisLink),
          exploitation: blank(body.exploitation),
          subjectRelevance,
          submittedAt: body.submit ? now : null,
        },
        update: {
          status: nextStatus,
          consultedAt: existing.study?.consultedAt ?? now,
          summary,
          methodology: blank(body.methodology),
          results: blank(body.results),
          limits: blank(body.limits),
          thesisLink: blank(body.thesisLink),
          exploitation: blank(body.exploitation),
          subjectRelevance,
          submittedAt: body.submit ? now : existing.study?.submittedAt,
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: body.submit ? 'document.synthesis_submitted' : 'document.synthesis_saved',
        entityType: 'thesis_document',
        entityId: documentId,
        requestId,
      });
    });
    return this.list(actorId, thesisId);
  }

  async review(
    actorId: string,
    thesisId: string,
    documentId: string,
    body: ReviewBody,
    requestId?: string,
  ) {
    const role = await this.role(actorId, thesisId);
    if (role !== 'SUPERVISOR') {
      throw new AppException(403, 'FORBIDDEN', 'Seul le superviseur examine une synthèse');
    }
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
      include: { study: true },
    });
    if (!existing?.study || existing.study.status !== 'SUBMITTED') {
      throw new AppException(403, 'FORBIDDEN', 'Aucune synthèse n’est en attente d’examen');
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.documentStudy.update({
        where: { documentId },
        data: {
          status: body.decision === 'VALIDATED' ? 'VALIDATED' : 'CHANGES_REQUESTED',
          reviewMessage: blank(body.message),
          reviewedAt: now,
          reviewedById: actorId,
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action:
          body.decision === 'VALIDATED'
            ? 'document.synthesis_validated'
            : 'document.changes_requested',
        entityType: 'thesis_document',
        entityId: documentId,
        requestId,
      });
    });
    return this.list(actorId, thesisId);
  }

  async attachSynthesisFile(
    actorId: string,
    thesisId: string,
    documentId: string,
    file: { path: string; originalName: string; declaredMime: string } | undefined,
    requestId?: string,
  ) {
    const role = await this.role(actorId, thesisId);
    if (role !== 'DOCTORAL_STUDENT') {
      throw new AppException(403, 'FORBIDDEN', 'Seul le doctorant joint une synthèse');
    }
    if (!file) throw new AppException(400, 'VALIDATION_ERROR', 'Aucun fichier');
    if (!acceptedFile(file.originalName, file.declaredMime)) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Formats acceptés : PDF, DOC ou DOCX');
    }
    const info = await stat(file.path);
    if (info.size > this.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Le fichier dépasse la taille autorisée');
    }
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
      include: { study: true },
    });
    if (!existing) throw new AppException(404, 'NOT_FOUND', 'Ce document est introuvable');
    const status = existing.study?.status ?? 'TO_READ';
    if (!EDITABLE.has(status) && status !== 'SUBMITTED') {
      throw new AppException(403, 'FORBIDDEN', 'Cette synthèse ne peut plus être modifiée');
    }
    const key = `theses/${thesisId}/documents/${documentId}/synthesis/${randomUUID()}`;
    const now = new Date();
    const nextStatus =
      status === 'CHANGES_REQUESTED' || status === 'SUBMITTED' || status === 'VALIDATED'
        ? status
        : 'SYNTHESIS_DRAFT';
    try {
      try {
        await this.storage.putObject({
          key,
          body: createReadStream(file.path),
          contentType: file.declaredMime || 'application/octet-stream',
          contentLength: info.size,
          downloadName: file.originalName,
        });
      } catch {
        throw new AppException(503, 'INTERNAL_ERROR', 'Le stockage est indisponible.');
      }
      await this.prisma.documentStudy.upsert({
        where: { documentId },
        create: {
          documentId,
          studentId: actorId,
          status: nextStatus,
          consultedAt: now,
          synthesisFileKey: key,
          synthesisFileName: file.originalName.slice(0, 180),
          synthesisFileMime: file.declaredMime.slice(0, 160),
        },
        update: {
          status: nextStatus === 'SYNTHESIS_DRAFT' ? nextStatus : status,
          consultedAt: existing.study?.consultedAt ?? now,
          synthesisFileKey: key,
          synthesisFileName: file.originalName.slice(0, 180),
          synthesisFileMime: file.declaredMime.slice(0, 160),
        },
      });
      await this.audit.record(this.prisma, {
        actorId,
        thesisId,
        action: 'document.synthesis_file_attached',
        entityType: 'thesis_document',
        entityId: documentId,
        requestId,
      });
      if (existing.study?.synthesisFileKey) {
        await this.storage.deleteObject(existing.study.synthesisFileKey).catch(() => undefined);
      }
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
    return this.list(actorId, thesisId);
  }

  async downloadSynthesisFile(
    actorId: string,
    thesisId: string,
    documentId: string,
    inline: boolean,
  ) {
    await this.role(actorId, thesisId);
    const existing = await this.prisma.thesisDocument.findFirst({
      where: { id: documentId, thesisId },
      include: { study: true },
    });
    if (!existing?.study?.synthesisFileKey || !existing.study.synthesisFileName) {
      throw new AppException(404, 'NOT_FOUND', 'Aucune synthèse n’est jointe');
    }
    return this.storage.createSignedDownloadUrl({
      key: existing.study.synthesisFileKey,
      downloadName: existing.study.synthesisFileName,
      contentType: existing.study.synthesisFileMime || 'application/octet-stream',
      ttlSeconds: this.env.SIGNED_URL_TTL_SECONDS,
      inline,
    });
  }

  private async markRead(actorId: string, documentId: string) {
    const study = await this.prisma.documentStudy.findUnique({ where: { documentId } });
    if (study && study.status !== 'TO_READ') return;
    const now = new Date();
    await this.prisma.documentStudy.upsert({
      where: { documentId },
      create: { documentId, studentId: actorId, status: 'READ', consultedAt: now },
      update: { status: 'READ', consultedAt: study?.consultedAt ?? now },
    });
  }

  private assertCanOpen(role: MembershipRole, access: 'SHARED' | 'PROTECTED') {
    if (access === 'PROTECTED' && role !== 'SUPERVISOR') {
      throw new AppException(
        403,
        'FORBIDDEN',
        'Ce document est protégé. Seule la référence bibliographique est partagée.',
      );
    }
  }

  private async role(actorId: string, thesisId: string): Promise<MembershipRole> {
    await this.access.assertCanAccess({
      actorId,
      thesisId,
      allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'],
    });
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
    });
    if (!membership) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return membership.role;
  }

  private async resolveLink(
    thesisId: string,
    objectiveId: string | null | undefined,
    taskId: string | null | undefined,
  ) {
    const objective = blank(objectiveId);
    const task = blank(taskId);
    if (task) {
      const row = await this.prisma.task.findFirst({
        where: { id: task, objective: { thesisId } },
        select: { id: true, objectiveId: true },
      });
      if (!row) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Cette étape n’appartient pas à la thèse');
      }
      if (objective && objective !== row.objectiveId) {
        throw new AppException(400, 'VALIDATION_ERROR', 'L’étape ne correspond pas à l’objectif');
      }
      return { objectiveId: row.objectiveId, taskId: row.id };
    }
    if (objective) {
      const row = await this.prisma.objective.findFirst({
        where: { id: objective, thesisId },
        select: { id: true },
      });
      if (!row)
        throw new AppException(400, 'VALIDATION_ERROR', 'Cet objectif n’appartient pas à la thèse');
      return { objectiveId: row.id, taskId: null };
    }
    return { objectiveId: null, taskId: null };
  }

  private toDto(
    row: {
      id: string;
      title: string;
      kind: 'ARTICLE' | 'BOOK' | 'CHAPTER' | 'THESIS' | 'REPORT' | 'REFERENCE' | 'LINK';
      authors: string | null;
      reference: string | null;
      url: string | null;
      fileName: string | null;
      access: 'SHARED' | 'PROTECTED';
      importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'ESSENTIAL';
      priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      dueDate: Date | null;
      instructions: string | null;
      createdAt: Date;
      createdById: string;
      objective: { id: string; title: string } | null;
      task: { id: string; title: string } | null;
      study: {
        status:
          'TO_READ' | 'READ' | 'SYNTHESIS_DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'VALIDATED';
        summary: string | null;
        methodology: string | null;
        results: string | null;
        limits: string | null;
        thesisLink: string | null;
        exploitation: string | null;
        subjectRelevance: 'UNSET' | 'IMPORTANT' | 'NOT_IMPORTANT';
        synthesisFileName: string | null;
        reviewMessage: string | null;
      } | null;
    },
    canManage: boolean,
    meta: { actorId: string; source: 'SUPERVISOR' | 'STUDENT' },
  ) {
    const hidden = row.access === 'PROTECTED' && !canManage;
    const dueDate = formatDay(row.dueDate);
    const status = row.study?.status ?? 'TO_READ';
    return {
      id: row.id,
      title: row.title,
      kind: row.kind,
      authors: row.authors,
      reference: row.reference,
      url: hidden ? null : row.url,
      fileName: hidden ? null : row.fileName,
      access: row.access,
      canOpen: !hidden && Boolean(row.url || row.fileName),
      importance: row.importance,
      priority: row.priority,
      dueDate,
      overdue: Boolean(
        dueDate && dueDate < new Date().toISOString().slice(0, 10) && status !== 'VALIDATED',
      ),
      instructions: row.instructions,
      objectiveId: row.objective?.id ?? null,
      objectiveTitle: row.objective?.title ?? null,
      taskId: row.task?.id ?? null,
      stepTitle: row.task?.title ?? null,
      status,
      summary: row.study?.summary ?? null,
      methodology: row.study?.methodology ?? null,
      results: row.study?.results ?? null,
      limits: row.study?.limits ?? null,
      thesisLink: row.study?.thesisLink ?? null,
      exploitation: row.study?.exploitation ?? null,
      subjectRelevance: row.study?.subjectRelevance ?? 'UNSET',
      synthesisFileName: row.study?.synthesisFileName ?? null,
      source: meta.source,
      mine: row.createdById === meta.actorId,
      reviewMessage: row.study?.reviewMessage ?? null,
      sharedOn: formatDay(row.createdAt) ?? new Date().toISOString().slice(0, 10),
    };
  }
}

function summarize(rows: Array<{ status: string; priority: string; overdue: boolean }>) {
  return {
    proposed: rows.length,
    consulted: rows.filter((row) => row.status !== 'TO_READ').length,
    drafts: rows.filter((row) => row.status === 'SYNTHESIS_DRAFT').length,
    submitted: rows.filter((row) => row.status === 'SUBMITTED').length,
    validated: rows.filter((row) => row.status === 'VALIDATED').length,
    priorityOpen: rows.filter(
      (row) => (row.priority === 'HIGH' || row.priority === 'URGENT') && row.status !== 'VALIDATED',
    ).length,
    overdue: rows.filter((row) => row.overdue).length,
  };
}

function blank(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function acceptedFile(name: string, mime: string): boolean {
  return (
    /\.(pdf|docx?)$/i.test(name) ||
    mime === 'application/pdf' ||
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}
