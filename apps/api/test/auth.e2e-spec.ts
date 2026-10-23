import type { INestApplication } from '@nestjs/common';
import {
  ackSchema,
  currentUserResponseSchema,
  thesisSummarySchema,
} from '@thesispartner/validation';
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

function tokenFrom(mailer: AuthMailer, subject: string): string {
  const mail = [...mailer.sent].reverse().find((item) => item.subject === subject);
  const match = mail?.text.match(/token=([^\s]+)/);
  const token = match?.[1];
  if (!token) throw new Error(`missing token for ${subject}`);
  return decodeURIComponent(token);
}

describe('authentication and thesis membership', () => {
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
    const thesisIds = memberships.map((item) => item.thesisId);
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

  it('does not reveal whether an email exists', async () => {
    const unknown = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'absent@example.test',
      password,
    });
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe('Invalid email or password');
  });

  it('opens a session, isolates a thesis, and revokes access on logout and reset', async () => {
    const stamp = Date.now();
    const ownerEmail = `owner-${stamp}@example.test`;
    const outsiderEmail = `outsider-${stamp}@example.test`;
    emails.push(ownerEmail, outsiderEmail);
    const mailer = app.get(AuthMailer);
    const owner = request.agent(app.getHttpServer());

    const registered = await owner.post('/api/v1/auth/register').send({
      email: ownerEmail,
      password,
      givenName: 'Camille',
      familyName: 'Martin',
      institution: 'Université',
    });
    expect(registered.status).toBe(201);
    expect(currentUserResponseSchema.parse(registered.body).user.emailVerified).toBe(false);
    const cookies = registered.headers['set-cookie'];
    const joined = Array.isArray(cookies) ? cookies.join(' ') : String(cookies ?? '');
    expect(joined).toContain('tp_session=');
    expect(joined).toContain('HttpOnly');
    expect(JSON.stringify(registered.body)).not.toContain('password');

    const wrong = await owner.post('/api/v1/auth/login').send({
      email: ownerEmail,
      password: 'pas-le-bon-mot-de-passe',
    });
    expect(wrong.status).toBe(401);
    expect(wrong.body.message).toBe('Invalid email or password');

    const csrf = csrfFrom(registered);
    const withoutCsrf = await owner.post('/api/v1/theses').send({ title: 'Sans jeton' });
    expect(withoutCsrf.status).toBe(403);

    const created = await owner
      .post('/api/v1/theses')
      .set('x-csrf-token', csrf)
      .send({ title: 'Dynamique des ecosystemes cotiers' });
    expect(created.status).toBe(201);
    const thesis = thesisSummarySchema.parse(created.body);

    const verification = tokenFrom(mailer, 'Confirmez votre adresse ThesisPartner');
    const verified = await request(app.getHttpServer())
      .post('/api/v1/auth/email-verification')
      .send({ token: verification });
    expect(verified.status).toBe(200);
    expect(ackSchema.parse(verified.body).status).toBe('ok');

    const me = await owner.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.emailVerified).toBe(true);

    const outsider = request.agent(app.getHttpServer());
    const outsiderAccount = await outsider.post('/api/v1/auth/register').send({
      email: outsiderEmail,
      password,
      givenName: 'Noah',
      familyName: 'Bernard',
    });
    expect(outsiderAccount.status).toBe(201);
    const hidden = await outsider.get(`/api/v1/theses/${thesis.id}`);
    expect(hidden.status).toBe(404);

    const forbidden = await owner
      .post(`/api/v1/theses/${thesis.id}/invitations`)
      .set('x-csrf-token', csrf)
      .send({ email: outsiderEmail, role: 'DOCTORAL_STUDENT' });
    expect(forbidden.status).toBe(403);

    const invited = await owner
      .post(`/api/v1/theses/${thesis.id}/invitations`)
      .set('x-csrf-token', csrf)
      .send({ email: outsiderEmail, role: 'SUPERVISOR' });
    expect(invited.status).toBe(201);
    expect(invited.body.status).toBe('PENDING');
    expect((await outsider.get(`/api/v1/theses/${thesis.id}`)).status).toBe(404);

    const inviteToken = tokenFrom(mailer, `Invitation ThesisPartner — ${thesis.title}`);
    const outsiderCsrf = csrfFrom(outsiderAccount);
    const accepted = await outsider
      .post('/api/v1/invitations/accept')
      .set('x-csrf-token', outsiderCsrf)
      .send({ token: inviteToken });
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe('ACCEPTED');

    const visible = await outsider.get(`/api/v1/theses/${thesis.id}`);
    expect(visible.status).toBe(200);
    expect(visible.body.role).toBe('SUPERVISOR');

    const loggedOut = await owner.post('/api/v1/auth/logout').set('x-csrf-token', csrf);
    expect(loggedOut.status).toBe(200);
    expect((await owner.get('/api/v1/auth/me')).status).toBe(401);

    const resetRequest = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ email: ownerEmail });
    expect(resetRequest.status).toBe(200);
    const resetToken = tokenFrom(mailer, 'Réinitialisation du mot de passe ThesisPartner');
    const reset = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset')
      .send({ token: resetToken, password: 'nouvelle-phrase-12' });
    expect(reset.status).toBe(200);

    const oldPassword = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: ownerEmail,
      password,
    });
    expect(oldPassword.status).toBe(401);
    const fresh = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: ownerEmail,
      password: 'nouvelle-phrase-12',
    });
    expect(fresh.status).toBe(200);

    const thesisRow = await prisma.thesis.findUnique({ where: { id: thesis.id } });
    if (thesisRow) {
      await prisma.thesisMembership.deleteMany({ where: { thesisId: thesis.id } });
      await prisma.auditLog.deleteMany({ where: { thesisId: thesis.id } });
      await prisma.thesis.delete({ where: { id: thesis.id } });
    }
  });
});
