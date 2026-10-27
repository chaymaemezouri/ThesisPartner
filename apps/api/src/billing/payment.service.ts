import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PaymentEnvironment, type PaymentStatus, type PlanCode } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { BillingMailer } from './billing-mailer';
import { BillingService } from './billing.service';
import { addUtcDays, periodEnd } from './billing.util';
import { InvoiceService } from './invoice.service';
import { MockPaymentProvider } from './mock-payment.provider';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type VerifiedPaymentEvent,
} from './payment-provider';

const OPEN_SUB = ['PENDING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'] as const;
const OPEN_PAY = ['PENDING', 'PROCESSING'] as const;

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly billing: BillingService,
    private readonly invoices: InvoiceService,
    private readonly mail: BillingMailer,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  checkoutAvailable() {
    return this.provider.checkoutAvailable;
  }

  async checkout(userId: string, planCode: PlanCode, idempotencyKey: string, requestId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.disabledAt) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    if (!user.emailVerifiedAt) {
      throw new AppException(403, 'FORBIDDEN', 'Verify your email before paying');
    }
    if (await this.isSupervisorOnly(userId)) {
      throw new AppException(403, 'FORBIDDEN', 'Supervisors do not hold a personal subscription');
    }
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan?.active) throw new AppException(404, 'NOT_FOUND', 'Plan not found');
    const amountMinor = plan.priceMad * 100;
    const now = new Date();

    const existingKey = await this.prisma.payment.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    if (existingKey) {
      if (existingKey.planId !== plan.id) {
        throw new AppException(409, 'CONFLICT', 'Idempotency key already used for another plan');
      }
      return this.toCheckoutDto(existingKey);
    }

    const openPay = await this.prisma.payment.findFirst({
      where: {
        userId,
        status: { in: [...OPEN_PAY] },
        OR: [{ checkoutExpiresAt: null }, { checkoutExpiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (openPay) return this.toCheckoutDto(openPay);

    if (!this.provider.checkoutAvailable) {
      throw new AppException(409, 'CONFLICT', 'Online payment is not available yet');
    }

    const current = await this.prisma.subscription.findFirst({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (current && current.status === 'PENDING' && current.planId !== plan.id) {
      throw new AppException(
        409,
        'CONFLICT',
        'An incompatible pending subscription already exists',
      );
    }
    if (
      current &&
      OPEN_SUB.includes(current.status as (typeof OPEN_SUB)[number]) &&
      current.status !== 'PENDING' &&
      current.planId !== plan.id
    ) {
      throw new AppException(409, 'CONFLICT', 'An incompatible paid subscription already exists');
    }

    const subscriptionId =
      current && OPEN_SUB.includes(current.status as (typeof OPEN_SUB)[number])
        ? current.id
        : (
            await this.prisma.subscription.create({
              data: { userId, planId: plan.id, status: 'PENDING' },
            })
          ).id;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        subscriptionId,
        planId: plan.id,
        provider: this.provider.id,
        idempotencyKey,
        amountMinor,
        currency: 'MAD',
        status: 'PENDING',
        environment: this.provider.environment,
      },
    });

    const session = await this.provider.createCheckoutSession({
      paymentId: payment.id,
      userId,
      amountMinor,
      currency: 'MAD',
      planCode,
      returnUrl: `${this.env.APP_URL}/abonnement?payment=${payment.id}`,
      cancelUrl: `${this.env.APP_URL}/abonnement?payment=${payment.id}&cancelled=1`,
    });

    const saved = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: session.providerPaymentId,
        checkoutSessionId: session.checkoutSessionId,
        checkoutUrl: session.checkoutUrl,
        checkoutExpiresAt: session.expiresAt,
      },
    });
    await this.audit.record(this.prisma, {
      actorId: userId,
      action: 'billing.checkout_created',
      entityType: 'payment',
      entityId: saved.id,
      requestId,
      metadata: {
        planCode,
        amountMinor,
        environment: saved.environment,
        provider: saved.provider,
      },
    });
    return this.toCheckoutDto(saved);
  }

  async handleWebhook(
    providerId: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ) {
    if (providerId !== this.provider.id) {
      throw new AppException(404, 'NOT_FOUND', 'Unknown payment provider');
    }
    const verified = await this.provider.verifyWebhook({ headers, rawBody });
    return this.persistAndProcess(verified);
  }

  async retryEvent(actorId: string, eventId: string, requestId?: string) {
    const event = await this.prisma.paymentEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new AppException(404, 'NOT_FOUND', 'Payment event not found');
    if (event.processingStatus === 'PROCESSED' || event.processingStatus === 'IGNORED') {
      return { received: true as const, duplicate: true };
    }
    if (!event.payload || typeof event.payload !== 'object') {
      throw new AppException(409, 'CONFLICT', 'Event payload cannot be replayed');
    }
    const payload = event.payload as Record<string, unknown>;
    await this.audit.record(this.prisma, {
      actorId,
      action: 'billing.payment_event_retried',
      entityType: 'payment_event',
      entityId: event.id,
      requestId,
    });
    return this.processVerified(
      {
        provider: event.provider,
        externalEventId: event.externalEventId,
        eventType: event.eventType,
        providerPaymentId: String(payload.providerPaymentId ?? ''),
        checkoutSessionId:
          typeof payload.checkoutSessionId === 'string' ? payload.checkoutSessionId : undefined,
        amountMinor: Number(payload.amountMinor ?? 0),
        currency: String(payload.currency ?? 'MAD'),
        environment: event.environment,
        occurredAt: event.receivedAt,
        refundedAmountMinor:
          typeof payload.refundedAmountMinor === 'number' ? payload.refundedAmountMinor : undefined,
      },
      event.id,
    );
  }

  async getOwnedPayment(userId: string, paymentId: string) {
    const row = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { plan: true },
    });
    if (!row || row.userId !== userId)
      throw new AppException(404, 'NOT_FOUND', 'Payment not found');
    return this.toDto(row);
  }

  async listForUser(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [total, rows] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { payments: rows.map((row) => this.toDto(row)), page, pageSize, total };
  }

  async adminList(query: {
    search?: string;
    status?: PaymentStatus;
    environment?: PaymentEnvironment;
    from?: Date;
    to?: Date;
    page: number;
    pageSize: number;
  }) {
    const search = query.search?.trim();
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.environment ? { environment: query.environment } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            user: {
              OR: [
                { email: { contains: search.toLowerCase(), mode: 'insensitive' } },
                { profile: { displayName: { contains: search, mode: 'insensitive' } } },
              ],
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: { plan: true, user: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      payments: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        email: row.user.email,
        displayName: row.user.profile?.displayName ?? row.user.email,
        planCode: row.plan.code,
        amountMinor: row.amountMinor,
        currency: 'MAD' as const,
        status: row.status,
        environment: row.environment,
        provider: row.provider,
        createdAt: row.createdAt.toISOString(),
        confirmedAt: row.confirmedAt?.toISOString() ?? null,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async adminEvents(query: {
    processingStatus?: 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED';
    page: number;
    pageSize: number;
  }) {
    const where = query.processingStatus ? { processingStatus: query.processingStatus } : {};
    const [total, rows] = await Promise.all([
      this.prisma.paymentEvent.count({ where }),
      this.prisma.paymentEvent.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      events: rows.map((row) => ({
        id: row.id,
        provider: row.provider,
        environment: row.environment,
        externalEventId: row.externalEventId,
        eventType: row.eventType,
        processingStatus: row.processingStatus,
        paymentId: row.paymentId,
        errorCode: row.errorCode,
        receivedAt: row.receivedAt.toISOString(),
        processedAt: row.processedAt?.toISOString() ?? null,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async exportCsv(query: {
    search?: string;
    status?: PaymentStatus;
    environment?: PaymentEnvironment;
  }): Promise<string> {
    const list = await this.adminList({ ...query, page: 1, pageSize: 100 });
    const header = 'id,email,plan,amount_minor,currency,status,environment,created_at,confirmed_at';
    const lines = list.payments.map(
      (row) =>
        `${row.id},${row.email},${row.planCode},${row.amountMinor},${row.currency},${row.status},${row.environment},${row.createdAt},${row.confirmedAt ?? ''}`,
    );
    return `${header}\n${lines.join('\n')}\n`;
  }

  async refund(
    actorId: string,
    paymentId: string,
    reason: string,
    amountMinor?: number,
    requestId?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment?.providerPaymentId) throw new AppException(404, 'NOT_FOUND', 'Payment not found');
    if (payment.status !== 'SUCCEEDED' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new AppException(409, 'CONFLICT', 'Only a confirmed payment can be refunded');
    }
    if (!this.provider.refund) {
      throw new AppException(409, 'CONFLICT', 'Refunds are not available for this provider');
    }
    const refund = await this.provider.refund({
      providerPaymentId: payment.providerPaymentId,
      amountMinor,
    });
    const eventType =
      refund.amountMinor >= payment.amountMinor - payment.refundedAmountMinor
        ? 'payment.refunded'
        : 'payment.partially_refunded';
    await this.audit.record(this.prisma, {
      actorId,
      action: 'billing.refund_requested',
      entityType: 'payment',
      entityId: payment.id,
      requestId,
      metadata: { reason, amountMinor: refund.amountMinor },
    });
    return this.persistAndProcess({
      provider: this.provider.id,
      externalEventId: `refund_${refund.refundId}`,
      eventType,
      providerPaymentId: payment.providerPaymentId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      environment: payment.environment,
      occurredAt: new Date(),
      refundedAmountMinor: refund.amountMinor,
    });
  }

  async mockComplete(userId: string, sessionId: string, _requestId?: string) {
    if (this.env.NODE_ENV === 'production' || !(this.provider instanceof MockPaymentProvider)) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }
    const session = this.provider.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppException(404, 'NOT_FOUND', 'Checkout session not found');
    }
    const scenario = this.provider.scenario;
    const outcomes = outcomesFor(scenario);
    let last: { received: true; duplicate: boolean } = { received: true, duplicate: false };
    for (const outcome of outcomes) {
      if (outcome.delay) continue;
      const marked = this.provider.markStatus(sessionId, outcome.status);
      const event = this.provider.buildEvent(marked, outcome.eventType, {
        refundedAmountMinor: outcome.refundedAmountMinor,
        externalEventId: outcome.externalEventId,
      });
      last = await this.persistAndProcess(event);
    }
    return last;
  }

  async mockSession(userId: string, sessionId: string) {
    if (this.env.NODE_ENV === 'production' || !(this.provider instanceof MockPaymentProvider)) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }
    const session = this.provider.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppException(404, 'NOT_FOUND', 'Checkout session not found');
    }
    const payment = await this.prisma.payment.findUnique({
      where: { id: session.paymentId },
      include: { plan: true },
    });
    if (!payment) throw new AppException(404, 'NOT_FOUND', 'Payment not found');
    return {
      sessionId,
      paymentId: payment.id,
      amountMinor: session.amountMinor,
      currency: 'MAD' as const,
      planCode: payment.plan.code,
      environment: 'TEST' as const,
      status: payment.status,
    };
  }

  async notifyUpcoming(now = new Date()) {
    const settings = await this.billing.settings();
    const soon = addUtcDays(now, 7);
    const rows = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
        currentPeriodEnd: { gte: now, lte: soon },
      },
      include: { user: true, plan: true },
    });
    for (const row of rows) {
      if (!row.currentPeriodEnd) continue;
      const days = Math.ceil((row.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000);
      const keys =
        days <= 1
          ? (['J-7', 'J-3', 'J-1'] as const)
          : days <= 3
            ? (['J-7', 'J-3'] as const)
            : (['J-7'] as const);
      for (const key of keys) {
        await this.mail.sendOnce({
          userId: row.userId,
          email: row.user.email,
          eventKey: `notify.subscription.${key}:${row.id}:${row.currentPeriodEnd.toISOString().slice(0, 10)}`,
          subject: 'Votre abonnement ThesisPartner arrive à échéance',
          text: `Couverture ${row.plan.name} jusqu’au ${row.currentPeriodEnd.toISOString()}. Renouvelez depuis /abonnement.`,
          test: false,
        });
      }
    }
    const graceEnded = await this.prisma.subscription.findMany({
      where: { status: 'EXPIRED', gracePeriodEndsAt: { lte: now, gte: addUtcDays(now, -1) } },
      include: { user: true },
    });
    for (const row of graceEnded) {
      await this.mail.sendOnce({
        userId: row.userId,
        email: row.user.email,
        eventKey: `notify.subscription.grace_ended:${row.id}`,
        subject: 'Période de grâce terminée',
        text: 'La période de grâce est terminée. Vos données restent consultables en lecture seule.',
        test: false,
      });
    }
    return {
      reminded: rows.length,
      graceNotices: graceEnded.length,
      graceDays: settings.graceDays,
    };
  }

  private async persistAndProcess(verified: VerifiedPaymentEvent) {
    try {
      const created = await this.prisma.paymentEvent.create({
        data: {
          provider: verified.provider,
          environment: verified.environment,
          externalEventId: verified.externalEventId,
          eventType: verified.eventType,
          processingStatus: 'RECEIVED',
          payload: JSON.parse(JSON.stringify(verified)) as Prisma.InputJsonValue,
        },
      });
      return this.processVerified(verified, created.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { received: true as const, duplicate: true };
      }
      throw error;
    }
  }

  private async processVerified(verified: VerifiedPaymentEvent, eventId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: verified.provider,
        environment: verified.environment,
        providerPaymentId: verified.providerPaymentId,
      },
      include: { plan: true, user: true, subscription: true },
    });
    if (!payment) {
      await this.prisma.paymentEvent.update({
        where: { id: eventId },
        data: {
          processingStatus: 'FAILED',
          errorCode: 'PAYMENT_NOT_FOUND',
          processedAt: new Date(),
        },
      });
      throw new AppException(400, 'BAD_REQUEST', 'Payment reference not found');
    }
    if (verified.amountMinor !== payment.amountMinor || verified.currency !== payment.currency) {
      await this.prisma.paymentEvent.update({
        where: { id: eventId },
        data: {
          paymentId: payment.id,
          processingStatus: 'FAILED',
          errorCode: 'AMOUNT_MISMATCH',
          processedAt: new Date(),
        },
      });
      throw new AppException(400, 'BAD_REQUEST', 'Payment amount or currency mismatch');
    }
    if (verified.environment !== payment.environment) {
      await this.prisma.paymentEvent.update({
        where: { id: eventId },
        data: {
          paymentId: payment.id,
          processingStatus: 'FAILED',
          errorCode: 'ENVIRONMENT_MISMATCH',
          processedAt: new Date(),
        },
      });
      throw new AppException(400, 'BAD_REQUEST', 'Payment environment mismatch');
    }

    const now = new Date();
    const outcome = transition(payment.status, verified.eventType);
    if (outcome.ignore) {
      await this.prisma.paymentEvent.update({
        where: { id: eventId },
        data: {
          paymentId: payment.id,
          processingStatus: 'IGNORED',
          errorCode: outcome.reason,
          processedAt: now,
        },
      });
      return { received: true as const, duplicate: false };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentEvent.update({
          where: { id: eventId },
          data: { paymentId: payment.id, processingStatus: 'PROCESSED', processedAt: now },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: outcome.status,
            confirmedAt:
              outcome.status === 'SUCCEEDED' ? (payment.confirmedAt ?? now) : payment.confirmedAt,
            failedAt:
              outcome.status === 'FAILED' || outcome.status === 'CANCELLED'
                ? now
                : payment.failedAt,
            refundedAt:
              outcome.status === 'REFUNDED' || outcome.status === 'PARTIALLY_REFUNDED'
                ? now
                : payment.refundedAt,
            refundedAmountMinor:
              verified.refundedAmountMinor != null
                ? payment.refundedAmountMinor + verified.refundedAmountMinor
                : payment.refundedAmountMinor,
            failureCode: outcome.status === 'FAILED' ? verified.eventType : payment.failureCode,
          },
        });
        if (outcome.status === 'SUCCEEDED' && payment.status !== 'SUCCEEDED') {
          await this.activateFromPayment(
            tx,
            payment.id,
            payment.userId,
            payment.subscriptionId,
            now,
          );
        }
        if (outcome.status === 'REFUNDED' || outcome.status === 'PARTIALLY_REFUNDED') {
          await tx.subscriptionEvent.create({
            data: {
              userId: payment.userId,
              subscriptionId: payment.subscriptionId,
              type: 'payment.refunded',
              metadata: {
                paymentId: payment.id,
                amountMinor: verified.refundedAmountMinor ?? payment.amountMinor,
                policy: 'keep_paid_period',
              },
            },
          });
          await tx.subscription.update({
            where: { id: payment.subscriptionId },
            data: { cancelAtPeriodEnd: true },
          });
        }
      });
    } catch (error) {
      await this.prisma.paymentEvent.update({
        where: { id: eventId },
        data: { processingStatus: 'FAILED', errorCode: 'PROCESSING_ERROR', processedAt: now },
      });
      throw error;
    }

    if (outcome.status === 'SUCCEEDED' && payment.status !== 'SUCCEEDED') {
      const invoice = await this.invoices.issueForPayment(payment.id, 'INVOICE');
      await this.notifyPayment(payment.userId, payment.user.email, payment.environment === 'TEST', {
        confirmed: true,
        invoiceNumber: invoice.invoiceNumber,
        paymentId: payment.id,
      });
    }
    if (outcome.status === 'FAILED' || outcome.status === 'CANCELLED') {
      await this.notifyPayment(payment.userId, payment.user.email, payment.environment === 'TEST', {
        confirmed: false,
        paymentId: payment.id,
      });
    }
    if (outcome.status === 'REFUNDED' || outcome.status === 'PARTIALLY_REFUNDED') {
      await this.invoices.issueForPayment(payment.id, 'CREDIT_NOTE');
    }
    return { received: true as const, duplicate: false };
  }

  private async activateFromPayment(
    tx: Prisma.TransactionClient,
    paymentId: string,
    userId: string,
    subscriptionId: string,
    now: Date,
  ) {
    const settings = await tx.billingSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', trialDays: 30, graceDays: 7 },
    });
    const subscription = await tx.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    const stillCovered =
      subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now.getTime();
    const periodStart = stillCovered ? subscription.currentPeriodEnd! : now;
    const periodEndAt = periodEnd(periodStart, subscription.plan.interval);
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        activatedAt: subscription.activatedAt ?? now,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEndAt,
        gracePeriodEndsAt: addUtcDays(periodEndAt, settings.graceDays),
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });
    const theses = await tx.thesisMembership.findMany({
      where: { userId, role: 'DOCTORAL_STUDENT' },
      select: { thesisId: true },
    });
    for (const membership of theses) {
      await tx.thesisSubscriptionCoverage.upsert({
        where: { thesisId: membership.thesisId },
        update: { subscriptionId: subscription.id },
        create: { thesisId: membership.thesisId, subscriptionId: subscription.id },
      });
    }
    await tx.subscriptionEvent.create({
      data: {
        userId,
        actorId: userId,
        subscriptionId: subscription.id,
        type: stillCovered ? 'subscription.renewed' : 'subscription.activated_by_payment',
        metadata: {
          paymentId,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEndAt.toISOString(),
        },
      },
    });
    await this.audit.record(tx, {
      actorId: userId,
      action: stillCovered ? 'billing.subscription_renewed' : 'billing.subscription_activated',
      entityType: 'subscription',
      entityId: subscription.id,
      metadata: { paymentId, source: 'verified_payment' },
    });
  }

  private async notifyPayment(
    userId: string,
    email: string,
    test: boolean,
    input: { confirmed: boolean; paymentId: string; invoiceNumber?: string },
  ) {
    if (input.confirmed) {
      await this.mail.sendOnce({
        userId,
        email,
        eventKey: `notify.payment.confirmed:${input.paymentId}`,
        subject: test ? 'Paiement de test confirmé' : 'Paiement confirmé',
        text: test
          ? `Votre paiement de simulation a été confirmé. Aucun encaissement réel n'a eu lieu.`
          : `Votre paiement ThesisPartner Pro a été confirmé. Facture ${input.invoiceNumber ?? ''}.`,
        test,
        metadata: { paymentId: input.paymentId },
      });
      await this.mail.sendOnce({
        userId,
        email,
        eventKey: `notify.subscription.activated:${input.paymentId}`,
        subject: 'Abonnement ThesisPartner Pro activé',
        text: 'Votre couverture Pro est active. L’encadrant autorisé conserve l’accès de supervision sans paiement.',
        test,
      });
      if (input.invoiceNumber) {
        await this.mail.sendOnce({
          userId,
          email,
          eventKey: `notify.invoice.available:${input.paymentId}`,
          subject: 'Document de facturation disponible',
          text: `Le document ${input.invoiceNumber} est disponible dans /abonnement.`,
          test,
        });
      }
      return;
    }
    await this.mail.sendOnce({
      userId,
      email,
      eventKey: `notify.payment.failed:${input.paymentId}`,
      subject: 'Paiement non abouti',
      text: 'Le paiement n’a pas été confirmé. Vous pouvez relancer un checkout depuis /abonnement.',
      test,
    });
  }

  private async isSupervisorOnly(userId: string) {
    const memberships = await this.prisma.thesisMembership.findMany({
      where: { userId },
      select: { role: true },
    });
    return memberships.length > 0 && memberships.every((item) => item.role === 'SUPERVISOR');
  }

  private toCheckoutDto(row: {
    id: string;
    amountMinor: number;
    status: PaymentStatus;
    environment: PaymentEnvironment;
    checkoutUrl: string | null;
    checkoutExpiresAt: Date | null;
  }) {
    return {
      paymentId: row.id,
      checkoutUrl: row.checkoutUrl,
      status: row.status,
      amountMinor: row.amountMinor,
      currency: 'MAD' as const,
      environment: row.environment,
      expiresAt: row.checkoutExpiresAt?.toISOString() ?? null,
      checkoutAvailable: this.provider.checkoutAvailable,
    };
  }

  toDto(row: {
    id: string;
    amountMinor: number;
    refundedAmountMinor: number;
    status: PaymentStatus;
    environment: PaymentEnvironment;
    provider: string;
    createdAt: Date;
    confirmedAt: Date | null;
    plan: { code: PlanCode };
  }) {
    return {
      id: row.id,
      planCode: row.plan.code,
      amountMinor: row.amountMinor,
      refundedAmountMinor: row.refundedAmountMinor,
      currency: 'MAD' as const,
      status: row.status,
      environment: row.environment,
      provider: row.provider,
      createdAt: row.createdAt.toISOString(),
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
    };
  }
}

