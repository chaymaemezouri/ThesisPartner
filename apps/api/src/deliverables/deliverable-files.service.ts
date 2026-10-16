import { Inject, Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { MembershipRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { commitAfterUpload } from '../storage/commit-upload';
import { buildStorageKey, inspectUpload, scanHeader, sha256File } from '../storage/file-rules';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage';
import { S3ObjectStorage } from '../storage/s3-object-storage';
import { canDownloadFile, canUploadFile } from './deliverable-policy';

const READ_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;

const fileInclude = {
  uploadedBy: { select: { id: true, profile: { select: { givenName: true, familyName: true } } } },
} satisfies Prisma.StoredFileInclude;

type FileRow = Prisma.StoredFileGetPayload<{ include: typeof fileInclude }>;

export type UploadedTempFile = {
  path: string;
  originalName: string;
  declaredMime: string;
};

@Injectable()
export class DeliverableFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    private readonly storage: S3ObjectStorage,
    @Inject(OBJECT_STORAGE) private readonly objects: ObjectStorage,
    @Inject(ENV) private readonly env: Env,
    private readonly logger: StructuredLogger,
  ) {}

  async upload(
    actorId: string,
    thesisId: string,
    deliverableId: string,
    versionId: string,
    file: UploadedTempFile | undefined,
    requestId?: string,
  ) {
    if (!file) {
      throw new AppException(400, 'FILE_TYPE_NOT_ALLOWED', 'Aucun fichier n’a été envoyé.');
    }
    const loaded = await this.loadVersion(actorId, thesisId, deliverableId, versionId);
    if (!canUploadFile(loaded.role, loaded.version.deliverable.status)) {
      if (loaded.role !== 'DOCTORAL_STUDENT') {
        throw new AppException(403, 'FORBIDDEN', 'Ajout de fichier non autorisé');
      }
      throw new AppException(400, 'BAD_REQUEST', 'Un fichier ne peut pas être ajouté à ce stade');
    }
    if (loaded.version.file) {
      throw new AppException(
        409,
        'VERSION_FILE_ALREADY_EXISTS',
        'Cette version possède déjà un fichier.',
      );
    }
    await this.consumeUploadBudget(actorId);
    if (!this.storage.isReady()) {
      throw new AppException(503, 'INTERNAL_ERROR', 'Le stockage est indisponible.');
    }

    const info = await stat(file.path);
    const header = await readHeader(file.path);
    const inspection = inspectUpload({
      originalName: file.originalName,
      declaredMime: file.declaredMime,
      header,
      sizeBytes: info.size,
      maxBytes: this.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    });
    if (!inspection.ok) throw fileError(inspection.code, this.env.MAX_UPLOAD_SIZE_MB);

    const scanStatus = scanHeader(header, this.env.NODE_ENV);
    if (scanStatus === 'INFECTED') {
      throw new AppException(
        403,
        'FILE_INFECTED',
        'Ce fichier a été refusé par le contrôle de sécurité.',
      );
    }

    const checksumSha256 = await sha256File(file.path);
    const objectId = randomUUID();
    const storageKey = buildStorageKey({ thesisId, deliverableId, versionId, objectId });
    let created: FileRow | undefined;

    this.logger.write({
      level: 'info',
      msg: 'upload.started',
      thesisId,
      versionId,
      sizeBytes: info.size,
      mimeType: inspection.mimeType,
    });

    try {
      await commitAfterUpload({
        put: () =>
          this.objects.putObject({
            key: storageKey,
            body: createReadStream(file.path),
            contentType: inspection.mimeType,
            contentLength: info.size,
            downloadName: inspection.originalName,
          }),
        insert: async () => {
          created = await this.prisma.$transaction(async (tx) => {
            const row = await tx.storedFile.create({
              data: {
                deliverableVersionId: versionId,
                storageKey,
                originalName: inspection.originalName,
                mimeType: inspection.mimeType,
                sizeBytes: BigInt(info.size),
                checksumSha256,
                scanStatus,
                storageProvider: 's3',
                uploadedById: actorId,
              },
              include: fileInclude,
            });
            await this.audit.record(tx, {
              actorId,
              thesisId,
              action: 'deliverable.file_uploaded',
              entityType: 'stored_file',
              entityId: row.id,
              requestId,
              metadata: {
                fileId: row.id,
                versionId,
                deliverableId,
                sizeBytes: info.size,
                mimeType: inspection.mimeType,
              },
            });
            return row;
          });
        },
        remove: () => this.objects.deleteObject(storageKey),
        onRemoveFailed: () => {
          this.logger.write({ level: 'error', msg: 'upload.cleanup_failed', thesisId, versionId });
        },
      });
    } catch (error) {
      this.logger.write({ level: 'error', msg: 'upload.failed', thesisId, versionId });
      if (error instanceof AppException) throw error;
      if (isUniqueViolation(error)) {
        throw new AppException(
          409,
          'VERSION_FILE_ALREADY_EXISTS',
          'Cette version possède déjà un fichier.',
        );
      }
      throw new AppException(503, 'INTERNAL_ERROR', 'Le stockage est indisponible.');
    }

    if (!created) throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
    this.logger.write({
      level: 'info',
      msg: 'upload.completed',
      thesisId,
      versionId,
      fileId: created.id,
      sizeBytes: info.size,
    });
    return toPublicFile(created);
  }

  async download(actorId: string, thesisId: string, deliverableId: string, versionId: string) {
    const loaded = await this.loadVersion(actorId, thesisId, deliverableId, versionId);
    if (!canDownloadFile(loaded.role))
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    const file = loaded.version.file;
    if (!file) {
      throw new AppException(404, 'NOT_FOUND', 'Aucun fichier n’est associé à cette version.');
    }
    if (file.scanStatus === 'INFECTED') {
      throw new AppException(403, 'FILE_INFECTED', 'Ce fichier ne peut pas être téléchargé.');
    }
    if (file.scanStatus !== 'CLEAN') {
      throw new AppException(
        409,
        'FILE_SCAN_PENDING',
        'Ce fichier n’est pas encore disponible au téléchargement.',
      );
    }
    if (!this.storage.isReady()) {
      throw new AppException(503, 'INTERNAL_ERROR', 'Le stockage est indisponible.');
    }
    try {
      return await this.objects.createSignedDownloadUrl({
        key: file.storageKey,
        downloadName: file.originalName,
        contentType: file.mimeType,
        ttlSeconds: this.env.SIGNED_URL_TTL_SECONDS,
      });
    } catch {
      throw new AppException(503, 'INTERNAL_ERROR', 'Le stockage est indisponible.');
    }
  }

  private async consumeUploadBudget(actorId: string): Promise<void> {
    const count = await this.redis.incrementWindow(
      `upload:${actorId}`,
      this.env.UPLOAD_RATE_LIMIT_TTL_MS,
    );
    if (count === null || count > this.env.UPLOAD_RATE_LIMIT_MAX) {
      throw new AppException(
        429,
        'RATE_LIMITED',
        'Trop de fichiers envoyés. Réessayez dans un moment.',
      );
    }
  }

  private async loadVersion(
    actorId: string,
    thesisId: string,
    deliverableId: string,
    versionId: string,
  ) {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES });
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
    });
    if (!membership) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    const version = await this.prisma.deliverableVersion.findFirst({
      where: { id: versionId, deliverableId, deliverable: { thesisId } },
      include: {
        deliverable: { select: { status: true } },
        file: {
          select: {
            id: true,
            storageKey: true,
            originalName: true,
            mimeType: true,
            scanStatus: true,
          },
        },
      },
    });
    if (!version) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return { role: membership.role as MembershipRole, version };
  }
}

function toPublicFile(row: FileRow) {
  const profile = row.uploadedBy.profile;
  if (!profile) throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
  return {
    id: row.id,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes),
    createdAt: row.createdAt.toISOString(),
    uploadedBy: {
      id: row.uploadedBy.id,
      givenName: profile.givenName,
      familyName: profile.familyName,
    },
  };
}

async function readHeader(path: string): Promise<Buffer> {
  const handle = await open(path, 'r');
  try {
    const header = Buffer.alloc(64);
    const { bytesRead } = await handle.read(header, 0, 64, 0);
    return header.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function fileError(
  code: 'FILE_TOO_LARGE' | 'FILE_TYPE_NOT_ALLOWED' | 'FILE_SIGNATURE_MISMATCH',
  maxMb: number,
) {
  if (code === 'FILE_TOO_LARGE') {
    return new AppException(413, code, `Le fichier dépasse la taille maximale de ${maxMb} Mo.`);
  }
  if (code === 'FILE_SIGNATURE_MISMATCH') {
    return new AppException(400, code, 'Le fichier semble ne pas correspondre à son format.');
  }
  return new AppException(400, code, 'Ce type de fichier n’est pas autorisé.');
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
