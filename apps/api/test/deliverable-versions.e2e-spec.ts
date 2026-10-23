import type { INestApplication } from '@nestjs/common';
import {
  dashboardSchema,
  deliverableListSchema,
  deliverableSchema,
  deliverableVersionListSchema,
  deliverableVersionSchema,
} from '@thesispartner/validation';
import request from 'supertest';
import { createApp } from '../src/app.factory';
import { inviteSupervisor } from './helpers/invite-supervisor';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

const password = 'phrase-secrete-12';

function csrfFrom(response: request.Response): string {
  const header = response.headers['set-cookie'];
  const lines = Array.isArray(header) ? header : header ? [header] : [];
  const line = lines.find((item) => item.startsWith('tp_csrf='));
  const pair = line?.split(';')[0];
  if (!pair) throw new Error('missing csrf cookie');
  return decodeURIComponent(pair.slice('tp_csrf='.length));
}

describe('deliverable versions', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const emails: string[] = [];

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
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

  it('numbers versions from 1, keeps them immutable, and summarizes the deliverable', async () => {
    const student = await register('ada');
    const thesisId = await createThesis(student, 'These versions');
    const deliverableId = await createDeliverable(student, thesisId, 'Chapitre methodologie');
    const path = `/api/v1/theses/${thesisId}/deliverables/${deliverableId}/versions`;

    const rejectedNumber = await student.agent
      .post(path)
      .set('x-csrf-token', student.csrf)
      .send({ changeSummary: 'Ignore', versionNumber: 9 });
    expect(rejectedNumber.status).toBe(400);

    const first = await student.agent.post(path).set('x-csrf-token', student.csrf).send({});
    expect(first.status).toBe(201);
    const v1 = deliverableVersionSchema.parse(first.body);
    expect(v1.versionNumber).toBe(1);
    expect(v1.changeSummary).toBeNull();
    expect(v1.title).toBeNull();
    expect(v1.createdBy.givenName).toBe('ada');

    const missingSummary = await student.agent
      .post(path)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(missingSummary.status).toBe(400);

    const second = await student.agent
      .post(path)
      .set('x-csrf-token', student.csrf)
      .send({ changeSummary: 'Ajout methodologie' });
    expect(second.status).toBe(201);
    expect(deliverableVersionSchema.parse(second.body).versionNumber).toBe(2);

    const third = await student.agent
      .post(path)
      .set('x-csrf-token', student.csrf)
      .send({ changeSummary: 'Corrections', title: 'Annexe courte' });
    expect(third.status).toBe(201);
    const v3 = deliverableVersionSchema.parse(third.body);
    expect(v3.versionNumber).toBe(3);
    expect(v3.title).toBe('Annexe courte');

    const listed = deliverableVersionListSchema.parse((await student.agent.get(path)).body);
    expect(listed.versions.map((item) => item.versionNumber)).toEqual([3, 2, 1]);

    const detail = deliverableVersionSchema.parse(
      (await student.agent.get(`${path}/${v1.id}`)).body,
    );
    expect(detail.versionNumber).toBe(1);
    expect(detail.changeSummary).toBeNull();

    const deliverable = deliverableSchema.parse(
      (await student.agent.get(`/api/v1/theses/${thesisId}/deliverables/${deliverableId}`)).body,
    );
    expect(deliverable.versionsSummary).toEqual({
      count: 3,
      latestVersionNumber: 3,
      latestVersionCreatedAt: v3.createdAt,
    });

    const list = deliverableListSchema.parse(
      (await student.agent.get(`/api/v1/theses/${thesisId}/deliverables`)).body,
    );
    expect(list.deliverables[0]).toMatchObject({ versionCount: 3, latestVersionNumber: 3 });

    const stored = await prisma.deliverableVersion.findMany({
      where: { deliverableId },
      orderBy: { versionNumber: 'asc' },
    });
    expect(stored.map((item) => item.versionNumber)).toEqual([1, 2, 3]);
    expect(stored[0]?.changeSummary).toBeNull();

    expect(
      (
        await student.agent
          .patch(`${path}/${v1.id}`)
          .set('x-csrf-token', student.csrf)
          .send({ changeSummary: 'Modifiee' })
      ).status,
    ).toBe(404);
    expect(
      (await student.agent.delete(`${path}/${v1.id}`).set('x-csrf-token', student.csrf)).status,
    ).toBe(404);

    const still = await prisma.deliverableVersion.findUnique({ where: { id: v1.id } });
    expect(still?.versionNumber).toBe(1);
    expect(still?.changeSummary).toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: v3.id, action: 'deliverable.version_created' },
    });
    expect(audit?.metadata).toEqual({
      deliverableId,
      versionId: v3.id,
      versionNumber: 3,
    });

    const dashboard = dashboardSchema.parse((await student.agent.get('/api/v1/dashboard')).body);
    const event = dashboard.recentActivity.find(
      (item) => item.type === 'DELIVERABLE_VERSION_CREATED',
    );
    expect(event?.message).toBe('Nouvelle version V3 ajoutée à « Chapitre methodologie »');
    expect(JSON.stringify(event)).not.toContain(v3.id);
    expect(JSON.stringify(event)).not.toContain('requestId');
  });

  it('rejects closed deliverables, allows supervisor drafts, and keeps concurrent numbers unique', async () => {
    const student = await register('bea');
    const supervisor = await register('noa');
    const thesisId = await createThesis(student, 'These fermee');
    await invite(student, thesisId, supervisor.email);
    const draftId = await createDeliverable(student, thesisId, 'Brouillon concurrent');
    const attachId = await createDeliverable(student, thesisId, 'Brouillon encadrant');
    const validatedId = await createDeliverable(student, thesisId, 'Deja valide');
    const cancelledId = await createDeliverable(student, thesisId, 'Deja annule');
    await prisma.deliverable.update({ where: { id: validatedId }, data: { status: 'VALIDATED' } });
    await prisma.deliverable.update({ where: { id: cancelledId }, data: { status: 'CANCELLED' } });

    expect(
      (
        await student.agent
          .post(`/api/v1/theses/${thesisId}/deliverables/${validatedId}/versions`)
          .set('x-csrf-token', student.csrf)
          .send({ changeSummary: 'Trop tard' })
      ).status,
    ).toBe(400);
    expect(
      (
        await student.agent
          .post(`/api/v1/theses/${thesisId}/deliverables/${cancelledId}/versions`)
          .set('x-csrf-token', student.csrf)
          .send({ changeSummary: 'Trop tard' })
      ).status,
    ).toBe(400);
    expect(
      (
        await supervisor.agent
          .post(`/api/v1/theses/${thesisId}/deliverables/${attachId}/versions`)
          .set('x-csrf-token', supervisor.csrf)
          .send({ changeSummary: 'Encadrant' })
      ).status,
    ).toBe(201);
    expect(
      (await supervisor.agent.get(`/api/v1/theses/${thesisId}/deliverables/${attachId}/versions`))
        .status,
    ).toBe(200);

    const path = `/api/v1/theses/${thesisId}/deliverables/${draftId}/versions`;
    const [left, right] = await Promise.all([
      student.agent
        .post(path)
        .set('x-csrf-token', student.csrf)
        .send({ changeSummary: 'Parallele A' }),
      student.agent
        .post(path)
        .set('x-csrf-token', student.csrf)
        .send({ changeSummary: 'Parallele B' }),
    ]);
    expect([left.status, right.status].sort()).toEqual([201, 201]);
    const numbers = [left.body.versionNumber, right.body.versionNumber].sort();
    expect(numbers).toEqual([1, 2]);
    const stored = await prisma.deliverableVersion.findMany({
      where: { deliverableId: draftId },
      orderBy: { versionNumber: 'asc' },
    });
    expect(stored.map((item) => item.versionNumber)).toEqual([1, 2]);
    expect(new Set(stored.map((item) => item.versionNumber)).size).toBe(2);
  });

  it('hides a version outside its deliverable and its thesis', async () => {
    const studentA = await register('elsa');
    const studentB = await register('fiona');
    const supervisorX = await register('prof-x');
    const supervisorY = await register('prof-y');
    const thesisA = await createThesis(studentA, 'These A');
    const thesisB = await createThesis(studentB, 'These B');
    await invite(studentA, thesisA, supervisorX.email);
    await invite(studentB, thesisB, supervisorY.email);
    const deliverableA = await createDeliverable(studentA, thesisA, 'Livrable A');
    const deliverableB = await createDeliverable(studentB, thesisB, 'Livrable B');
    const created = await studentA.agent
      .post(`/api/v1/theses/${thesisA}/deliverables/${deliverableA}/versions`)
      .set('x-csrf-token', studentA.csrf)
      .send({ changeSummary: 'Premiere version' });
    const version = deliverableVersionSchema.parse(created.body);

    expect(
      (
        await studentB.agent.get(
          `/api/v1/theses/${thesisA}/deliverables/${deliverableA}/versions/${version.id}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await supervisorY.agent.get(
          `/api/v1/theses/${thesisA}/deliverables/${deliverableA}/versions`,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await supervisorX.agent.get(
          `/api/v1/theses/${thesisA}/deliverables/${deliverableA}/versions/${version.id}`,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await studentA.agent.get(
          `/api/v1/theses/${thesisA}/deliverables/${deliverableB}/versions/${version.id}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await studentA.agent.get(
          `/api/v1/theses/${thesisB}/deliverables/${deliverableA}/versions/${version.id}`,
        )
      ).status,
    ).toBe(404);
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
});
