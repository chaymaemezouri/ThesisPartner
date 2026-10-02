import {
  buildStorageKey,
  contentDisposition,
  inspectUpload,
  sanitizeOriginalName,
  scanHeader,
  sha256Buffer,
  signedUrlExpiry,
  sumStoredBytes,
} from './file-rules';
import { commitAfterUpload } from './commit-upload';
import { policyAllowsPublicRead } from './s3-object-storage';

const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);

describe('file inspection', () => {
  const maxBytes = 50 * 1024 * 1024;

  it('accepts a PDF whose extension, type and signature agree', () => {
    const result = inspectUpload({
      originalName: 'chapitre.pdf',
      declaredMime: 'application/pdf',
      header: pdf,
      sizeBytes: pdf.length,
      maxBytes,
    });
    expect(result).toEqual({ ok: true, originalName: 'chapitre.pdf', mimeType: 'application/pdf' });
  });

  it('rejects HTML, scripts and executables by type', () => {
    expect(
      inspectUpload({
        originalName: 'page.html',
        declaredMime: 'text/html',
        header: Buffer.from('<html></html>'),
        sizeBytes: 13,
        maxBytes,
      }).ok,
    ).toBe(false);
    expect(
      inspectUpload({
        originalName: 'run.exe',
        declaredMime: 'application/octet-stream',
        header: exe,
        sizeBytes: exe.length,
        maxBytes,
      }),
    ).toMatchObject({ ok: false, code: 'FILE_TYPE_NOT_ALLOWED' });
    expect(
      inspectUpload({
        originalName: 'script.js',
        declaredMime: 'application/javascript',
        header: Buffer.from('alert(1)'),
        sizeBytes: 8,
        maxBytes,
      }),
    ).toMatchObject({ ok: false, code: 'FILE_TYPE_NOT_ALLOWED' });
  });

  it('rejects an executable renamed as a PDF', () => {
    expect(
      inspectUpload({
        originalName: 'thesis.pdf',
        declaredMime: 'application/pdf',
        header: exe,
        sizeBytes: exe.length,
        maxBytes,
      }),
    ).toMatchObject({ ok: false, code: 'FILE_SIGNATURE_MISMATCH' });
  });

  it('rejects a file above the configured limit', () => {
    expect(
      inspectUpload({
        originalName: 'chapitre.pdf',
        declaredMime: 'application/pdf',
        header: pdf,
        sizeBytes: 51,
        maxBytes: 50,
      }),
    ).toMatchObject({ ok: false, code: 'FILE_TOO_LARGE' });
  });

  it('keeps the storage key independent of the original name', () => {
    const key = buildStorageKey({
      thesisId: 'thesis',
      deliverableId: 'deliverable',
      versionId: 'version',
      objectId: 'object',
    });
    expect(key).toBe('theses/thesis/deliverables/deliverable/versions/version/object');
    expect(key).not.toContain('secret.pdf');
  });

  it('strips path traversal and control characters from the display name', () => {
    expect(sanitizeOriginalName('../../secret.pdf')).toBe('secret.pdf');
    expect(sanitizeOriginalName('rapport\r\n.pdf')).toBe('rapport.pdf');
    expect(contentDisposition('rapport\r\n.pdf')).not.toContain('\r');
    expect(contentDisposition('rapport\r\n.pdf')).not.toContain('\n');
    expect(contentDisposition('chapitre.pdf')).toContain('attachment;');
  });

  it('hashes the received bytes and sums sizes', () => {
    expect(sha256Buffer(pdf)).toHaveLength(64);
    expect(sumStoredBytes([10n, 15n])).toBe(25n);
  });

  it('marks the stub scan clean outside production and infected for the EICAR marker', () => {
    expect(scanHeader(pdf, 'development')).toBe('CLEAN');
    expect(scanHeader(pdf, 'test')).toBe('CLEAN');
    expect(scanHeader(pdf, 'production')).toBe('PENDING');
    expect(scanHeader(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'), 'development')).toBe(
      'INFECTED',
    );
  });

  it('computes a short signed-url expiry', () => {
    const now = new Date('2026-09-30T00:00:00.000Z');
    expect(signedUrlExpiry(now, 300).toISOString()).toBe('2026-09-30T00:05:00.000Z');
  });
});

describe('upload compensation', () => {
  it('removes the object when the database insert fails', async () => {
    const calls: string[] = [];
    await expect(
      commitAfterUpload({
        put: async () => {
          calls.push('put');
        },
        insert: async () => {
          calls.push('insert');
          throw new Error('db down');
        },
        remove: async () => {
          calls.push('remove');
        },
      }),
    ).rejects.toThrow('db down');
    expect(calls).toEqual(['put', 'insert', 'remove']);
  });

  it('keeps the object when the insert succeeds', async () => {
    const calls: string[] = [];
    await commitAfterUpload({
      put: async () => {
        calls.push('put');
      },
      insert: async () => {
        calls.push('insert');
      },
      remove: async () => {
        calls.push('remove');
      },
    });
    expect(calls).toEqual(['put', 'insert']);
  });
});

describe('bucket privacy', () => {
  it('detects a public read policy and ignores a private bucket', () => {
    expect(
      policyAllowsPublicRead(
        JSON.stringify({
          Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject' }],
        }),
      ),
    ).toBe(true);
    expect(policyAllowsPublicRead(undefined)).toBe(false);
    expect(policyAllowsPublicRead('{"Statement":[]}')).toBe(false);
  });
});
