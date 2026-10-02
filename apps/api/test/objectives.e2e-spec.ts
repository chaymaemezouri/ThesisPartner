import type { INestApplication } from '@nestjs/common';
import {
  dashboardSchema,
  objectiveListSchema,
  objectiveSchema,
  supervisedThesisListSchema,
} from '@thesispartner/validation';
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

describe('objectives and supervision', () => {
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

  it('isolates objectives and lets the doctoral student and the supervisor manage the same ones', async () => {
    const student = await register('ada');
    const other = await register('bea');
    const supervisor = await register('noa');
    const thesisA = await createThesis(student, 'These A');
    const thesisB = await createThesis(other, 'These B');
    await invite(student, thesisA, supervisor.email);

    const studentCreated = await student.agent
      .post(`/api/v1/theses/${thesisA}/objectives`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Note doctorant', status: 'PLANNED' });
    expect(studentCreated.status).toBe(201);
    expect(objectiveSchema.parse(studentCreated.body).origin).toBe('DOCTORAL_STUDENT');

    const missing = await supervisor.agent
      .post(`/api/v1/theses/${thesisB}/objectives`)
      .set('x-csrf-token', supervisor.csrf)
      .send({ title: 'Hors these' });
    expect(missing.status).toBe(404);

    const created = await supervisor.agent
      .post(`/api/v1/theses/${thesisA}/objectives`)
      .set('x-csrf-token', supervisor.csrf)
      .send({
        title: 'Etat de l art',
        description: 'Methodologie documentaire',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2020-01-01',
        progress: 70,
        responsibleUserId: student.userId,
      });
    expect(created.status).toBe(201);
    const objective = objectiveSchema.parse(created.body);
    expect(objective.isOverdue).toBe(true);
    expect(objective.progress).toBe(70);
    expect(objective.origin).toBe('SUPERVISOR');
    expect(objective.responsible?.id).toBe(student.userId);

    const outsider = await other.agent.get(`/api/v1/theses/${thesisA}/objectives`);
    expect(outsider.status).toBe(404);
    const wrongThesis = await supervisor.agent.get(
      `/api/v1/theses/${thesisB}/objectives/${objective.id}`,
    );
    expect(wrongThesis.status).toBe(404);

    const listed = objectiveListSchema.parse(
      (await student.agent.get(`/api/v1/theses/${thesisA}/objectives`)).body,
    );
    expect(listed.objectives.map((item) => item.id)).toContain(objective.id);
    expect(listed.objectives.map((item) => item.id)).toContain(
      objectiveSchema.parse(studentCreated.body).id,
    );
    expect(listed.objectives).toHaveLength(10);

    const byStatus = await student.agent.get(
      `/api/v1/theses/${thesisA}/objectives?status=IN_PROGRESS&priority=HIGH&overdue=true&search=methodologie`,
    );
    expect(byStatus.status).toBe(200);
    expect(objectiveListSchema.parse(byStatus.body).objectives).toHaveLength(1);

    const invalid = await student.agent.get(`/api/v1/theses/${thesisA}/objectives?status=LATER`);
    expect(invalid.status).toBe(400);

    const badProgress = await supervisor.agent
      .post(`/api/v1/theses/${thesisA}/objectives`)
      .set('x-csrf-token', supervisor.csrf)
      .send({ title: 'Trop', progress: 140 });
    expect(badProgress.status).toBe(400);

    const badDates = await supervisor.agent
      .post(`/api/v1/theses/${thesisA}/objectives`)
      .set('x-csrf-token', supervisor.csrf)
      .send({ title: 'Dates', startDate: '2026-05-02', dueDate: '2026-05-01' });
    expect(badDates.status).toBe(400);

    const badResponsible = await supervisor.agent
      .post(`/api/v1/theses/${thesisA}/objectives`)
      .set('x-csrf-token', supervisor.csrf)
      .send({ title: 'Externe', responsibleUserId: other.userId });
    expect(badResponsible.status).toBe(400);

    const completed = await supervisor.agent
      .patch(`/api/v1/theses/${thesisA}/objectives/${objective.id}`)
      .set('x-csrf-token', supervisor.csrf)
      .send({ status: 'COMPLETED', progress: 10 });
    expect(completed.status).toBe(200);
    const done = objectiveSchema.parse(completed.body);
    expect(done.progress).toBe(100);
    expect(done.completedAt).toEqual(expect.any(String));
    expect(done.isOverdue).toBe(false);

    const reopened = await supervisor.agent
      .patch(`/api/v1/theses/${thesisA}/objectives/${objective.id}`)
      .set('x-csrf-token', supervisor.csrf)
      .send({ status: 'IN_PROGRESS', progress: 80 });
    expect(objectiveSchema.parse(reopened.body).completedAt).toBeNull();

    const dashboard = dashboardSchema.parse((await student.agent.get('/api/v1/dashboard')).body);
    expect(dashboard.objectives).toEqual({
      total: 10,
      planned: 8,
      inProgress: 2,
      completed: 0,
      overdue: 1,
    });
    expect(dashboard.upcomingDeadlines.some((item) => item.kind === 'OBJECTIVE')).toBe(true);
    expect(
      dashboard.recentActivity.some(
        (item) =>
          item.type === 'OBJECTIVE_CREATED' ||
          item.type === 'OBJECTIVE_UPDATED' ||
          item.type === 'OBJECTIVE_COMPLETED',
      ),
    ).toBe(true);
  });

  it('returns only the theses a supervisor belongs to and rejects a second supervisor', async () => {
    const studentA = await register('camille');
    const studentB = await register('dalia');
    const studentC = await register('elsa');
    const supervisorX = await register('prof-x');
    const supervisorY = await register('prof-y');
    const supervisorZ = await register('prof-z');
    const thesisA = await createThesis(studentA, 'These Alpha');
    const thesisB = await createThesis(studentB, 'These Beta');
    const thesisC = await createThesis(studentC, 'These Gamma');
    await invite(studentA, thesisA, supervisorX.email);
    const secondSupervisor = await studentA.agent
      .post(`/api/v1/theses/${thesisA}/members`)
      .set('x-csrf-token', studentA.csrf)
      .send({ email: supervisorY.email, role: 'SUPERVISOR' });
    expect(secondSupervisor.status).toBe(409);
    await invite(studentB, thesisB, supervisorX.email);

    const supervised = supervisedThesisListSchema.parse(
      (await supervisorX.agent.get('/api/v1/supervision/theses')).body,
    );
    const ids = supervised.theses.map((item) => item.thesisId).sort();
    expect(ids).toEqual([thesisA, thesisB].sort());
    expect(supervised.theses.find((item) => item.thesisId === thesisA)?.doctoralStudent?.id).toBe(
      studentA.userId,
    );
    expect(ids).not.toContain(thesisC);

    const created = await supervisorX.agent
      .post(`/api/v1/theses/${thesisA}/objectives`)
      .set('x-csrf-token', supervisorX.csrf)
      .send({ title: 'Revue', status: 'PLANNED' });
    expect(created.status).toBe(201);

    expect((await supervisorY.agent.get(`/api/v1/theses/${thesisA}/objectives`)).status).toBe(404);
    expect((await supervisorX.agent.get(`/api/v1/theses/${thesisB}/objectives`)).status).toBe(200);
    expect((await supervisorX.agent.get(`/api/v1/theses/${thesisC}/objectives`)).status).toBe(404);
    expect((await supervisorZ.agent.get(`/api/v1/theses/${thesisA}/objectives`)).status).toBe(404);
    expect(
      (
        await supervisorZ.agent
          .patch(`/api/v1/theses/${thesisA}/objectives/${created.body.id}`)
          .set('x-csrf-token', supervisorZ.csrf)
          .send({ title: 'Intrusion' })
      ).status,
    ).toBe(404);

    const empty = dashboardSchema.parse((await studentB.agent.get('/api/v1/dashboard')).body);
    expect(empty.objectives).toEqual({
      total: 8,
      planned: 7,
      inProgress: 1,
      completed: 0,
      overdue: 0,
    });
    expect(empty.workProgress.percentage).toBe(0);
  });

  it('seeds the doctoral path once and never writes a personalised objective back to the template', async () => {
    const student = await register('path');
    const outsider = await register('outsider');
    const thesisId = await createThesis(student, 'These parcours');
    expect(await prisma.objectiveTemplate.count()).toBe(8);

    const listed = objectiveListSchema.parse(
      (await student.agent.get(`/api/v1/theses/${thesisId}/objectives`)).body,
    );
    expect(listed.objectives).toHaveLength(8);
    const first = listed.objectives.find(
      (item) => item.title === 'Définir la problématique de recherche',
    );
    expect(first?.status).toBe('IN_PROGRESS');
    expect(first?.origin).toBe('STANDARD_TEMPLATE');
    expect(first?.dueDate).toBeNull();
    const planned = listed.objectives.filter((item) => item.status === 'PLANNED');
    expect(planned).toHaveLength(7);
    const steps = await prisma.task.count({ where: { objectiveId: first?.id } });
    expect(steps).toBe(7);

    const applied = await student.agent.get(`/api/v1/theses/${thesisId}/standard-path`);
    expect(applied.body).toEqual({ applied: true });
    const repeat = await student.agent
      .post(`/api/v1/theses/${thesisId}/standard-path`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual({ applied: true, created: 0 });

    const hidden = await outsider.agent.get(`/api/v1/theses/${thesisId}/standard-path`);
    expect(hidden.status).toBe(404);

    await prisma.task.deleteMany({ where: { objective: { thesisId } } });
    await prisma.objective.deleteMany({ where: { thesisId } });
    const missing = await student.agent.get(`/api/v1/theses/${thesisId}/standard-path`);
    expect(missing.body).toEqual({ applied: false });
    const restored = await student.agent
      .post(`/api/v1/theses/${thesisId}/standard-path`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(restored.body).toEqual({ applied: true, created: 8 });
    const again = await student.agent
      .post(`/api/v1/theses/${thesisId}/standard-path`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(again.body.created).toBe(0);
    expect(
      objectiveListSchema.parse(
        (await student.agent.get(`/api/v1/theses/${thesisId}/objectives`)).body,
      ).objectives,
    ).toHaveLength(8);

    const templateBefore = await prisma.objectiveTemplate.findUniqueOrThrow({
      where: { code: 'ETAT_ART' },
    });
    const current = objectiveListSchema.parse(
      (await student.agent.get(`/api/v1/theses/${thesisId}/objectives`)).body,
    );
    const editable = current.objectives[0];
    const renamed = await student.agent
      .patch(`/api/v1/theses/${thesisId}/objectives/${editable!.id}`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Titre personnalise' });
    expect(renamed.status).toBe(200);
    const templateAfter = await prisma.objectiveTemplate.findUniqueOrThrow({
      where: { code: 'ETAT_ART' },
    });
    expect(templateAfter.title).toBe(templateBefore.title);
    expect(templateAfter.title).toBe('Construire l’état de l’art');
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
});
