import type { INestApplication } from '@nestjs/common';
import { invitationListSchema, inviteResponseSchema } from '@thesispartner/validation';
import request from 'supertest';
import { AuthMailer } from '../src/auth/auth-mailer';
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

function tokenFrom(mailer: AuthMailer, subjectContains: string): string {
  const mail = [...mailer.sent].reverse().find((item) => item.subject.includes(subjectContains));
  const match = mail?.text.match(/token=([^\s]+)/);
  const token = match?.[1];
  if (!token) throw new Error(`missing invitation token for ${subjectContains}`);
  return decodeURIComponent(token);
}

describe('invitations', () => {
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
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { thesisId: { in: thesisIds } }] },
    });
    await prisma.invitation.deleteMany({
      where: { OR: [{ invitedById: { in: ids } }, { thesisId: { in: thesisIds } }] },
    });
    await prisma.supervisionHistory.deleteMany({
      where: {
        OR: [{ supervisorUserId: { in: ids } }, { thesisId: { in: thesisIds } }],
      },
    });
    await prisma.authToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    if (thesisIds.length > 0) {
      await prisma.thesis.deleteMany({ where: { id: { in: thesisIds } } });
    }
    await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('requires accept before membership and supports cancel/resend/reject', async () => {
    const stamp = Date.now();
    const studentEmail = `student-inv-${stamp}@example.test`;
    const supervisorEmail = `supervisor-inv-${stamp}@example.test`;
    emails.push(studentEmail, supervisorEmail);
    const mailer = app.get(AuthMailer);

    const student = request.agent(app.getHttpServer());
    const studentReg = await student.post('/api/v1/auth/register').send({
      email: studentEmail,
      password,
      givenName: 'Ada',
      familyName: 'Student',
    });
    expect(studentReg.status).toBe(201);
    const studentCsrf = csrfFrom(studentReg);

    const thesis = await student
      .post('/api/v1/theses')
      .set('x-csrf-token', studentCsrf)
      .send({ title: 'Invitation flow thesis' });
    expect(thesis.status).toBe(201);
    const thesisId = thesis.body.id as string;

    const created = inviteResponseSchema.parse(
      (
        await student
          .post(`/api/v1/theses/${thesisId}/invitations`)
          .set('x-csrf-token', studentCsrf)
          .send({ email: supervisorEmail, role: 'SUPERVISOR' })
      ).body,
    );
    expect(created.status).toBe('PENDING');

    const duplicate = await student
      .post(`/api/v1/theses/${thesisId}/invitations`)
      .set('x-csrf-token', studentCsrf)
      .send({ email: supervisorEmail, role: 'SUPERVISOR' });
    expect(duplicate.status).toBe(409);

    const list = invitationListSchema.parse(
      (await student.get(`/api/v1/theses/${thesisId}/invitations`)).body,
    );
    expect(list.invitations).toHaveLength(1);

    await student
      .post(`/api/v1/theses/${thesisId}/invitations/${created.id}/resend`)
      .set('x-csrf-token', studentCsrf)
      .send({});

    const supervisor = request.agent(app.getHttpServer());
    const supervisorReg = await supervisor.post('/api/v1/auth/register').send({
      email: supervisorEmail,
      password,
      givenName: 'Noa',
      familyName: 'Supervisor',
    });
    expect(supervisorReg.status).toBe(201);
    const supervisorCsrf = csrfFrom(supervisorReg);

    expect((await supervisor.get(`/api/v1/theses/${thesisId}`)).status).toBe(404);

    const token = tokenFrom(mailer, 'Invitation flow thesis');
    const rejected = await supervisor
      .post('/api/v1/invitations/reject')
      .set('x-csrf-token', supervisorCsrf)
      .send({ token });
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe('REJECTED');
    expect((await supervisor.get(`/api/v1/theses/${thesisId}`)).status).toBe(404);

    const again = inviteResponseSchema.parse(
      (
        await student
          .post(`/api/v1/theses/${thesisId}/invitations`)
          .set('x-csrf-token', studentCsrf)
          .send({ email: supervisorEmail, role: 'SUPERVISOR' })
      ).body,
    );
    const acceptToken = tokenFrom(mailer, 'Invitation flow thesis');
    const accepted = await supervisor
      .post('/api/v1/invitations/accept')
      .set('x-csrf-token', supervisorCsrf)
      .send({ token: acceptToken });
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe('ACCEPTED');
    expect((await supervisor.get(`/api/v1/theses/${thesisId}`)).status).toBe(200);

    const reuse = await supervisor
      .post('/api/v1/invitations/accept')
      .set('x-csrf-token', supervisorCsrf)
      .send({ token: acceptToken });
    expect(reuse.status).toBe(409);

    void again;
  });

  it('replaces supervisor and keeps supervision history', async () => {
    const stamp = Date.now();
    const studentEmail = `student-chg-${stamp}@example.test`;
    const firstEmail = `first-sup-${stamp}@example.test`;
    const secondEmail = `second-sup-${stamp}@example.test`;
    emails.push(studentEmail, firstEmail, secondEmail);
    const mailer = app.get(AuthMailer);

    async function register(email: string, givenName: string) {
      const agent = request.agent(app.getHttpServer());
      const response = await agent.post('/api/v1/auth/register').send({
        email,
        password,
        givenName,
        familyName: 'Test',
      });
      expect(response.status).toBe(201);
      return { agent, csrf: csrfFrom(response), userId: response.body.user.id as string };
    }

    const student = await register(studentEmail, 'Ada');
    const first = await register(firstEmail, 'First');
    const second = await register(secondEmail, 'Second');

    const thesis = await student.agent
      .post('/api/v1/theses')
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Supervisor change thesis' });
    const thesisId = thesis.body.id as string;

    await student.agent
      .post(`/api/v1/theses/${thesisId}/invitations`)
      .set('x-csrf-token', student.csrf)
      .send({ email: firstEmail, role: 'SUPERVISOR' });
    await first.agent
      .post('/api/v1/invitations/accept')
      .set('x-csrf-token', first.csrf)
      .send({ token: tokenFrom(mailer, 'Supervisor change thesis') });

    const change = await student.agent
      .post(`/api/v1/theses/${thesisId}/supervisor-change`)
      .set('x-csrf-token', student.csrf)
      .send({ email: secondEmail, reason: 'Retirement of first supervisor' });
    expect(change.status).toBe(201);
    expect(change.body.replacesSupervisor).toBe(true);

    const objective = await student.agent
      .post(`/api/v1/theses/${thesisId}/objectives`)
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Keep private after change' });
    expect(objective.status).toBe(201);
    const objectiveId = objective.body.id as string;

    await second.agent
      .post('/api/v1/invitations/accept')
      .set('x-csrf-token', second.csrf)
      .send({ token: tokenFrom(mailer, 'Supervisor change thesis') });

    expect((await first.agent.get(`/api/v1/theses/${thesisId}`)).status).toBe(404);
    expect((await first.agent.get(`/api/v1/theses/${thesisId}/objectives`)).status).toBe(404);
    expect(
      (await first.agent.get(`/api/v1/theses/${thesisId}/objectives/${objectiveId}`)).status,
    ).toBe(404);
    expect((await second.agent.get(`/api/v1/theses/${thesisId}`)).body.role).toBe('SUPERVISOR');
    expect((await second.agent.get(`/api/v1/theses/${thesisId}/objectives`)).status).toBe(200);

    const history = await prisma.supervisionHistory.findMany({ where: { thesisId } });
    expect(history).toHaveLength(1);
    expect(history[0]?.supervisorUserId).toBe(first.userId);
    expect(history[0]?.endedReason).toBe('REPLACED');
    expect(history[0]?.changeReason).toBe('Retirement of first supervisor');
  });

  it('rejects expired tokens and unauthorized accept attempts', async () => {
    const stamp = Date.now();
    const studentEmail = `student-exp-${stamp}@example.test`;
    const supervisorEmail = `supervisor-exp-${stamp}@example.test`;
    const strangerEmail = `stranger-exp-${stamp}@example.test`;
    emails.push(studentEmail, supervisorEmail, strangerEmail);
    const mailer = app.get(AuthMailer);

    async function register(email: string, givenName: string) {
      const agent = request.agent(app.getHttpServer());
      const response = await agent.post('/api/v1/auth/register').send({
        email,
        password,
        givenName,
        familyName: 'Test',
      });
      expect(response.status).toBe(201);
      return { agent, csrf: csrfFrom(response) };
    }

    const student = await register(studentEmail, 'Ada');
    const supervisor = await register(supervisorEmail, 'Noa');
    const stranger = await register(strangerEmail, 'Eve');

    const thesis = await student.agent
      .post('/api/v1/theses')
      .set('x-csrf-token', student.csrf)
      .send({ title: 'Expired invitation thesis' });
    const thesisId = thesis.body.id as string;

    const created = await student.agent
      .post(`/api/v1/theses/${thesisId}/invitations`)
      .set('x-csrf-token', student.csrf)
      .send({ email: supervisorEmail, role: 'SUPERVISOR' });
    expect(created.status).toBe(201);
    const token = tokenFrom(mailer, 'Expired invitation thesis');

    const stolen = await stranger.agent
      .post('/api/v1/invitations/accept')
      .set('x-csrf-token', stranger.csrf)
      .send({ token });
    expect(stolen.status).toBe(403);

    await prisma.invitation.update({
      where: { id: created.body.id as string },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const expired = await supervisor.agent
      .post('/api/v1/invitations/accept')
      .set('x-csrf-token', supervisor.csrf)
      .send({ token });
    expect(expired.status).toBe(400);
    expect((await supervisor.agent.get(`/api/v1/theses/${thesisId}`)).status).toBe(404);
  });
});
