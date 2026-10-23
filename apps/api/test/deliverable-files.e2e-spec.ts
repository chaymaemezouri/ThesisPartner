import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import type { INestApplication } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  dashboardSchema,
  deliverableSchema,
  deliverableVersionSchema,
  fileDownloadSchema,
  storedFileSchema,
} from '@thesispartner/validation';
import request from 'supertest';
import { createApp } from '../src/app.factory';
import { inviteSupervisor } from './helpers/invite-supervisor';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { commitAfterUpload } from '../src/storage/commit-upload';
import { S3ObjectStorage } from '../src/storage/s3-object-storage';

const password = 'phrase-secrete-12';
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const otherPdf = Buffer.from('%PDF-1.4\n2 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

function csrfFrom(response: request.Response): string {
  const header = response.headers['set-cookie'];
  const lines = Array.isArray(header) ? header : header ? [header] : [];
  const line = lines.find((item) => item.startsWith('tp_csrf='));
  const pair = line?.split(';')[0];
  if (!pair) throw new Error('missing csrf cookie');
  return decodeURIComponent(pair.slice('tp_csrf='.length));
}

function storageClient(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'thesispartner',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'thesispartner-secret',
    },
  });
}

describe('deliverable files', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: S3ObjectStorage;
  const emails: string[] = [];
  const prefixes: string[] = [];

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    prisma = app.get(PrismaService);
    storage = app.get(S3ObjectStorage);
  });

  afterAll(async () => {
    if (storage) {
      const client = storageClient();
      for (const prefix of prefixes) {
        const listed = await client.send(
          new ListObjectsV2Command({ Bucket: 'thesispartner', Prefix: prefix }),
        );
        for (const item of listed.Contents ?? []) {
          if (item.Key) await storage.deleteObject(item.Key);
        }
      }
    }
    if (!prisma) return;
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    const memberships = await prisma.thesisMembership.findMany({
      where: { userId: { in: ids } },
      select: { thesisId: true },
    });
    const thesisIds = [...new Set(memberships.map((item) => item.thesisId))];
    await prisma.deliverableVersion.deleteMany({
      where: { deliverable: { thesisId: { in: thesisIds } } },
    });
    await prisma.deliverable.deleteMany({ where: { thesisId: { in: thesisIds } } });
    await prisma.objective.deleteMany({ where: { thesisId: { in: thesisIds } } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { thesisId: { in: thesisIds } }] },
    });
    await prisma.authToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.thesisMembership.deleteMany({ where: { thesisId: { in: thesisIds } } });
    await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.thesis.deleteMany({ where: { id: { in: thesisIds } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('stores a private object and lets a member supervisor download it', async () => {
    expect(storage.isReady()).toBe(true);
    const student = await register('camille');
    const other = await register('lea');
    const supervisor = await register('noa');
    const outsider = await register('prof-ext');
    const thesisId = await createThesis(student, 'These fichiers');
    prefixes.push(`theses/${thesisId}/`);
    const otherThesis = await createThesis(other, 'These autre');
    prefixes.push(`theses/${otherThesis}/`);
    await invite(student, thesisId, supervisor.email);
    await invite(other, otherThesis, outsider.email);
    const deliverableId = await createDeliverable(student, thesisId, 'Chapitre 2');
    const version = await createVersion(student, thesisId, deliverableId);

    const missing = await student.agent.get(
      `${filePath(thesisId, deliverableId, version.id)}/download`,
    );
    expect(missing.status).toBe(404);

    const uploaded = await student.agent
      .post(filePath(thesisId, deliverableId, version.id))
      .set('x-csrf-token', student.csrf)
      .attach('file', pdf, { filename: 'chapitre.pdf', contentType: 'application/pdf' });
    expect(uploaded.status).toBe(201);
    const file = storedFileSchema.parse(uploaded.body);
    expect(file.originalName).toBe('chapitre.pdf');
    expect(file.mimeType).toBe('application/pdf');
    expect(file.sizeBytes).toBe(pdf.length);
    expect(uploaded.body).not.toHaveProperty('storageKey');
    expect(uploaded.body).not.toHaveProperty('checksumSha256');

    const stored = await prisma.storedFile.findUniqueOrThrow({ where: { id: file.id } });
    expect(stored.checksumSha256).toBe(createHash('sha256').update(pdf).digest('hex'));
    expect(
      stored.storageKey.startsWith(
        `theses/${thesisId}/deliverables/${deliverableId}/versions/${version.id}/`,
      ),
    ).toBe(true);
    expect(stored.storageKey).not.toContain('chapitre');
    expect(await storage.objectExists(stored.storageKey)).toBe(true);

    const anonymous = await fetch(
      `${process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000'}/thesispartner/${stored.storageKey}`,
    );
    expect(anonymous.status).toBe(403);

    const listed = await student.agent.get(
      `/api/v1/theses/${thesisId}/deliverables/${deliverableId}/versions/${version.id}`,
    );
    expect(listed.status).toBe(200);
    expect(deliverableVersionSchema.parse(listed.body).file?.id).toBe(file.id);
    expect(listed.body.file).not.toHaveProperty('storageKey');

    const download = await supervisor.agent.get(
      `${filePath(thesisId, deliverableId, version.id)}/download`,
    );
    expect(download.status).toBe(200);
    const signed = fileDownloadSchema.parse(download.body);
    expect(signed.url).toContain('X-Amz-Expires=300');
    const bytes = await fetch(signed.url);
    expect(bytes.status).toBe(200);
    expect(
      Buffer.from(await bytes.arrayBuffer())
        .subarray(0, 4)
        .toString('utf8'),
    ).toBe('%PDF');
    expect(bytes.headers.get('content-disposition')).toContain('attachment');

    expect(
      (await other.agent.get(`${filePath(thesisId, deliverableId, version.id)}/download`)).status,
    ).toBe(404);
    expect(
      (await outsider.agent.get(`${filePath(thesisId, deliverableId, version.id)}/download`))
        .status,
    ).toBe(404);
    expect(
      (
        await supervisor.agent
          .post(filePath(thesisId, deliverableId, version.id))
          .set('x-csrf-token', supervisor.csrf)
          .attach('file', otherPdf, { filename: 'autre.pdf', contentType: 'application/pdf' })
      ).status,
    ).toBe(409);
    expect(
      (await student.agent.delete(`${filePath(thesisId, deliverableId, version.id)}`)).status,
    ).toBe(404);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'deliverable.file_uploaded', entityId: file.id },
    });
    expect(audit?.metadata).toMatchObject({
      fileId: file.id,
      versionId: version.id,
      deliverableId,
      mimeType: 'application/pdf',
      sizeBytes: pdf.length,
    });
    expect(JSON.stringify(audit?.metadata)).not.toContain('chapitre.pdf');

    const dashboard = dashboardSchema.parse((await student.agent.get('/api/v1/dashboard')).body);
    expect(
      dashboard.recentActivity.some((item) =>
        item.message?.includes('Un fichier a été ajouté à la version V1 de « Chapitre 2 »'),
      ),
    ).toBe(true);

    const sum = await prisma.storedFile.aggregate({
      where: { version: { deliverable: { thesisId } } },
      _sum: { sizeBytes: true },
    });
    expect(sum._sum.sizeBytes).toBe(BigInt(pdf.length));
  });

  it('refuses a second file and keeps the first object', async () => {
    const student = await register('ines');
    const thesisId = await createThesis(student, 'These doublon');
    prefixes.push(`theses/${thesisId}/`);
    const deliverableId = await createDeliverable(student, thesisId, 'Annexe');
    const version = await createVersion(student, thesisId, deliverableId);
    const first = await student.agent
      .post(filePath(thesisId, deliverableId, version.id))
      .set('x-csrf-token', student.csrf)
      .attach('file', pdf, { filename: 'annexe.pdf', contentType: 'application/pdf' });
    expect(first.status).toBe(201);
    const stored = await prisma.storedFile.findUniqueOrThrow({
      where: { deliverableVersionId: version.id },
    });

    const second = await student.agent
      .post(filePath(thesisId, deliverableId, version.id))
      .set('x-csrf-token', student.csrf)
      .attach('file', otherPdf, { filename: 'annexe-2.pdf', contentType: 'application/pdf' });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('VERSION_FILE_ALREADY_EXISTS');
    const after = await prisma.storedFile.findUniqueOrThrow({ where: { id: stored.id } });
    expect(after.checksumSha256).toBe(stored.checksumSha256);
    const listed = await storageClient().send(
      new ListObjectsV2Command({ Bucket: 'thesispartner', Prefix: `theses/${thesisId}/` }),
    );
    expect(listed.KeyCount).toBe(1);
  });

  it('keeps a hostile filename out of the storage key', async () => {
    const student = await register('hugo');
    const thesisId = await createThesis(student, 'These nom');
    prefixes.push(`theses/${thesisId}/`);
    const deliverableId = await createDeliverable(student, thesisId, 'Nom');
    const version = await createVersion(student, thesisId, deliverableId);
    const uploaded = await student.agent
      .post(filePath(thesisId, deliverableId, version.id))
      .set('x-csrf-token', student.csrf)
      .attach('file', pdf, { filename: '../../thesis\r\n.pdf', contentType: 'application/pdf' });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.originalName).toBe('thesis.pdf');
    const stored = await prisma.storedFile.findUniqueOrThrow({
      where: { deliverableVersionId: version.id },
    });
    expect(stored.storageKey).not.toContain('..');
    expect(stored.storageKey).not.toContain('\r');
    expect(stored.storageKey).not.toContain('thesis');
  });

  it('rejects an executable renamed as a PDF', async () => {
    const student = await register('nina');
    const thesisId = await createThesis(student, 'These signature');
    prefixes.push(`theses/${thesisId}/`);
    const deliverableId = await createDeliverable(student, thesisId, 'Signature');
    const version = await createVersion(student, thesisId, deliverableId);
    const rejected = await student.agent
      .post(filePath(thesisId, deliverableId, version.id))
      .set('x-csrf-token', student.csrf)
      .attach('file', Buffer.from([0x4d, 0x5a, 0x90, 0x00]), {
        filename: 'thesis.pdf',
        contentType: 'application/pdf',
      });
    expect(rejected.status).toBe(400);
    expect(rejected.body.code).toBe('FILE_SIGNATURE_MISMATCH');
    expect(await prisma.storedFile.count({ where: { deliverableVersionId: version.id } })).toBe(0);
  });

  it('deletes the object when the database insert fails', async () => {
    expect(storage.isReady()).toBe(true);
    const key = `theses/compensation/${randomUUID()}`;
    prefixes.push('theses/compensation/');
    await expect(
      commitAfterUpload({
        put: () =>
          storage.putObject({
            key,
            body: Readable.from(pdf),
            contentType: 'application/pdf',
            contentLength: pdf.length,
          }),
        insert: async () => {
          throw new Error('db down');
        },
        remove: () => storage.deleteObject(key),
      }),
    ).rejects.toThrow('db down');
    expect(await storage.objectExists(key)).toBe(false);
  });

  async function register(name: string) {
    const email = `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
    emails.push(email);
    const agent = request.agent(app.getHttpServer());
    const response = await agent.post('/api/v1/auth/register').send({
      email,
      password,
      givenName: name,
      familyName: 'Test',
    });
    expect(response.status).toBe(201);
    return { agent, email, csrf: csrfFrom(response), userId: response.body.user.id as string };
  }

  async function createThesis(
    account: { agent: request.Agent; csrf: string },
    title: string,
  ): Promise<string> {
    const response = await account.agent
      .post('/api/v1/theses')
      .set('x-csrf-token', account.csrf)
      .send({ title });
    expect(response.status).toBe(201);
    return response.body.id as string;
  }

  async function invite(
    account: { agent: request.Agent; csrf: string },
    thesisId: string,
    email: string,
  ) {
    await inviteSupervisor(prisma, account, thesisId, email);
  }

  async function createDeliverable(
    account: { agent: request.Agent; csrf: string },
    thesisId: string,
    title: string,
  ): Promise<string> {
    const response = await account.agent
      .post(`/api/v1/theses/${thesisId}/deliverables`)
      .set('x-csrf-token', account.csrf)
      .send({ title, type: 'THESIS_CHAPTER' });
    expect(response.status).toBe(201);
    return deliverableSchema.parse(response.body).id;
  }

  async function createVersion(
    account: { agent: request.Agent; csrf: string },
    thesisId: string,
    deliverableId: string,
  ) {
    const response = await account.agent
      .post(`/api/v1/theses/${thesisId}/deliverables/${deliverableId}/versions`)
      .set('x-csrf-token', account.csrf)
      .send({});
    expect(response.status).toBe(201);
    return deliverableVersionSchema.parse(response.body);
  }
});

function filePath(thesisId: string, deliverableId: string, versionId: string): string {
  return `/api/v1/theses/${thesisId}/deliverables/${deliverableId}/versions/${versionId}/file`;
}
