import {
  CreateBucketCommand,
  DeleteBucketPolicyCommand,
  DeleteObjectCommand,
  GetBucketPolicyCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { contentDisposition, signedUrlExpiry } from './file-rules';
import type { ObjectStorage } from './object-storage';

@Injectable()
export class S3ObjectStorage implements ObjectStorage, OnModuleInit {
  private readonly client: S3Client;
  private readonly signer: S3Client;
  private ready = false;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly logger: StructuredLogger,
  ) {
    const credentials = {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    };
    const shared = {
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      requestChecksumCalculation: 'WHEN_REQUIRED' as const,
      responseChecksumValidation: 'WHEN_REQUIRED' as const,
      credentials,
    };
    const browserEndpoint = browserFacingS3Endpoint(env.S3_ENDPOINT, env.S3_PUBLIC_URL);
    this.client = new S3Client({ ...shared, endpoint: env.S3_ENDPOINT });
    this.signer =
      browserEndpoint === env.S3_ENDPOINT
        ? this.client
        : new S3Client({ ...shared, endpoint: browserEndpoint });
    if (browserEndpoint !== (env.S3_PUBLIC_URL ?? env.S3_ENDPOINT)) {
      this.logger.write({
        level: 'warn',
        msg: 'storage.s3_public_url_fallback',
        endpointHost: safeHost(env.S3_ENDPOINT),
        publicHost: safeHost(browserEndpoint),
      });
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await withTimeout(this.ensurePrivateBucket(), 2500);
      this.ready = true;
    } catch {
      this.ready = false;
      this.logger.write({ level: 'error', msg: 'storage.bucket_init_failed' });
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async ping(): Promise<boolean> {
    try {
      await withTimeout(this.ensurePrivateBucket(), 2500);
      this.ready = true;
      return true;
    } catch {
      this.ready = false;
      return false;
    }
  }

  async ensureReady(): Promise<void> {
    if (this.ready) return;
    const ok = await this.ping();
    if (!ok) {
      this.logger.write({ level: 'error', msg: 'storage.unavailable' });
      throw new AppException(503, 'STORAGE_UNAVAILABLE', 'Le stockage est indisponible.');
    }
  }

  async ensurePrivateBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.env.S3_BUCKET }));
    } catch (error) {
      if (!isMissing(error)) throw error;
      await this.client.send(new CreateBucketCommand({ Bucket: this.env.S3_BUCKET }));
    }
    await this.removePublicPolicy();
  }

  async putObject(input: {
    key: string;
    body: import('node:stream').Readable;
    contentType: string;
    contentLength: number;
    downloadName?: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
        ContentDisposition: input.downloadName
          ? contentDisposition(input.downloadName)
          : 'attachment',
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: key,
      }),
    );
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }));
      return true;
    } catch (error) {
      if (isMissing(error)) return false;
      throw error;
    }
  }

  async objectContentType(key: string): Promise<string | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }),
      );
      return head.ContentType ?? null;
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  async createSignedDownloadUrl(input: {
    key: string;
    downloadName: string;
    contentType: string;
    ttlSeconds: number;
    inline?: boolean;
  }): Promise<{ url: string; expiresAt: Date }> {
    const command = new GetObjectCommand({
      Bucket: this.env.S3_BUCKET,
      Key: input.key,
      ResponseContentType: input.contentType,
      ResponseContentDisposition: contentDisposition(input.downloadName, input.inline),
    });
    const url = await getSignedUrl(this.signer, command, { expiresIn: input.ttlSeconds });
    return {
      url,
      expiresAt: signedUrlExpiry(new Date(), input.ttlSeconds),
    };
  }

  private async removePublicPolicy(): Promise<void> {
    try {
      const current = await this.client.send(
        new GetBucketPolicyCommand({ Bucket: this.env.S3_BUCKET }),
      );
      if (!policyAllowsPublicRead(current.Policy)) return;
      await this.client.send(new DeleteBucketPolicyCommand({ Bucket: this.env.S3_BUCKET }));
      this.logger.write({ level: 'warn', msg: 'storage.public_policy_removed' });
    } catch (error) {
      if (isMissing(error)) return;
      throw error;
    }
  }
}

export function policyAllowsPublicRead(policy: string | undefined): boolean {
  if (!policy) return false;
  return (
    /"Effect"\s*:\s*"Allow"/i.test(policy) && /\*/.test(policy) && /s3:GetObject/i.test(policy)
  );
}

function withTimeout<T>(action: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    action.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isMissing(error: unknown): boolean {
  const candidate = error as S3ServiceException & { $metadata?: { httpStatusCode?: number } };
  const status = candidate.$metadata?.httpStatusCode;
  const name = candidate.name;
  return (
    status === 404 ||
    name === 'NotFound' ||
    name === 'NoSuchBucket' ||
    name === 'NoSuchKey' ||
    name === 'NoSuchBucketPolicy'
  );
}

/** Endpoint used in signed URLs opened by browsers (never a Docker-only hostname). */
export function browserFacingS3Endpoint(endpoint: string, publicUrl: string | undefined): string {
  if (publicUrl) return publicUrl.replace(/\/$/, '');
  const host = safeHost(endpoint);
  if (isBrowserReachableHost(host)) return endpoint.replace(/\/$/, '');
  // Local Compose maps container s3:8333 → host 127.0.0.1:9000.
  return 'http://127.0.0.1:9000';
}

function isBrowserReachableHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'invalid';
  }
}
