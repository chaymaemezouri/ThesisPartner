import type { INestApplication } from '@nestjs/common';
import {
  dashboardSchema,
  deliverableListSchema,
  deliverableSchema,
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

describe('deliverables', () => {
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

  it('creates a draft, filters it, and rejects a foreign objective', async () => {
    const student = await register('ada');
    const other = await register('bea');
    const supervisor = await register('noa');
    const thesisA = await createThesis(student, 'These A');
    const thesisB = await createThesis(other, 'These B');
    await invite(student, thesisA, supervisor.email);
    await invite(other, thesisB, supervisor.email);
    const objectiveA = await createObjective(supervisor, thesisA, 'Etat de l art');
    const objectiveB = await createObjective(supervisor, thesisB, 'Objectif B');

    const forced = await student.agent
      .post(`/api/v1/theses/${thesisA}/deliverables`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Avec statut', type: 'ARTICLE', status: 'VALIDATED' });
    expect(forced.status).toBe(400);

    const foreign = await student.agent
      .post(`/api/v1/theses/${thesisA}/deliverables`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Mauvais objectif', type: 'REPORT', objectiveId: objectiveB });
    expect(foreign.status).toBe(400);

    const created = await student.agent
      .post(`/api/v1/theses/${thesisA}/deliverables`)
      .set('x-csrf-token', student.csrf)
      .send({
        title: 'Chapitre 2 — Etat de l art',
        description: 'Revue des anomalies',
        type: 'THESIS_CHAPTER',
        objectiveId: objectiveA,
        dueDate: '2020-01-01',
      });
    expect(created.status).toBe(201);
    const deliverable = deliverableSchema.parse(created.body);
    expect(deliverable.status).toBe('DRAFT');
    expect(deliverable.isOverdue).toBe(true);
    expect(deliverable.objective?.id).toBe(objectiveA);
    expect(deliverable.createdBy.id).toBe(student.userId);

    const stored = await prisma.deliverable.findUnique({ where: { id: deliverable.id } });
    expect(stored?.status).toBe('DRAFT');
    expect(stored?.thesisId).toBe(thesisA);
    expect(stored?.type).toBe('THESIS_CHAPTER');

    expect((await other.agent.get(`/api/v1/theses/${thesisA}/deliverables`)).status).toBe(404);
    expect(
      (await other.agent.get(`/api/v1/theses/${thesisA}/deliverables/${deliverable.id}`)).status,
    ).toBe(404);
    expect(
      (await supervisor.agent.get(`/api/v1/theses/${thesisB}/deliverables/${deliverable.id}`))
        .status,
    ).toBe(404);
    expect((await supervisor.agent.get(`/api/v1/theses/${thesisA}/deliverables`)).status).toBe(200);

    const listed = deliverableListSchema.parse(
      (
        await student.agent.get(
          `/api/v1/theses/${thesisA}/deliverables?status=DRAFT&type=THESIS_CHAPTER&objectiveId=${objectiveA}&search=ANOMALIES`,
        )
      ).body,
    );
    expect(listed.deliverables.map((item) => item.id)).toEqual([deliverable.id]);
    expect(Object.keys(listed.deliverables[0] ?? {})).not.toContain('description');

    expect(
      (await student.agent.get(`/api/v1/theses/${thesisA}/deliverables?status=LATER`)).status,
    ).toBe(400);
    expect(
      (await student.agent.get(`/api/v1/theses/${thesisA}/deliverables?type=SLIDE`)).status,
    ).toBe(400);

    const supervisorCreate = await supervisor.agent
      .post(`/api/v1/theses/${thesisA}/deliverables`)
      .set('x-csrf-token', supervisor.csrf)
      .send({ title: 'Livrable encadrant', type: 'POSTER' });
    expect(supervisorCreate.status).toBe(201);

    const supervisorEdit = await supervisor.agent
      .patch(`/api/v1/theses/${thesisA}/deliverables/${deliverable.id}`)
      .set('x-csrf-token', supervisor.csrf)
      .send({ title: 'Correction encadrant' });
    expect(supervisorEdit.status).toBe(403);

    const renamed = await student.agent
      .patch(`/api/v1/theses/${thesisA}/deliverables/${deliverable.id}`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Chapitre 2 — Etat de l art revise' });
    expect(deliverableSchema.parse(renamed.body).title).toBe('Chapitre 2 — Etat de l art revise');

    const cancelled = await student.agent
      .patch(`/api/v1/theses/${thesisA}/deliverables/${deliverable.id}`)
      .set('x-csrf-token', student.csrf)
      .send({ status: 'CANCELLED' });
    expect(deliverableSchema.parse(cancelled.body).status).toBe('CANCELLED');
    expect(await prisma.deliverable.findUnique({ where: { id: deliverable.id } })).not.toBeNull();

    const audit = await prisma.auditLog.findMany({
      where: { entityId: deliverable.id },
      select: { action: true },
    });
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        'deliverable.created',
        'deliverable.objective_linked',
        'deliverable.updated',
        'deliverable.cancelled',
      ]),
    );
  });

  it('links an objective of the same thesis and rejects one from another thesis', async () => {
    const student = await register('camille');
    const other = await register('dalia');
    const supervisor = await register('noa');
    const thesisA = await createThesis(student, 'These Alpha');
    const thesisB = await createThesis(other, 'These Beta');
    await invite(student, thesisA, supervisor.email);
    await invite(other, thesisB, supervisor.email);
    const objectiveA = await createObjective(supervisor, thesisA, 'Objectif local');
    const objectiveB = await createObjective(supervisor, thesisB, 'Objectif etranger');

    const created = await student.agent
      .post(`/api/v1/theses/${thesisA}/deliverables`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Rapport annuel', type: 'REPORT' });
    expect(created.status).toBe(201);
    const deliverable = deliverableSchema.parse(created.body);
    expect(deliverable.objective).toBeNull();

    const linked = await student.agent
      .patch(`/api/v1/theses/${thesisA}/deliverables/${deliverable.id}`)
      .set('x-csrf-token', student.csrf)
      .send({ objectiveId: objectiveA });
    expect(deliverableSchema.parse(linked.body).objective?.id).toBe(objectiveA);

    const rejected = await student.agent
      .patch(`/api/v1/theses/${thesisA}/deliverables/${deliverable.id}`)
      .set('x-csrf-token', student.csrf)
      .send({ objectiveId: objectiveB });
    expect(rejected.status).toBe(400);
  });

  it('isolates deliverables across supervisors and theses', async () => {
    const studentA = await register('elsa');
    const studentB = await register('fiona');
    const supervisorX = await register('prof-x');
    const supervisorY = await register('prof-y');
    const supervisorZ = await register('prof-z');
    const admin = await register('admin');
    const thesisA = await createThesis(studentA, 'These A');
    const thesisB = await createThesis(studentB, 'These B');
    const adminThesis = await createThesis(admin, 'These Admin');
    await invite(studentA, thesisA, supervisorX.email);
    const secondSupervisor = await studentA.agent
      .post(`/api/v1/theses/${thesisA}/members`)
      .set('x-csrf-token', studentA.csrf)
      .send({ email: supervisorY.email, role: 'SUPERVISOR' });
    expect(secondSupervisor.status).toBe(409);
    await invite(studentB, thesisB, supervisorX.email);
    await prisma.thesisMembership.update({
      where: { thesisId_userId: { thesisId: adminThesis, userId: admin.userId } },
      data: { role: 'ADMIN' },
    });

    const createdA = await studentA.agent
      .post(`/api/v1/theses/${thesisA}/deliverables`)
      .set('x-csrf-token', studentA.csrf)
      .send({ title: 'Livrable A', type: 'ARTICLE' });
    const createdB = await studentB.agent
      .post(`/api/v1/theses/${thesisB}/deliverables`)
      .set('x-csrf-token', studentB.csrf)
      .send({ title: 'Livrable B', type: 'CODE' });
    const deliverableA = deliverableSchema.parse(createdA.body);
    const deliverableB = deliverableSchema.parse(createdB.body);

    const seenByX = deliverableListSchema.parse(
      (await supervisorX.agent.get(`/api/v1/theses/${thesisA}/deliverables`)).body,
    );
    expect(seenByX.deliverables.map((item) => item.id)).toEqual([deliverableA.id]);
    expect((await supervisorY.agent.get(`/api/v1/theses/${thesisA}/deliverables`)).status).toBe(
      404,
    );
    expect((await supervisorZ.agent.get(`/api/v1/theses/${thesisA}/deliverables`)).status).toBe(
      404,
    );
    expect((await admin.agent.get(`/api/v1/theses/${thesisA}/deliverables`)).status).toBe(404);

    const contextA = deliverableListSchema.parse(
      (await supervisorX.agent.get(`/api/v1/theses/${thesisA}/deliverables`)).body,
    );
    const contextB = deliverableListSchema.parse(
      (await supervisorX.agent.get(`/api/v1/theses/${thesisB}/deliverables`)).body,
    );
    expect(contextA.deliverables.map((item) => item.id)).toEqual([deliverableA.id]);
    expect(contextB.deliverables.map((item) => item.id)).toEqual([deliverableB.id]);
    expect(contextA.deliverables.map((item) => item.title)).not.toContain('Livrable B');
  });

  it('runs the submit / request-changes / resubmit / approve workflow', async () => {
    const student = await register('hugo');
    const supervisor = await register('lea');
    const outsider = await register('nina');
    const thesisId = await createThesis(student, 'These revue');
    const otherThesis = await createThesis(outsider, 'These hors perimetre');
    await invite(student, thesisId, supervisor.email);

    const created = await student.agent
      .post(`/api/v1/theses/${thesisId}/deliverables`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Chapitre a revoir', type: 'THESIS_CHAPTER' });
    expect(created.status).toBe(201);
    const deliverable = deliverableSchema.parse(created.body);
    const path = `/api/v1/theses/${thesisId}/deliverables/${deliverable.id}`;

    expect(
      (await student.agent.post(`${path}/submit`).set('x-csrf-token', student.csrf).send({})).status,
    ).toBe(400);

    const version1 = await student.agent
      .post(`${path}/versions`)
      .set('x-csrf-token', student.csrf)
      .send({ changeSummary: 'Premiere version' });
    expect(version1.status).toBe(201);

    const submitted = await student.agent
      .post(`${path}/submit`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(submitted.status).toBe(200);
    expect(deliverableSchema.parse(submitted.body)).toMatchObject({
      status: 'SUBMITTED',
      reviewMessage: null,
      reviewedBy: null,
    });
    expect(deliverableSchema.parse(submitted.body).submittedAt).toBeTruthy();

    expect(
      (
        await student.agent
          .patch(path)
          .set('x-csrf-token', student.csrf)
          .send({ title: 'Modification silencieuse' })
      ).status,
    ).toBe(400);
    expect(
      (
        await student.agent
          .post(`${path}/versions`)
          .set('x-csrf-token', student.csrf)
          .send({ changeSummary: 'Trop tot' })
      ).status,
    ).toBe(400);
    expect(
      (
        await student.agent
          .post(`${path}/approve`)
          .set('x-csrf-token', student.csrf)
          .send({})
      ).status,
    ).toBe(403);
    expect(
      (
        await outsider.agent
          .post(`${path}/request-changes`)
          .set('x-csrf-token', outsider.csrf)
          .send({ message: 'Intrusion' })
      ).status,
    ).toBe(404);
    expect(
      (
        await outsider.agent
          .post(`/api/v1/theses/${otherThesis}/deliverables/${deliverable.id}/approve`)
          .set('x-csrf-token', outsider.csrf)
          .send({})
      ).status,
    ).toBe(404);

    const changes = await supervisor.agent
      .post(`${path}/request-changes`)
      .set('x-csrf-token', supervisor.csrf)
      .send({ message: 'Preciser la methodologie' });
    expect(changes.status).toBe(200);
    const afterChanges = deliverableSchema.parse(changes.body);
    expect(afterChanges.status).toBe('CHANGES_REQUESTED');
    expect(afterChanges.reviewMessage).toBe('Preciser la methodologie');
    expect(afterChanges.reviewedBy?.id).toBe(supervisor.userId);

    expect(
      (
        await student.agent
          .post(`${path}/submit`)
          .set('x-csrf-token', student.csrf)
          .send({})
      ).status,
    ).toBe(400);

    const version2 = await student.agent
      .post(`${path}/versions`)
      .set('x-csrf-token', student.csrf)
      .send({ changeSummary: 'Methodologie precisee' });
    expect(version2.status).toBe(201);

    const resubmitted = await student.agent
      .post(`${path}/submit`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(resubmitted.status).toBe(200);
    expect(deliverableSchema.parse(resubmitted.body).status).toBe('SUBMITTED');
    expect(deliverableSchema.parse(resubmitted.body).reviewMessage).toBeNull();

    const approved = await supervisor.agent
      .post(`${path}/approve`)
      .set('x-csrf-token', supervisor.csrf)
      .send({});
    expect(approved.status).toBe(200);
    const validated = deliverableSchema.parse(approved.body);
    expect(validated.status).toBe('VALIDATED');
    expect(validated.reviewedBy?.id).toBe(supervisor.userId);

    expect(
      (
        await student.agent
          .patch(path)
          .set('x-csrf-token', student.csrf)
          .send({ title: 'Apres validation' })
      ).status,
    ).toBe(400);
    expect(
      (
        await student.agent
          .post(`${path}/versions`)
          .set('x-csrf-token', student.csrf)
          .send({ changeSummary: 'Apres validation' })
      ).status,
    ).toBe(400);
    expect(
      (
        await supervisor.agent
          .post(`${path}/request-changes`)
          .set('x-csrf-token', supervisor.csrf)
          .send({ message: 'Trop tard' })
      ).status,
    ).toBe(400);

    const versions = await student.agent.get(`${path}/versions`);
    expect(versions.status).toBe(200);
    expect(versions.body.versions).toHaveLength(2);

    const audit = await prisma.auditLog.findMany({
      where: { entityId: deliverable.id },
      select: { action: true },
    });
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        'deliverable.submitted',
        'deliverable.changes_requested',
        'deliverable.validated',
      ]),
    );
  });

  it('counts active deliverables on the dashboard and ignores cancelled ones', async () => {
    const student = await register('gina');
    const thesisId = await createThesis(student, 'These compteurs');
    const overdue = await student.agent
      .post(`/api/v1/theses/${thesisId}/deliverables`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Brouillon en retard', type: 'DATASET', dueDate: '2020-01-01' });
    const draft = await student.agent
      .post(`/api/v1/theses/${thesisId}/deliverables`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Brouillon ouvert', type: 'PRESENTATION', dueDate: '2099-01-01' });
    const validated = await student.agent
      .post(`/api/v1/theses/${thesisId}/deliverables`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Deja valide', type: 'POSTER', dueDate: '2020-01-01' });
    const cancelled = await student.agent
      .post(`/api/v1/theses/${thesisId}/deliverables`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Annule', type: 'OTHER' });
    await prisma.deliverable.update({
      where: { id: deliverableSchema.parse(validated.body).id },
      data: { status: 'VALIDATED' },
    });
    await prisma.deliverable.update({
      where: { id: deliverableSchema.parse(cancelled.body).id },
      data: { status: 'CANCELLED' },
    });

    const dashboard = dashboardSchema.parse((await student.agent.get('/api/v1/dashboard')).body);
    expect(dashboard.deliverables).toEqual({
      total: 3,
      draft: 2,
      submitted: 0,
      changesRequested: 0,
      validated: 1,
      overdue: 1,
    });
    expect(deliverableSchema.parse(overdue.body).isOverdue).toBe(true);
    expect(deliverableSchema.parse(draft.body).isOverdue).toBe(false);
    expect(
      dashboard.upcomingDeadlines.some(
        (item) => item.kind === 'DELIVERABLE' && item.title === 'Brouillon ouvert',
      ),
    ).toBe(true);
    expect(dashboard.upcomingDeadlines.some((item) => item.title === 'Annule')).toBe(false);
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
});
