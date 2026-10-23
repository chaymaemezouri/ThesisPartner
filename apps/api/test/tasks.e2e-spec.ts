import type { INestApplication } from '@nestjs/common';
import { objectiveSchema, taskListSchema, taskSchema } from '@thesispartner/validation';
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

describe('objective tasks and completion', () => {
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

  it('raises progress by finished tasks and completes only after approval', async () => {
    const student = await register('ada');
    const supervisor = await register('noa');
    const thesisId = await createThesis(student, 'These taches');
    await invite(student, thesisId, supervisor.email);
    const objective = await createObjective(supervisor, thesisId, 0);
    const titles = ['Rechercher', 'Lire', 'Rediger', 'Valider'];
    const tasks = [];
    for (const title of titles)
      tasks.push(await createTask(supervisor, thesisId, objective.id, title));

    for (const [index, task] of tasks.entries()) {
      const updated = taskSchema.parse(
        (
          await student.agent
            .patch(taskUrl(thesisId, objective.id, task.id))
            .set('x-csrf-token', student.csrf)
            .send({ status: 'DONE' })
        ).body,
      );
      expect(updated.completedAt).toEqual(expect.any(String));
      const current = await readObjective(student, thesisId, objective.id);
      expect(current.progress).toBe((index + 1) * 25);
      expect(current.progressMode).toBe('TASK_BASED');
      expect(current.status).not.toBe('COMPLETED');
      if (index === 2) {
        const tooSoon = await student.agent
          .post(`${objectiveUrl(thesisId, objective.id)}/request-completion`)
          .set('x-csrf-token', student.csrf)
          .send({});
        expect(tooSoon.status).toBe(400);
        expect(tooSoon.body.code).toBe('COMPLETION_NOT_READY');
      }
    }

    const asked = await student.agent
      .post(`${objectiveUrl(thesisId, objective.id)}/request-completion`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(asked.status).toBe(200);

    const pending = objectiveSchema.parse(asked.body);
    expect(pending.completionReview.status).toBe('PENDING');
    expect(pending.status).toBe('IN_PROGRESS');
    expect(pending.progress).toBe(100);

    const reordered = await supervisor.agent
      .patch(`${tasksUrl(thesisId, objective.id)}/reorder`)
      .set('x-csrf-token', supervisor.csrf)
      .send({
        tasks: tasks.map((task, index) => ({
          taskId: task.id,
          position: tasks.length - index,
        })),
      });
    expect(reordered.status).toBe(200);
    expect((await readObjective(student, thesisId, objective.id)).completionReview.status).toBe(
      'PENDING',
    );

    const edited = await supervisor.agent
      .patch(taskUrl(thesisId, objective.id, tasks[0]!.id))
      .set('x-csrf-token', supervisor.csrf)
      .send({ title: 'Rechercher encore' });
    expect(edited.status).toBe(200);
    const reset = await readObjective(student, thesisId, objective.id);
    expect(reset.completionReview.status).toBe('NOT_REQUESTED');
    expect(reset.progress).toBe(100);

    const requested = objectiveSchema.parse(
      (
        await student.agent
          .post(`${objectiveUrl(thesisId, objective.id)}/request-completion`)
          .set('x-csrf-token', student.csrf)
          .send({})
      ).body,
    );
    expect(requested.completionReview.status).toBe('PENDING');

    const forbidden = await student.agent
      .post(`${objectiveUrl(thesisId, objective.id)}/approve-completion`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(forbidden.status).toBe(403);

    const approved = objectiveSchema.parse(
      (
        await supervisor.agent
          .post(`${objectiveUrl(thesisId, objective.id)}/approve-completion`)
          .set('x-csrf-token', supervisor.csrf)
          .send({})
      ).body,
    );
    expect(approved.status).toBe('COMPLETED');
    expect(approved.progress).toBe(100);
    expect(approved.completedAt).toEqual(expect.any(String));
    expect(approved.completionReview.status).toBe('APPROVED');
    expect(approved.completionReview.validatedAt).toEqual(expect.any(String));
    expect(approved.completionReview.validatedByName).toContain('noa');

    const locked = await student.agent
      .patch(`${objectiveUrl(thesisId, objective.id)}`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Apres validation' });
    expect(locked.status).toBe(403);

    const stored = await prisma.objective.findUniqueOrThrow({ where: { id: objective.id } });
    expect(stored.validatedById).toBe(supervisor.userId);
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: objective.id, action: 'objective.completion_approved' },
    });
    expect(audit).not.toBeNull();
  });

  it('drops the review when work resumes and accepts a later approval', async () => {
    const student = await register('bea');
    const supervisor = await register('leo');
    const thesisId = await createThesis(student, 'These reprise');
    await invite(student, thesisId, supervisor.email);
    const objective = await createObjective(supervisor, thesisId, 40);
    const first = await createTask(supervisor, thesisId, objective.id, 'Brouillon');
    const second = await createTask(supervisor, thesisId, objective.id, 'Relecture');
    await markDone(student, thesisId, objective.id, first.id);
    await markDone(student, thesisId, objective.id, second.id);

    const requested = await student.agent
      .post(`${objectiveUrl(thesisId, objective.id)}/request-completion`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(requested.status).toBe(200);

    const changes = objectiveSchema.parse(
      (
        await supervisor.agent
          .post(`${objectiveUrl(thesisId, objective.id)}/request-changes`)
          .set('x-csrf-token', supervisor.csrf)
          .send({ message: 'Ajouter une source' })
      ).body,
    );
    expect(changes.status).toBe('IN_PROGRESS');
    expect(changes.completionReview.status).toBe('CHANGES_REQUESTED');
    expect(changes.completionReview.message).toBe('Ajouter une source');

    const resumed = taskSchema.parse(
      (
        await student.agent
          .patch(taskUrl(thesisId, objective.id, second.id))
          .set('x-csrf-token', student.csrf)
          .send({ status: 'IN_PROGRESS' })
      ).body,
    );
    expect(resumed.completedAt).toBeNull();
    const dropped = await readObjective(student, thesisId, objective.id);
    expect(dropped.progress).toBe(50);
    expect(dropped.completionReview.status).toBe('NOT_REQUESTED');

    const rejected = await student.agent
      .post(`${objectiveUrl(thesisId, objective.id)}/request-completion`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(rejected.status).toBe(400);
    expect(rejected.body.code).toBe('COMPLETION_NOT_READY');

    await markDone(student, thesisId, objective.id, second.id);
    const again = await student.agent
      .post(`${objectiveUrl(thesisId, objective.id)}/request-completion`)
      .set('x-csrf-token', student.csrf)
      .send({});
    expect(again.status).toBe(200);
    const approved = await supervisor.agent
      .post(`${objectiveUrl(thesisId, objective.id)}/approve-completion`)
      .set('x-csrf-token', supervisor.csrf)
      .send({});
    expect(objectiveSchema.parse(approved.body).status).toBe('COMPLETED');

    const cancelled = await supervisor.agent
      .patch(taskUrl(thesisId, objective.id, first.id))
      .set('x-csrf-token', supervisor.csrf)
      .send({ status: 'CANCELLED' });
    expect(cancelled.status).toBe(400);
  });

  it('restores manual progress when every task is cancelled', async () => {
    const student = await register('cam');
    const supervisor = await register('eva');
    const thesisId = await createThesis(student, 'These manuel');
    await invite(student, thesisId, supervisor.email);
    const objective = await createObjective(supervisor, thesisId, 40);
    const task = await createTask(supervisor, thesisId, objective.id, 'Seule');
    const started = await readObjective(student, thesisId, objective.id);
    expect(started.progressMode).toBe('TASK_BASED');
    expect(started.progress).toBe(0);

    await supervisor.agent
      .patch(taskUrl(thesisId, objective.id, task.id))
      .set('x-csrf-token', supervisor.csrf)
      .send({ status: 'CANCELLED' });
    const restored = await readObjective(student, thesisId, objective.id);
    expect(restored.progressMode).toBe('MANUAL');
    expect(restored.progress).toBe(40);
    expect(restored.taskSummary.cancelled).toBe(1);
  });

  it('isolates tasks and rejects a reorder that would leave a partial order', async () => {
    const studentA = await register('ada2');
    const studentB = await register('bea2');
    const supervisor = await register('noa2');
    const outsider = await register('zoe');
    const thesisA = await createThesis(studentA, 'These A');
    const thesisB = await createThesis(studentB, 'These B');
    await invite(studentA, thesisA, supervisor.email);
    await invite(studentB, thesisB, supervisor.email);
    const objectiveA = await createObjective(supervisor, thesisA, 0);
    const objectiveB = await createObjective(supervisor, thesisB, 0);
    const first = await createTask(supervisor, thesisA, objectiveA.id, 'Une');
    const second = await createTask(supervisor, thesisA, objectiveA.id, 'Deux');
    const foreign = await createTask(supervisor, thesisB, objectiveB.id, 'Ailleurs');

    expect((await studentB.agent.get(tasksUrl(thesisA, objectiveA.id))).status).toBe(404);
    expect(
      (
        await studentB.agent
          .patch(taskUrl(thesisB, objectiveB.id, first.id))
          .set('x-csrf-token', studentB.csrf)
          .send({ status: 'DONE' })
      ).status,
    ).toBe(404);
    expect(
      (
        await supervisor.agent
          .patch(taskUrl(thesisA, objectiveA.id, foreign.id))
          .set('x-csrf-token', supervisor.csrf)
          .send({ title: 'Intrusion' })
      ).status,
    ).toBe(404);
    expect(
      (
        await outsider.agent
          .post(tasksUrl(thesisA, objectiveA.id))
          .set('x-csrf-token', outsider.csrf)
          .send({ title: 'Intrusion' })
      ).status,
    ).toBe(404);

    const before = await prisma.objective.findUniqueOrThrow({ where: { id: objectiveA.id } });
    const duplicate = await supervisor.agent
      .patch(`${tasksUrl(thesisA, objectiveA.id)}/reorder`)
      .set('x-csrf-token', supervisor.csrf)
      .send({
        tasks: [
          { taskId: first.id, position: 1 },
          { taskId: second.id, position: 1 },
        ],
      });
    expect(duplicate.status).toBe(400);
    const after = await prisma.objective.findUniqueOrThrow({ where: { id: objectiveA.id } });
    expect(after.updatedAt).toEqual(before.updatedAt);
    const unchanged = taskListSchema.parse(
      (await studentA.agent.get(tasksUrl(thesisA, objectiveA.id))).body,
    );
    expect(unchanged.tasks.map((item) => item.position)).toEqual([1, 2]);

    const otherObjective = await supervisor.agent
      .patch(`${tasksUrl(thesisA, objectiveA.id)}/reorder`)
      .set('x-csrf-token', supervisor.csrf)
      .send({
        tasks: [
          { taskId: first.id, position: 1 },
          { taskId: foreign.id, position: 2 },
        ],
      });
    expect(otherObjective.status).toBe(400);

    const reordered = taskListSchema.parse(
      (
        await supervisor.agent
          .patch(`${tasksUrl(thesisA, objectiveA.id)}/reorder`)
          .set('x-csrf-token', supervisor.csrf)
          .send({
            tasks: [
              { taskId: first.id, position: 2 },
              { taskId: second.id, position: 1 },
            ],
          })
      ).body,
    );
    expect(reordered.tasks.map((item) => item.title)).toEqual(['Deux', 'Une']);

    const listedOnB = taskListSchema.parse(
      (await studentB.agent.get(tasksUrl(thesisB, objectiveB.id))).body,
    );
    expect(listedOnB.tasks.map((item) => item.id)).toEqual([foreign.id]);

    const own = await studentA.agent
      .post(tasksUrl(thesisA, objectiveA.id))
      .set('x-csrf-token', studentA.csrf)
      .send({ title: 'Perso' });
    expect(own.status).toBe(201);
    expect(taskSchema.parse(own.body).origin).toBe('DOCTORAL_STUDENT');
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

  async function createObjective(
    account: { agent: request.Agent; csrf: string },
    thesisId: string,
    progress: number,
  ) {
    const response = await account.agent
      .post(`/api/v1/theses/${thesisId}/objectives`)
      .set('x-csrf-token', account.csrf)
      .send({ title: 'Etat de l art', progress });
    expect(response.status).toBe(201);
    return objectiveSchema.parse(response.body);
  }

  async function createTask(
    account: { agent: request.Agent; csrf: string },
    thesisId: string,
    objectiveId: string,
    title: string,
  ) {
    const response = await account.agent
      .post(tasksUrl(thesisId, objectiveId))
      .set('x-csrf-token', account.csrf)
      .send({ title });
    expect(response.status).toBe(201);
    return taskSchema.parse(response.body);
  }

  async function markDone(
    account: { agent: request.Agent; csrf: string },
    thesisId: string,
    objectiveId: string,
    taskId: string,
  ) {
    const response = await account.agent
      .patch(taskUrl(thesisId, objectiveId, taskId))
      .set('x-csrf-token', account.csrf)
      .send({ status: 'DONE' });
    expect(response.status).toBe(200);
  }

  async function readObjective(
    account: { agent: request.Agent },
    thesisId: string,
    objectiveId: string,
  ) {
    const response = await account.agent.get(objectiveUrl(thesisId, objectiveId));
    expect(response.status).toBe(200);
    return objectiveSchema.parse(response.body);
  }
});

function objectiveUrl(thesisId: string, objectiveId: string): string {
  return `/api/v1/theses/${thesisId}/objectives/${objectiveId}`;
}

function tasksUrl(thesisId: string, objectiveId: string): string {
  return `${objectiveUrl(thesisId, objectiveId)}/tasks`;
}

function taskUrl(thesisId: string, objectiveId: string, taskId: string): string {
  return `${tasksUrl(thesisId, objectiveId)}/${taskId}`;
}
