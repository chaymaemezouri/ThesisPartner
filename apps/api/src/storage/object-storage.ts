import type { Readable } from 'node:stream';

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export type ObjectStorage = {
  isReady(): boolean;
  ensureReady(): Promise<void>;
  ping(): Promise<boolean>;
  ensurePrivateBucket(): Promise<void>;
  putObject(input: {
    key: string;
    body: Readable;
    contentType: string;
    contentLength: number;
    downloadName?: string;
  }): Promise<void>;
  deleteObject(key: string): Promise<void>;
  objectExists(key: string): Promise<boolean>;
  createSignedDownloadUrl(input: {
    key: string;
    downloadName: string;
    contentType: string;
    ttlSeconds: number;
    inline?: boolean;
  }): Promise<{ url: string; expiresAt: Date }>;
};
