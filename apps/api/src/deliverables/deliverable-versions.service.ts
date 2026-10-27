import { Injectable } from '@nestjs/common';
import { Prisma, type MembershipRole } from '@prisma/client';
import type { createDeliverableVersionSchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { lockDeliverable } from './deliverable-lock';
import { canCreateVersion, canViewDeliverable } from './deliverable-policy';
import {
  nextVersionNumber,
  VERSION_HISTORY_LIMIT,
  type DeliverableStatus,
} from './deliverable-rules';

const READ_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;
const CREATE_ATTEMPTS = 3;

type CreateBody = z.infer<typeof createDeliverableVersionSchema>;

const versionInclude = {
  createdBy: { select: { id: true, profile: { select: { givenName: true, familyName: true } } } },
  file: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: {
        select: { id: true, profile: { select: { givenName: true, familyName: true } } },
      },
    },
  },
} satisfies Prisma.DeliverableVersionInclude;

type VersionRow = Prisma.DeliverableVersionGetPayload<{ include: typeof versionInclude }>;

@Injectable()
export class DeliverableVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
  ) {}

  async list(actorId: string, thesisId: string, deliverableId: string) {
    await this.assertReadable(actorId, thesisId, deliverableId);
    const versions = await this.prisma.deliverableVersion.findMany({
      where: { deliverableId },
      orderBy: { versionNumber: 'desc' },
      take: VERSION_HISTORY_LIMIT,
      include: versionInclude,
    });
    return { versions: versions.map((row) => toVersion(row)) };
  }

  async get(actorId: string, thesisId: string, deliverableId: string, versionId: string) {
    await this.assertReadable(actorId, thesisId, deliverableId);
    const version = await this.prisma.deliverableVersion.findFirst({
      where: { id: versionId, deliverableId, deliverable: { thesisId } },
      include: versionInclude,
    });
    if (!version) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return toVersion(version);
  }

  async create(
    actorId: string,
    thesisId: string,
    deliverableId: string,
    body: CreateBody,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId, true);
    for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt += 1) {
      try {
        return await this.insertVersion(actorId, role, thesisId, deliverableId, body, requestId);
      } catch (error) {
        if (error instanceof AppException) throw error;
        if (!isUniqueViolation(error)) throw error;
      }
    }
    throw new AppException(
      409,
      'CONFLICT',
      'Une autre version vient d’être enregistrée. Réessayez.',
    );
  }

  private async insertVersion(
    actorId: string,
    role: MembershipRole,
    thesisId: string,
    deliverableId: string,
    body: CreateBody,
    requestId?: string,
  ) {
    const created = await this.prisma.$transaction(async (tx) => {
      const current = await lockDeliverable(tx, thesisId, deliverableId);
      if (!current) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      if (!canCreateVersion(role, current.status)) {
        if (role !== 'DOCTORAL_STUDENT') {
          throw new AppException(403, 'FORBIDDEN', 'Ajout de version non autorisé');
        }
        throw new AppException(400, 'BAD_REQUEST', blockedMessage(current.status));
      }
      const aggregate = await tx.deliverableVersion.aggregate({
        where: { deliverableId },
        _max: { versionNumber: true },
      });
      const versionNumber = nextVersionNumber(aggregate._max.versionNumber);
      const changeSummary = blankToNull(body.changeSummary);
      if (versionNumber > 1 && !changeSummary) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          {
            field: 'changeSummary',
            message: 'Le résumé des modifications est requis à partir de la deuxième version',
          },
        ]);
      }
      const version = await tx.deliverableVersion.create({
        data: {
          deliverableId,
          versionNumber,
          title: blankToNull(body.title),
          changeSummary,
          createdById: actorId,
        },
        include: versionInclude,
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'deliverable.version_created',
        entityType: 'deliverable_version',
        entityId: version.id,
        requestId,
        metadata: {
          deliverableId,
          versionId: version.id,
          versionNumber,
        },
      });
      return version;
    });
    return toVersion(created);
  }

  private async assertReadable(actorId: string, thesisId: string, deliverableId: string) {
    const role = await this.memberRole(actorId, thesisId);
    if (!canViewDeliverable(role)) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    const deliverable = await this.prisma.deliverable.findFirst({
      where: { id: deliverableId, thesisId },
      select: { id: true },
    });
    if (!deliverable) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
  }

  private async memberRole(
    actorId: string,
    thesisId: string,
    write = false,
  ): Promise<MembershipRole> {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES, write });
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
    });
    if (!membership) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return membership.role;
  }
}

function blockedMessage(status: DeliverableStatus): string {
  if (status === 'VALIDATED') {
    return 'Aucune nouvelle version ne peut être ajoutée à un livrable validé';
  }
  if (status === 'CANCELLED') {
    return 'Aucune nouvelle version ne peut être ajoutée à un livrable annulé';
  }
  return 'Aucune nouvelle version ne peut être ajoutée à ce stade';
}

function toVersion(row: VersionRow) {
  const profile = row.createdBy.profile;
  if (!profile) throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
  return {
    id: row.id,
    versionNumber: row.versionNumber,
    title: row.title,
    changeSummary: row.changeSummary,
    createdBy: {
      id: row.createdBy.id,
      givenName: profile.givenName,
      familyName: profile.familyName,
    },
    createdAt: row.createdAt.toISOString(),
    file: row.file ? toPublicFile(row.file) : null,
  };
}

function toPublicFile(file: NonNullable<VersionRow['file']>) {
  const profile = file.uploadedBy.profile;
  if (!profile) throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: Number(file.sizeBytes),
    createdAt: file.createdAt.toISOString(),
    uploadedBy: {
      id: file.uploadedBy.id,
      givenName: profile.givenName,
      familyName: profile.familyName,
    },
  };
}

function blankToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
