import { Inject, Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { commitAfterUpload } from '../storage/commit-upload';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage';
import {
  buildProfileStorageKey,
  inspectProfileUpload,
  profileFileErrorMessage,
  storageKeyFromRef,
  toStorageRef,
  type ProfileAssetKind,
} from '../storage/profile-file-rules';
import { S3ObjectStorage } from '../storage/s3-object-storage';
import { type AcademicProfile, presentAcademicProfile, toAcademicProfile } from './profile.service';

export type UploadedTempFile = {
  path: string;
  originalName: string;
  declaredMime: string;
};

@Injectable()
export class ProfileFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    private readonly storage: S3ObjectStorage,
    @Inject(OBJECT_STORAGE) private readonly objects: ObjectStorage,
    @Inject(ENV) private readonly env: Env,
    private readonly logger: StructuredLogger,
  ) {}

  async uploadAvatar(
    userId: string,
    file: UploadedTempFile | undefined,
    requestId?: string,
  ): Promise<AcademicProfile> {
    return this.upload(userId, 'avatar', file, requestId);
  }

  async uploadCv(
    userId: string,
    file: UploadedTempFile | undefined,
    requestId?: string,
  ): Promise<AcademicProfile> {
    return this.upload(userId, 'cv', file, requestId);
  }

  async avatarDownload(actorId: string, userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    const key = storageKeyFromRef(profile.avatarUrl);
    if (!key) throw new AppException(404, 'NOT_FOUND', 'Aucune photo de profil.');
    await this.storage.ensureReady();
    const name = key.split('/').pop() ?? 'avatar.jpg';
    return this.objects.createSignedDownloadUrl({
      key,
      downloadName: name.includes('.') ? name : `${name}.jpg`,
      contentType: 'application/octet-stream',
      ttlSeconds: this.env.SIGNED_URL_TTL_SECONDS,
    });
  }

  async cvDownload(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    const key = storageKeyFromRef(profile.cvUrl);
    if (!key) throw new AppException(404, 'NOT_FOUND', 'Aucun CV.');
    await this.storage.ensureReady();
    return this.objects.createSignedDownloadUrl({
      key,
      downloadName: 'cv.pdf',
      contentType: 'application/pdf',
      ttlSeconds: this.env.SIGNED_URL_TTL_SECONDS,
    });
  }

  private async upload(
    userId: string,
    kind: ProfileAssetKind,
    file: UploadedTempFile | undefined,
    requestId?: string,
  ): Promise<AcademicProfile> {
    if (!file) {
      throw new AppException(400, 'FILE_TYPE_NOT_ALLOWED', 'Aucun fichier n’a été envoyé.');
    }
    await this.consumeUploadBudget(userId);
    await this.storage.ensureReady();

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new AppException(404, 'NOT_FOUND', 'Resource not found');

    const info = await stat(file.path);
    const header = await readHeader(file.path);
    const inspection = inspectProfileUpload({
      kind,
      originalName: file.originalName,
      declaredMime: file.declaredMime,
      header,
      sizeBytes: info.size,
    });
    if (!inspection.ok) {
      throw new AppException(400, inspection.code, profileFileErrorMessage(inspection.code, kind));
    }

    const objectId = randomUUID();
    const storageKey = buildProfileStorageKey({ userId, kind, objectId });
    const previousKey = storageKeyFromRef(kind === 'avatar' ? profile.avatarUrl : profile.cvUrl);
    const field = kind === 'avatar' ? 'avatarUrl' : 'cvUrl';

    this.logger.write({
      level: 'info',
      msg: 'profile.upload.started',
      userId,
      kind,
      sizeBytes: info.size,
      mimeType: inspection.mimeType,
    });

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
        await this.prisma.$transaction(async (tx) => {
          await tx.profile.update({
            where: { userId },
            data: { [field]: toStorageRef(storageKey) },
          });
          await this.audit.record(tx, {
            actorId: userId,
            action: kind === 'avatar' ? 'profile.avatar_uploaded' : 'profile.cv_uploaded',
            entityType: 'profile',
            entityId: profile.id,
            requestId,
          });
        });
      },
      remove: () => this.objects.deleteObject(storageKey),
      onRemoveFailed: (error) => {
        this.logger.write({
          level: 'error',
          msg: 'profile.upload.cleanup_failed',
          error: error instanceof Error ? error.message : 'unknown',
        });
      },
    });

    if (previousKey && previousKey !== storageKey) {
      await this.objects.deleteObject(previousKey).catch(() => undefined);
    }

    const updated = await this.prisma.profile.findUniqueOrThrow({ where: { userId } });
    return presentAcademicProfile(toAcademicProfile(updated), userId, true);
  }

  private async consumeUploadBudget(userId: string) {
    const count = await this.redis.incrementWindow(
      `upload:profile:${userId}`,
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
}

async function readHeader(path: string): Promise<Buffer> {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await handle.read(buffer, 0, 64, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}
