import type { INestApplication } from '@nestjs/common';
import { remarkListSchema, remarkSchema } from '@thesispartner/validation';
import request from 'supertest';
import { createApp } from '../src/app.factory';
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

describe('remarks', () => {
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
    await prisma.remarkReply.deleteMany({
      where: { remark: { thesisId: { in: thesisIds } } },
    });
    await prisma.remark.deleteMany({ where: { thesisId: { in: thesisIds } } });
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

  it('runs create → reply → resolve → close → reopen with isolation', async () => {
    const studentA = await register('ada');
    const studentB = await register('bea');
    const supervisor = await register('noa');
    const otherSupervisor = await register('marc');
    const outsider = await register('zoe');
    const thesisA = await createThesis(studentA, 'These Ada');
    const thesisB = await createThesis(studentB, 'These Bea');
    await invite(studentA, thesisA, supervisor.email);
    await invite(studentB, thesisB, supervisor.email);

    const second = await studentA.agent
      .post(`/api/v1/theses/${thesisA}/members`)
      .set('x-csrf-token', studentA.csrf)
      .send({ email: otherSupervisor.email, role: 'SUPERVISOR' });
    expect(second.status).toBe(409);

    const objective = await createObjective(supervisor, thesisA, 'Etat de l art');
    const foreignObjective = await createObjective(supervisor, thesisB, 'Objectif B');
    const deliverable = await createDeliverable(studentA, thesisA, 'Chapitre 1');
    const version = await studentA.agent
      .post(`/api/v1/theses/${thesisA}/deliverables/${deliverable}/versions`)
      .set('x-csrf-token', studentA.csrf)
      .send({ changeSummary: 'Premiere version' });
    expect(version.status).toBe(201);
    const versionId = version.body.id as string;

    expect(
      (
        await studentA.agent
          .post(`/api/v1/theses/${thesisA}/remarks`)
          .set('x-csrf-token', studentA.csrf)
          .send({ title: 'Refuse', message: 'Le doctorant ne cree pas' })
      ).status,
    ).toBe(403);

    const foreignTarget = await supervisor.agent
      .post(`/api/v1/theses/${thesisA}/remarks`)
      .set('x-csrf-token', supervisor.csrf)
      .send({
        title: 'Mauvaise cible',
        message: 'Objectif etranger',
        objectiveId: foreignObjective,
      });
    expect(foreignTarget.status).toBe(400);

    const created = await supervisor.agent
      .post(`/api/v1/theses/${thesisA}/remarks`)
      .set('x-csrf-token', supervisor.csrf)
      .send({
        title: 'Preciser la methodologie',
        message: 'Ajoutez les limites de l etude.',
        priority: 'HIGH',
        objectiveId: objective,
        deliverableId: deliverable,
        deliverableVersionId: versionId,
        location: 'p. 12 — section 2.1',
      });
    expect(created.status).toBe(201);
    const remark = remarkSchema.parse(created.body);
    expect(remark.status).toBe('OPEN');
    expect(remark.priority).toBe('HIGH');
    expect(remark.target.kind).toBe('DELIVERABLE_VERSION');
    expect(remark.location).toBe('p. 12 — section 2.1');

    const seenByStudent = remarkListSchema.parse(
      (await studentA.agent.get(`/api/v1/theses/${thesisA}/remarks`)).body,
    );
    expect(seenByStudent.remarks.map((item) => item.id)).toEqual([remark.id]);
    expect((await studentB.agent.get(`/api/v1/theses/${thesisA}/remarks`)).status).toBe(404);
    expect((await outsider.agent.get(`/api/v1/theses/${thesisA}/remarks`)).status).toBe(404);
    expect((await otherSupervisor.agent.get(`/api/v1/theses/${thesisA}/remarks`)).status).toBe(404);

    const path = `/api/v1/theses/${thesisA}/remarks/${remark.id}`;
    const replied = await studentA.agent
      .post(`${path}/replies`)
      .set('x-csrf-token', studentA.csrf)
      .send({ message: 'Je corrige dans V2.' });
    expect(replied.status).toBe(201);
    expect(remarkSchema.parse(replied.body).status).toBe('IN_PROGRESS');
    expect(remarkSchema.parse(replied.body).replies).toHaveLength(1);

    const version2 = await studentA.agent
      .post(`/api/v1/theses/${thesisA}/deliverables/${deliverable}/versions`)
      .set('x-csrf-token', studentA.csrf)
      .send({ changeSummary: 'Limites ajoutees' });
    expect(version2.status).toBe(201);

    const resolved = await studentA.agent
      .post(`${path}/resolve`)
      .set('x-csrf-token', studentA.csrf)
      .send({ correctionVersionId: version2.body.id });
    expect(resolved.status).toBe(200);
    const afterResolve = remarkSchema.parse(resolved.body);
    expect(afterResolve.status).toBe('RESOLVED');
    expect(afterResolve.correctionVersion?.versionNumber).toBe(2);

    expect(
      (await studentA.agent.post(`${path}/close`).set('x-csrf-token', studentA.csrf).send({}))
        .status,
    ).toBe(403);

    const closed = await supervisor.agent
      .post(`${path}/close`)
      .set('x-csrf-token', supervisor.csrf)
      .send({});
    expect(closed.status).toBe(200);
    expect(remarkSchema.parse(closed.body).status).toBe('CLOSED');

    const reopened = await supervisor.agent
      .post(`${path}/reopen`)
      .set('x-csrf-token', supervisor.csrf)
      .send({});
    expect(reopened.status).toBe(200);
    expect(remarkSchema.parse(reopened.body).status).toBe('OPEN');

    const supervisedA = remarkListSchema.parse(
      (await supervisor.agent.get(`/api/v1/theses/${thesisA}/remarks`)).body,
    );
    const supervisedB = remarkListSchema.parse(
      (await supervisor.agent.get(`/api/v1/theses/${thesisB}/remarks`)).body,
    );
    expect(supervisedA.remarks.map((item) => item.id)).toEqual([remark.id]);
    expect(supervisedB.remarks).toEqual([]);

    const audit = await prisma.auditLog.findMany({
      where: { entityId: remark.id },
      select: { action: true },
    });
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        'remark.created',
        'remark.replied',
        'remark.resolved',
        'remark.closed',
        'remark.reopened',
      ]),
    );
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
    const response = await account.agent
      .post(`/api/v1/theses/${thesisId}/members`)
      .set('x-csrf-token', account.csrf)
      .send({ email, role: 'SUPERVISOR' });
    expect(response.status).toBe(201);
  }

  async function createObjective(
    account: { agent: request.Agent; csrf: string },
    thesisId: string,
    title: string,
  ): Promise<string> {
    const response = await account.agent
      .post(`/api/v1/theses/${thesisId}/objectives`)
      .set('x-csrf-token', account.csrf)
      .send({ title });
    expect(response.status).toBe(201);
    return response.body.id as string;
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
    return response.body.id as string;
  }
});
