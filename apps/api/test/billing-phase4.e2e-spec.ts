import type { INestApplication } from '@nestjs/common';
import {
  adminBillingStatsSchema,
  billingStatusSchema,
  billingSubscriptionSchema,
  billingTrialSchema,
} from '@thesispartner/validation';
import request from 'supertest';
import { AuthMailer } from '../src/auth/auth-mailer';
import { addUtcDays } from '../src/billing/billing.util';
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

describe('billing phase 4', () => {
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
    await prisma.paymentEvent.deleteMany({ where: { payment: { userId: { in: ids } } } });
    await prisma.invoice.deleteMany({ where: { userId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { userId: { in: ids } } });
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

  it('starts a unique 30-day trial, expires to read-only, and allows admin activation', async () => {
    const stamp = Date.now();
    const studentEmail = `bill-student-${stamp}@example.test`;
    const supervisorEmail = `bill-sup-${stamp}@example.test`;
    const adminEmail = `bill-admin-${stamp}@example.test`;
    emails.push(studentEmail, supervisorEmail, adminEmail);
    const mailer = app.get(AuthMailer);

    const student = request.agent(app.getHttpServer());
    const registered = await student.post('/api/v1/auth/register').send({
      email: studentEmail,
      password,
      givenName: 'Lea',
      familyName: 'Bill',
    });
    expect(registered.status).toBe(201);
    const csrf = csrfFrom(registered);
    const userId = registered.body.user.id as string;

    const firstStart = await student.post('/api/v1/billing/trial/start').set('x-csrf-token', csrf).send({});
    expect(firstStart.status).toBe(409);

    await prisma.trial.update({
      where: { userId },
      data: { status: 'NOT_STARTED', startedAt: null, expiresAt: null },
    });

    const unverified = await student.post('/api/v1/billing/trial/start').set('x-csrf-token', csrf).send({});
    expect(unverified.status).toBe(403);

    const token = tokenFrom(mailer, 'Confirmez votre adresse ThesisPartner');
    expect((await request(app.getHttpServer()).post('/api/v1/auth/email-verification').send({ token })).status).toBe(
      200,
    );

    const started = await student.post('/api/v1/billing/trial/start').set('x-csrf-token', csrf).send({});
    expect(started.status).toBe(200);
    const trial = billingTrialSchema.parse(started.body);
    expect(trial.status).toBe('ACTIVE');
    expect(trial.startedAt).toBeTruthy();
    expect(trial.expiresAt).toBeTruthy();
    const startedAt = new Date(trial.startedAt!);
    const expiresAt = new Date(trial.expiresAt!);
    expect(expiresAt.getTime() - startedAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000);

    const again = await student.post('/api/v1/billing/trial/start').set('x-csrf-token', csrf).send({});
    expect(again.status).toBe(409);

    const thesis = await student.post('/api/v1/theses').set('x-csrf-token', csrf).send({ title: 'Couverture essai' });
    expect(thesis.status).toBe(201);
    const thesisId = thesis.body.id as string;
    const objective = await student
      .post(`/api/v1/theses/${thesisId}/objectives`)
      .set('x-csrf-token', csrf)
      .send({ title: 'Chapitre 1' });
    expect(objective.status).toBe(201);

    await prisma.trial.update({
      where: { userId },
      data: { status: 'EXPIRED', expiresAt: new Date(Date.now() - 1000) },
    });

    const blocked = await student
      .post(`/api/v1/theses/${thesisId}/objectives`)
      .set('x-csrf-token', csrf)
      .send({ title: 'Apres expiration' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('SUBSCRIPTION_REQUIRED');

    const readable = await student.get(`/api/v1/theses/${thesisId}/objectives`);
    expect(readable.status).toBe(200);
    expect(readable.body.objectives.some((item: { title: string }) => item.title === 'Chapitre 1')).toBe(true);

    const status = billingStatusSchema.parse((await student.get('/api/v1/billing/status')).body);
    expect(status.trial.status).toBe('EXPIRED');
    expect(status.coverage.writable).toBe(false);

    const select = await student
      .post('/api/v1/billing/subscription/select')
      .set('x-csrf-token', csrf)
      .send({ planCode: 'THESISPARTNER_PRO_MONTHLY' });
    expect(select.status).toBe(200);
    const pending = billingSubscriptionSchema.parse(select.body);
    expect(pending.status).toBe('PENDING');
    expect(pending.paymentProviderReady).toBe(true);

    const admin = request.agent(app.getHttpServer());
    const adminReg = await admin.post('/api/v1/auth/register').send({
      email: adminEmail,
      password,
      givenName: 'Ada',
      familyName: 'Admin',
    });
    expect(adminReg.status).toBe(201);
    await prisma.user.update({ where: { email: adminEmail }, data: { platformRole: 'SUPER_ADMIN' } });
    await admin.post('/api/v1/auth/logout').set('x-csrf-token', csrfFrom(adminReg));
    const adminLogin = await admin.post('/api/v1/auth/login').send({ email: adminEmail, password });
    expect(adminLogin.status).toBe(200);
    const adminCsrf = csrfFrom(adminLogin);

    expect((await student.get('/api/v1/admin/billing/stats')).status).toBe(403);
    const stats = await admin.get('/api/v1/admin/billing/stats');
    expect(stats.status).toBe(200);
    adminBillingStatsSchema.parse(stats.body);

    const activated = await admin
      .post(`/api/v1/admin/subscriptions/${pending.id}/activate`)
      .set('x-csrf-token', adminCsrf)
      .send({ reason: 'Pilotage Phase 4 sans paiement' });
    expect(activated.status).toBe(200);
    expect(billingSubscriptionSchema.parse(activated.body).status).toBe('ACTIVE');

    const writing = await student
      .post(`/api/v1/theses/${thesisId}/objectives`)
      .set('x-csrf-token', csrf)
      .send({ title: 'Apres activation admin' });
    expect(writing.status).toBe(201);

    const cancel = await student
      .post('/api/v1/billing/subscription/cancel')
      .set('x-csrf-token', csrf)
      .send({ confirm: true });
    expect(cancel.status).toBe(200);
    expect(billingSubscriptionSchema.parse(cancel.body).cancelAtPeriodEnd).toBe(true);

    await admin
      .post(`/api/v1/admin/subscriptions/${pending.id}/activate`)
      .set('x-csrf-token', adminCsrf)
      .send({ reason: 'noop if already active' });
    const grace = await admin
      .post(`/api/v1/admin/subscriptions/${pending.id}/grace`)
      .set('x-csrf-token', adminCsrf)
      .send({ reason: 'Impaye simule pour grace' });
    expect(grace.status).toBe(200);
    expect(billingSubscriptionSchema.parse(grace.body).status).toBe('GRACE_PERIOD');
    expect(
      (
        await student
          .post(`/api/v1/theses/${thesisId}/objectives`)
          .set('x-csrf-token', csrf)
          .send({ title: 'Pendant la grace' })
      ).status,
    ).toBe(201);

    const supervisor = request.agent(app.getHttpServer());
    const supReg = await supervisor.post('/api/v1/auth/register').send({
      email: supervisorEmail,
      password,
      givenName: 'Paul',
      familyName: 'Encadrant',
    });
    expect(supReg.status).toBe(201);
    const invite = await student
      .post(`/api/v1/theses/${thesisId}/invitations`)
      .set('x-csrf-token', csrf)
      .send({ email: supervisorEmail, role: 'SUPERVISOR' });
    expect(invite.status).toBe(201);
    const inviteToken = tokenFrom(mailer, `Invitation ThesisPartner — Couverture essai`);
    const accepted = await supervisor
      .post('/api/v1/invitations/accept')
      .set('x-csrf-token', csrfFrom(supReg))
      .send({ token: inviteToken });
    expect(accepted.status).toBe(200);
    expect((await supervisor.get(`/api/v1/theses/${thesisId}/objectives`)).status).toBe(200);

    const extend = await admin
      .post(`/api/v1/admin/users/${userId}/extend-access`)
      .set('x-csrf-token', adminCsrf)
      .send({ days: 5, reason: 'Prolongation exceptionnelle de test' });
    expect(extend.status).toBe(200);
    const extended = billingTrialSchema.parse(extend.body);
    expect(extended.status).toBe('ACTIVE');
    expect(new Date(extended.expiresAt!).getTime()).toBeGreaterThan(addUtcDays(new Date(), 4).getTime());
  });
});
