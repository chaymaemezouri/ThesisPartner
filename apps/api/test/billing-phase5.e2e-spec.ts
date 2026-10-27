import type { INestApplication } from '@nestjs/common';
import {
  adminBillingStatsSchema,
  billingStatusSchema,
  checkoutResponseSchema,
  invoiceListSchema,
  paymentDtoSchema,
  webhookAckSchema,
} from '@thesispartner/validation';
import request from 'supertest';
import { AuthMailer } from '../src/auth/auth-mailer';
import { createApp } from '../src/app.factory';
import { MockPaymentProvider } from '../src/billing/mock-payment.provider';
import { PAYMENT_PROVIDER } from '../src/billing/payment-provider';
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

describe('billing phase 5', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let provider: MockPaymentProvider;
  const emails: string[] = [];

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    prisma = app.get(PrismaService);
    provider = app.get(PAYMENT_PROVIDER) as MockPaymentProvider;
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

  async function registerVerified(email: string, givenName: string) {
    emails.push(email);
    const agent = request.agent(app.getHttpServer());
    const registered = await agent.post('/api/v1/auth/register').send({
      email,
      password,
      givenName,
      familyName: 'Pay',
    });
    expect(registered.status).toBe(201);
    const mailer = app.get(AuthMailer);
    const token = tokenFrom(mailer, 'Confirmez votre adresse ThesisPartner');
    expect(
      (await request(app.getHttpServer()).post('/api/v1/auth/email-verification').send({ token }))
        .status,
    ).toBe(200);
    return { agent, csrf: csrfFrom(registered), userId: registered.body.user.id as string };
  }

  async function postWebhook(body: Record<string, unknown>) {
    const raw = Buffer.from(JSON.stringify(body));
    return request(app.getHttpServer())
      .post('/api/v1/billing/webhooks/mock')
      .set('x-mock-signature', provider.signatureHeader(raw))
      .set('Content-Type', 'application/json')
      .send(raw.toString('utf8'));
  }

  it('checks out monthly and yearly from server prices without activating early', async () => {
    const stamp = Date.now();
    const student = await registerVerified(`pay-month-${stamp}@example.test`, 'Lea');
    const plans = await student.agent.get('/api/v1/billing/plans');
    expect(plans.status).toBe(200);
    const monthly = plans.body.plans.find(
      (item: { code: string }) => item.code === 'THESISPARTNER_PRO_MONTHLY',
    );
    const yearly = plans.body.plans.find(
      (item: { code: string }) => item.code === 'THESISPARTNER_PRO_YEARLY',
    );
    expect(monthly.priceMad).toBeGreaterThan(0);

    const first = checkoutResponseSchema.parse(
      (
        await student.agent
          .post('/api/v1/billing/checkout')
          .set('x-csrf-token', student.csrf)
          .send({ planCode: 'THESISPARTNER_PRO_MONTHLY', idempotencyKey: `idem-month-${stamp}` })
      ).body,
    );
    expect(first.status).toBe('PENDING');
    expect(first.amountMinor).toBe(monthly.priceMad * 100);
    expect(first.checkoutUrl).toContain('/paiement/simulation/');

    const replay = checkoutResponseSchema.parse(
      (
        await student.agent
          .post('/api/v1/billing/checkout')
          .set('x-csrf-token', student.csrf)
          .send({ planCode: 'THESISPARTNER_PRO_MONTHLY', idempotencyKey: `idem-month-${stamp}` })
      ).body,
    );
    expect(replay.paymentId).toBe(first.paymentId);

    const before = billingStatusSchema.parse(
      (await student.agent.get('/api/v1/billing/status')).body,
    );
    expect(before.subscription.status === 'PENDING' || before.subscription.status === null).toBe(
      true,
    );
    expect(before.subscription.paymentProviderReady).toBe(true);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: first.paymentId } });
    const fraud = await postWebhook({
      externalEventId: `fraud-${stamp}`,
      eventType: 'payment.succeeded',
      providerPaymentId: payment.providerPaymentId,
      amountMinor: payment.amountMinor + 100,
      currency: 'MAD',
      environment: 'TEST',
    });
    expect(fraud.status).toBe(400);
    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).status,
    ).toBe('PENDING');

    const invalid = await request(app.getHttpServer())
      .post('/api/v1/billing/webhooks/mock')
      .set('x-mock-signature', 't=9999999999,v1=00')
      .set('Content-Type', 'application/json')
      .send('{"externalEventId":"x"}');
    expect(invalid.status).toBe(401);

    const okBody = {
      externalEventId: `ok-${stamp}`,
      eventType: 'payment.succeeded',
      providerPaymentId: payment.providerPaymentId,
      amountMinor: payment.amountMinor,
      currency: 'MAD',
      environment: 'TEST',
    };
    const confirmed = webhookAckSchema.parse((await postWebhook(okBody)).body);
    expect(confirmed.received).toBe(true);
    const duplicate = webhookAckSchema.parse((await postWebhook(okBody)).body);
    expect(duplicate.duplicate).toBe(true);

    const paid = paymentDtoSchema.parse(
      (await student.agent.get(`/api/v1/billing/payments/${first.paymentId}`)).body,
    );
    expect(paid.status).toBe('SUCCEEDED');
    expect(paid.environment).toBe('TEST');

    const after = billingStatusSchema.parse(
      (await student.agent.get('/api/v1/billing/status')).body,
    );
    expect(after.subscription.status).toBe('ACTIVE');
    expect(after.coverage.writable).toBe(true);

    const unordered = await postWebhook({
      externalEventId: `created-late-${stamp}`,
      eventType: 'payment.created',
      providerPaymentId: payment.providerPaymentId,
      amountMinor: payment.amountMinor,
      currency: 'MAD',
      environment: 'TEST',
    });
    expect(unordered.status).toBe(200);
    expect((await prisma.subscription.findMany({ where: { userId: student.userId } })).length).toBe(
      1,
    );

    const invoices = invoiceListSchema.parse(
      (await student.agent.get('/api/v1/billing/invoices')).body,
    );
    expect(invoices.invoices[0]?.specimen).toBe(true);
    expect(invoices.invoices[0]?.planCode).toBe('THESISPARTNER_PRO_MONTHLY');

    const other = await registerVerified(`pay-other-${stamp}@example.test`, 'Omar');
    const invoice = invoices.invoices[0];
    expect(invoice).toBeTruthy();
    const stolen = await other.agent.get(`/api/v1/billing/invoices/${invoice!.id}/download`);
    expect(stolen.status).toBe(403);

    const declinedStudent = await registerVerified(`pay-decl-${stamp}@example.test`, 'Nia');
    const declinedCheckout = checkoutResponseSchema.parse(
      (
        await declinedStudent.agent
          .post('/api/v1/billing/checkout')
          .set('x-csrf-token', declinedStudent.csrf)
          .send({ planCode: 'THESISPARTNER_PRO_YEARLY', idempotencyKey: `idem-year-${stamp}` })
      ).body,
    );
    expect(declinedCheckout.amountMinor).toBe(yearly.priceMad * 100);
    const declinedPay = await prisma.payment.findUniqueOrThrow({
      where: { id: declinedCheckout.paymentId },
    });
    const refused = await postWebhook({
      externalEventId: `fail-${stamp}`,
      eventType: 'payment.failed',
      providerPaymentId: declinedPay.providerPaymentId,
      amountMinor: declinedPay.amountMinor,
      currency: 'MAD',
      environment: 'TEST',
    });
    expect(refused.status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: declinedPay.id } })).status).toBe(
      'FAILED',
    );
    const declinedStatus = billingStatusSchema.parse(
      (await declinedStudent.agent.get('/api/v1/billing/status')).body,
    );
    expect(declinedStatus.subscription.status).not.toBe('ACTIVE');
  });

  it('renews, cancels, refunds, and keeps supervisor access free', async () => {
    const stamp = Date.now();
    const student = await registerVerified(`pay-renew-${stamp}@example.test`, 'Mia');
    const second = await registerVerified(`pay-renew2-${stamp}@example.test`, 'Ines');
    const supervisor = await registerVerified(`pay-sup-${stamp}@example.test`, 'Paul');
    const admin = await registerVerified(`pay-admin-${stamp}@example.test`, 'Ada');
    await prisma.user.update({
      where: { id: admin.userId },
      data: { platformRole: 'SUPER_ADMIN' },
    });
    await admin.agent.post('/api/v1/auth/logout').set('x-csrf-token', admin.csrf);
    const adminLogin = await admin.agent
      .post('/api/v1/auth/login')
      .send({ email: `pay-admin-${stamp}@example.test`, password });
    expect(adminLogin.status).toBe(200);
    const adminCsrf = csrfFrom(adminLogin);

    const thesisA = await student.agent
      .post('/api/v1/theses')
      .set('x-csrf-token', student.csrf)
      .send({ title: 'These A paiement' });
    expect(thesisA.status).toBe(201);
    const thesisB = await second.agent
      .post('/api/v1/theses')
      .set('x-csrf-token', second.csrf)
      .send({ title: 'These B paiement' });
    expect(thesisB.status).toBe(201);

    async function pay(
      actor: { agent: ReturnType<typeof request.agent>; csrf: string },
      key: string,
    ) {
      const checkout = checkoutResponseSchema.parse(
        (
          await actor.agent
            .post('/api/v1/billing/checkout')
            .set('x-csrf-token', actor.csrf)
            .send({ planCode: 'THESISPARTNER_PRO_MONTHLY', idempotencyKey: key })
        ).body,
      );
      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: checkout.paymentId } });
      expect(
        (
          await postWebhook({
            externalEventId: `evt-${key}`,
            eventType: 'payment.succeeded',
            providerPaymentId: payment.providerPaymentId,
            amountMinor: payment.amountMinor,
            currency: 'MAD',
            environment: 'TEST',
          })
        ).status,
      ).toBe(200);
      return payment;
    }

    const firstPayment = await pay(student, `renew-a-${stamp}`);
    await prisma.subscription.updateMany({
      where: { userId: student.userId },
      data: { currentPeriodEnd: new Date(Date.now() - 60_000) },
    });
    const renewal = await pay(student, `renew-b-${stamp}`);
    const sub = await prisma.subscription.findFirstOrThrow({
      where: { userId: student.userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(sub.status).toBe('ACTIVE');
    expect(sub.currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now());
    expect(renewal.id).not.toBe(firstPayment.id);

    const cancel = await student.agent
      .post('/api/v1/billing/subscription/cancel')
      .set('x-csrf-token', student.csrf)
      .send({ confirm: true });
    expect(cancel.status).toBe(200);
    expect(cancel.body.cancelAtPeriodEnd).toBe(true);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        currentPeriodEnd: new Date(Date.now() - 1000),
        cancelAtPeriodEnd: false,
        status: 'ACTIVE',
      },
    });
    const stats = adminBillingStatsSchema.parse(
      (await admin.agent.get('/api/v1/admin/billing/stats')).body,
    );
    expect(stats.liveCollectedMinor).toBe(0);
    expect(stats.testPaymentCount).toBeGreaterThan(0);

    const refreshed = await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(refreshed.status).toBe('GRACE_PERIOD');

    const refund = await admin.agent
      .post(`/api/v1/admin/payments/${renewal.id}/refund`)
      .set('x-csrf-token', adminCsrf)
      .send({ reason: 'Test refund' });
    expect(refund.status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: renewal.id } })).status).toBe(
      'REFUNDED',
    );
    const credits = await prisma.invoice.findMany({
      where: { paymentId: renewal.id, kind: 'CREDIT_NOTE' },
    });
    expect(credits.length).toBe(1);

    expect((await student.agent.get('/api/v1/admin/payments')).status).toBe(403);
    expect((await admin.agent.get('/api/v1/admin/payments')).status).toBe(200);
    expect((await admin.agent.get('/api/v1/admin/invoices')).status).toBe(200);
    expect((await admin.agent.get('/api/v1/admin/payment-events')).status).toBe(200);

    const blockedSup = await supervisor.agent
      .post('/api/v1/billing/checkout')
      .set('x-csrf-token', supervisor.csrf)
      .send({ planCode: 'THESISPARTNER_PRO_MONTHLY', idempotencyKey: `sup-${stamp}` });
    // Supervisor-only is true only after a supervisor membership exists.
    expect([200, 403]).toContain(blockedSup.status);

    const mailer = app.get(AuthMailer);
    const inviteA = await student.agent
      .post(`/api/v1/theses/${thesisA.body.id}/invitations`)
      .set('x-csrf-token', student.csrf)
      .send({ email: `pay-sup-${stamp}@example.test`, role: 'SUPERVISOR' });
    expect(inviteA.status).toBe(201);
    const tokenA = tokenFrom(mailer, 'Invitation ThesisPartner — These A paiement');
    expect(
      (
        await supervisor.agent
          .post('/api/v1/invitations/accept')
          .set('x-csrf-token', supervisor.csrf)
          .send({ token: tokenA })
      ).status,
    ).toBe(200);

    await pay(second, `renew-c-${stamp}`);
    const inviteB = await second.agent
      .post(`/api/v1/theses/${thesisB.body.id}/invitations`)
      .set('x-csrf-token', second.csrf)
      .send({ email: `pay-sup-${stamp}@example.test`, role: 'SUPERVISOR' });
    expect(inviteB.status).toBe(201);
    const tokenB = tokenFrom(mailer, 'Invitation ThesisPartner — These B paiement');
    expect(
      (
        await supervisor.agent
          .post('/api/v1/invitations/accept')
          .set('x-csrf-token', supervisor.csrf)
          .send({ token: tokenB })
      ).status,
    ).toBe(200);

    expect(
      (await supervisor.agent.get(`/api/v1/theses/${thesisA.body.id}/objectives`)).status,
    ).toBe(200);
    expect(
      (await supervisor.agent.get(`/api/v1/theses/${thesisB.body.id}/objectives`)).status,
    ).toBe(200);
    const afterSup = await supervisor.agent
      .post('/api/v1/billing/checkout')
      .set('x-csrf-token', supervisor.csrf)
      .send({ planCode: 'THESISPARTNER_PRO_MONTHLY', idempotencyKey: `sup2-${stamp}` });
    expect(afterSup.status).toBe(403);
  });
});