function transition(
  current: PaymentStatus,
  eventType: string,
): {
  status: PaymentStatus;
  ignore?: boolean;
  reason?: string;
} {
  if (eventType === 'payment.succeeded') {
    if (current === 'SUCCEEDED' || current === 'REFUNDED' || current === 'PARTIALLY_REFUNDED') {
      return { status: current, ignore: true, reason: 'ALREADY_FINAL' };
    }
    return { status: 'SUCCEEDED' };
  }
  if (eventType === 'payment.failed') {
    if (current === 'SUCCEEDED' || current === 'REFUNDED' || current === 'PARTIALLY_REFUNDED') {
      return { status: current, ignore: true, reason: 'OUT_OF_ORDER' };
    }
    return { status: 'FAILED' };
  }
  if (eventType === 'payment.cancelled') {
    if (current === 'PENDING' || current === 'PROCESSING') return { status: 'CANCELLED' };
    return { status: current, ignore: true, reason: 'OUT_OF_ORDER' };
  }
  if (eventType === 'payment.pending' || eventType === 'payment.created') {
    if (current === 'PENDING') return { status: 'PROCESSING' };
    return { status: current, ignore: true, reason: 'OUT_OF_ORDER' };
  }
  if (eventType === 'payment.refunded') {
    if (current === 'SUCCEEDED' || current === 'PARTIALLY_REFUNDED') return { status: 'REFUNDED' };
    return { status: current, ignore: true, reason: 'OUT_OF_ORDER' };
  }
  if (eventType === 'payment.partially_refunded') {
    if (current === 'SUCCEEDED' || current === 'PARTIALLY_REFUNDED')
      return { status: 'PARTIALLY_REFUNDED' };
    return { status: current, ignore: true, reason: 'OUT_OF_ORDER' };
  }
  return { status: current, ignore: true, reason: 'UNKNOWN_EVENT' };
}

