import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

export const FILE_ERROR_CODES = [
  'FILE_TOO_LARGE',
  'FILE_TYPE_NOT_ALLOWED',
  'FILE_SIGNATURE_MISMATCH',
] as const;

export type FileErrorCode = (typeof FILE_ERROR_CODES)[number];

export type FileInspection =
  { ok: true; originalName: string; mimeType: string } | { ok: false; code: FileErrorCode };

const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

type Family = 'pdf' | 'ole' | 'zip' | 'text' | 'json';

const ALLOWED: { extension: string; mimeType: string; family: Family }[] = [
  { extension: 'pdf', mimeType: 'application/pdf', family: 'pdf' },
  { extension: 'doc', mimeType: 'application/msword', family: 'ole' },
  {
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    family: 'zip',
  },
  { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint', family: 'ole' },
  {
    extension: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    family: 'zip',
  },
  { extension: 'xls', mimeType: 'application/vnd.ms-excel', family: 'ole' },
  {
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    family: 'zip',
  },
  { extension: 'txt', mimeType: 'text/plain', family: 'text' },
  { extension: 'csv', mimeType: 'text/csv', family: 'text' },
  { extension: 'zip', mimeType: 'application/zip', family: 'zip' },
  { extension: 'json', mimeType: 'application/json', family: 'json' },
];

const DANGEROUS_MIME = new Set([
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/vnd.android.package-archive',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'application/x-bat',
]);

const BLOCKED_EXTENSIONS = new Set([
  'html',
  'htm',
  'js',
  'mjs',
  'exe',
  'bat',
  'cmd',
  'ps1',
  'apk',
  'dll',
  'sh',
  'msi',
  'com',
  'scr',
  'vbs',
  'svg',
]);

export function allowedUploadTypes(): { extension: string; mimeType: string }[] {
  return ALLOWED.map(({ extension, mimeType }) => ({ extension, mimeType }));
}

export function sanitizeOriginalName(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? '';
  const cleaned = stripControls(base)
    .replace(/["\\]/g, '')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 180);
  return cleaned.length > 0 ? cleaned : 'document';
}

function stripControls(value: string): string {
  let result = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code >= 32 && code !== 127) result += char;
  }
  return result;
}

export function contentDisposition(filename: string, inline = false): string {
  const safe = sanitizeOriginalName(filename);
  const ascii = safe.replace(/[^\x20-\x7e]/g, '_');
  const kind = inline ? 'inline' : 'attachment';
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export function buildStorageKey(input: {
  thesisId: string;
  deliverableId: string;
  versionId: string;
  objectId: string;
}): string {
  return `theses/${input.thesisId}/deliverables/${input.deliverableId}/versions/${input.versionId}/${input.objectId}`;
}

export function signedUrlExpiry(now: Date, ttlSeconds: number): Date {
  return new Date(now.getTime() + ttlSeconds * 1000);
}

/** Rewrites the host of an S3 signed URL so browsers can reach a public endpoint. */
export function rewriteSignedUrl(url: string, publicBase: string | undefined): string {
  if (!publicBase) return url;
  const signed = new URL(url);
  const published = new URL(publicBase);
  signed.protocol = published.protocol;
  signed.host = published.host;
  return signed.toString();
}

export function sumStoredBytes(sizes: readonly bigint[]): bigint {
  return sizes.reduce((total, size) => total + size, 0n);
}

export function inspectUpload(input: {
  originalName: string;
  declaredMime: string;
  header: Buffer;
  sizeBytes: number;
  maxBytes: number;
}): FileInspection {
  if (input.sizeBytes <= 0) return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };
  if (input.sizeBytes > input.maxBytes) return { ok: false, code: 'FILE_TOO_LARGE' };

  const originalName = sanitizeOriginalName(input.originalName);
  const extension = extensionOf(originalName);
  if (!extension || BLOCKED_EXTENSIONS.has(extension)) {
    return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };
  }

  const declared = input.declaredMime.split(';')[0]?.trim().toLowerCase() ?? '';
  if (DANGEROUS_MIME.has(declared)) return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };

  const allowed = ALLOWED.find((item) => item.extension === extension);
  if (!allowed) return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };
  if (!mimeMatches(declared, allowed)) return { ok: false, code: 'FILE_TYPE_NOT_ALLOWED' };
  if (!signatureMatches(allowed.family, input.header)) {
    return { ok: false, code: 'FILE_SIGNATURE_MISMATCH' };
  }

  return { ok: true, originalName, mimeType: allowed.mimeType };
}

export async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

export function sha256Buffer(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex');
}

export function scanHeader(
  header: Buffer,
  nodeEnv: string,
  mode: 'stub' | 'allow' = 'stub',
): 'CLEAN' | 'PENDING' | 'INFECTED' {
  if (header.includes(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'))) return 'INFECTED';
  if (mode === 'allow') return 'CLEAN';
  if (nodeEnv === 'production') return 'PENDING';
  return 'CLEAN';
}

function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

function mimeMatches(declared: string, allowed: { mimeType: string; family: Family }): boolean {
  if (declared === allowed.mimeType || declared === 'application/octet-stream') return true;
  if (allowed.family === 'text' || allowed.family === 'json') return declared === 'text/plain';
  return false;
}

function signatureMatches(family: Family, header: Buffer): boolean {
  if (family === 'pdf') return header.subarray(0, 4).toString('utf8') === '%PDF';
  if (family === 'ole') return header.subarray(0, OLE.length).equals(OLE);
  if (family === 'zip') return isZip(header);
  if (family === 'text') return isPlainText(header);
  return isJson(header);
}

function isZip(header: Buffer): boolean {
  return (
    header.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
    header.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
    header.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]))
  );
}

function isPlainText(header: Buffer): boolean {
  if (header.includes(0)) return false;
  if (header.subarray(0, 2).toString('utf8') === 'MZ') return false;
  if (header.subarray(0, 4).toString('utf8') === '\u007fELF') return false;
  if (header.subarray(0, 4).toString('utf8') === '%PDF') return false;
  if (header.subarray(0, OLE.length).equals(OLE)) return false;
  if (isZip(header)) return false;
  const start = header.toString('utf8').trimStart().toLowerCase();
  if (start.startsWith('<')) return false;
  return true;
}

function isJson(header: Buffer): boolean {
  if (!isPlainText(header)) return false;
  const start = header.toString('utf8').trimStart();
  return /^[[{"]/.test(start) || /^-?\d/.test(start) || /^(true|false|null)/.test(start);
}
