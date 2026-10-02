import type { FileErrorCode, FileInspection } from './file-rules';
import { sanitizeOriginalName } from './file-rules';

const STORAGE_PREFIX = 'storage:';

export type ProfileAssetKind = 'avatar' | 'cv';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const CV_MAX_BYTES = 15 * 1024 * 1024;

type AvatarFamily = 'jpeg' | 'png' | 'webp';

const AVATAR_ALLOWED: { extension: string; mimeType: string; family: AvatarFamily }[] = [
  { extension: 'jpg', mimeType: 'image/jpeg', family: 'jpeg' },
  { extension: 'jpeg', mimeType: 'image/jpeg', family: 'jpeg' },
  { extension: 'png', mimeType: 'image/png', family: 'png' },
  { extension: 'webp', mimeType: 'image/webp', family: 'webp' },
];

export function toStorageRef(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function storageKeyFromRef(value: string | null | undefined): string | null {
  if (!value?.startsWith(STORAGE_PREFIX)) return null;
  const key = value.slice(STORAGE_PREFIX.length);
  return key.length > 0 ? key : null;
}

export function isStorageRef(value: string | null | undefined): boolean {
  return storageKeyFromRef(value) !== null;
}

export function buildProfileStorageKey(input: {
  userId: string;
  kind: ProfileAssetKind;
  objectId: string;
}): string {
  return `users/${input.userId}/${input.kind}/${input.objectId}`;
}

export function clientAvatarPath(userId: string, isSelf: boolean): string {
  return isSelf ? '/api/v1/profile/avatar' : `/api/v1/users/${userId}/avatar`;
}

export function inspectProfileUpload(input: {
  kind: ProfileAssetKind;
  originalName: string;
  declaredMime: string;
  header: Buffer;
  sizeBytes: number;
}): FileInspection {
  if (input.sizeBytes <= 0) return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };
  const maxBytes = input.kind === 'avatar' ? AVATAR_MAX_BYTES : CV_MAX_BYTES;
  if (input.sizeBytes > maxBytes) return { ok: false, code: 'FILE_TOO_LARGE' };

  const originalName = sanitizeOriginalName(input.originalName);
  const extension = extensionOf(originalName);
  if (!extension) return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };

  const declared = input.declaredMime.split(';')[0]?.trim().toLowerCase() ?? '';

  if (input.kind === 'cv') {
    if (extension !== 'pdf') return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };
    if (declared !== 'application/pdf' && declared !== 'application/octet-stream') {
      return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };
    }
    if (input.header.subarray(0, 4).toString('utf8') !== '%PDF') {
      return { ok: false, code: 'FILE_SIGNATURE_MISMATCH' };
    }
    return { ok: true, originalName, mimeType: 'application/pdf' };
  }

  const allowed = AVATAR_ALLOWED.find((item) => item.extension === extension);
  if (!allowed) return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };
  if (declared !== allowed.mimeType && declared !== 'application/octet-stream') {
    return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };
  }
  if (!avatarSignatureMatches(allowed.family, input.header)) {
    return { ok: false, code: 'FILE_SIGNATURE_MISMATCH' };
  }
  return { ok: true, originalName, mimeType: allowed.mimeType };
}

export function profileFileErrorMessage(code: FileErrorCode, kind: ProfileAssetKind): string {
  if (code === 'FILE_TOO_LARGE') {
    return kind === 'avatar'
      ? 'La photo dépasse la taille maximale de 5 Mo.'
      : 'Le CV dépasse la taille maximale de 15 Mo.';
  }
  if (code === 'FILE_SIGNATURE_MISMATCH') {
    return 'Le contenu du fichier ne correspond pas à son type.';
  }
  return kind === 'avatar'
    ? 'Formats acceptés : JPG, PNG ou WebP.'
    : 'Seul un fichier PDF est accepté pour le CV.';
}

function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

function avatarSignatureMatches(family: AvatarFamily, header: Buffer): boolean {
  if (family === 'jpeg') {
    return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (family === 'png') {
    return header
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  // WEBP: RIFF....WEBP
  return (
    header.length >= 12 &&
    header.subarray(0, 4).toString('ascii') === 'RIFF' &&
    header.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}