function outcomesFor(scenario: Env['MOCK_PAYMENT_SCENARIO']): Array<{
  eventType: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  refundedAmountMinor?: number;
  externalEventId?: string;
  delay?: boolean;
}> {
  switch (scenario) {
    case 'decline':
      return [{ eventType: 'payment.failed', status: 'FAILED' }];
    case 'cancel':
      return [{ eventType: 'payment.cancelled', status: 'CANCELLED' }];
    case 'pending':
    case 'delayed':
      return [
        { eventType: 'payment.pending', status: 'PROCESSING', delay: scenario === 'delayed' },
      ];
    case 'duplicate':
      return [
        { eventType: 'payment.succeeded', status: 'SUCCEEDED', externalEventId: 'mock_dup_1' },
        { eventType: 'payment.succeeded', status: 'SUCCEEDED', externalEventId: 'mock_dup_1' },
      ];
    case 'out_of_order':
      return [
        { eventType: 'payment.succeeded', status: 'SUCCEEDED' },
        { eventType: 'payment.created', status: 'SUCCEEDED' },
      ];
    case 'refund':
      return [
        { eventType: 'payment.succeeded', status: 'SUCCEEDED' },
        { eventType: 'payment.refunded', status: 'REFUNDED', refundedAmountMinor: undefined },
      ];
    case 'renewal_fail':
      return [{ eventType: 'payment.failed', status: 'FAILED' }];
    default:
      return [{ eventType: 'payment.succeeded', status: 'SUCCEEDED' }];
  }
}
