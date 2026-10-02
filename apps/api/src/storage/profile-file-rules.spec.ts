import { describe, expect, it } from 'vitest';
import {
  buildProfileStorageKey,
  inspectProfileUpload,
  storageKeyFromRef,
  toStorageRef,
} from './profile-file-rules';

describe('profile file rules', () => {
  it('builds and parses storage refs', () => {
    const key = buildProfileStorageKey({
      userId: 'u1',
      kind: 'avatar',
      objectId: 'o1',
    });
    expect(key).toBe('users/u1/avatar/o1');
    expect(storageKeyFromRef(toStorageRef(key))).toBe(key);
  });

  it('accepts a JPEG avatar header', () => {
    const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = inspectProfileUpload({
      kind: 'avatar',
      originalName: 'photo.jpg',
      declaredMime: 'image/jpeg',
      header,
      sizeBytes: 1200,
    });
    expect(result).toEqual({ ok: true, originalName: 'photo.jpg', mimeType: 'image/jpeg' });
  });

  it('rejects a non-pdf cv', () => {
    const result = inspectProfileUpload({
      kind: 'cv',
      originalName: 'notes.txt',
      declaredMime: 'text/plain',
      header: Buffer.from('hello'),
      sizeBytes: 5,
    });
    expect(result).toEqual({ ok: false, code: 'FILE_TYPE_NOT_ALLOWED' });
  });
});
