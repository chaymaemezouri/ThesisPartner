import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PlanCode } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { BillingMailer } from './billing-mailer';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider';
import {
  addUtcDays,
  daysRemaining,
  periodEnd,
  refreshSubscriptionStatus,
  trialProgressPercent,
  trialReminders,
  trialStatusAt,
} from './billing.util';
import { SubscriptionAccessService } from './subscription-access.service';

const OPEN_SUB_STATUSES = ['PENDING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'] as const;

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: SubscriptionAccessService,
    private readonly mail: BillingMailer,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  async status(userId: string) {
    const now = new Date();
    const [trial, sub, plans, memberships] = await Promise.all([
      this.ensureTrialRow(userId),
      this.currentSubscription(userId, now),
      this.listPlans(false),
      this.prisma.thesisMembership.findMany({
        where: { userId },
        select: { role: true },
      }),
    ]);
    const roles = new Set(memberships.map((item) => item.role));
    const roleHint =
      roles.has('DOCTORAL_STUDENT') && roles.has('SUPERVISOR')
        ? 'MIXED'
        : roles.has('SUPERVISOR')
          ? 'SUPERVISOR'
          : roles.has('DOCTORAL_STUDENT')
            ? 'DOCTORAL_STUDENT'
            : 'NONE';
    const trialView = this.toTrialDto(trial, now, roleHint !== 'SUPERVISOR');
    return {
      roleHint,
      trial: trialView,
      subscription: this.toSubscriptionDto(sub),
      coverage: await this.access.userWriteSnapshot(userId, now),
      plans: plans.plans,
    };
  }

  async startTrial(userId: string, requestId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { select: { role: true } } },
    });
    if (!user || user.disabledAt) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    const existingTrial = await this.prisma.trial.findUnique({ where: { userId } });
    if (
      existingTrial?.startedAt ||
      existingTrial?.status === 'ACTIVE' ||
      existingTrial?.status === 'EXPIRED'
    ) {
      throw new AppException(409, 'CONFLICT', 'This account already used its trial');
    }
    if (!user.emailVerifiedAt) {
      throw new AppException(403, 'FORBIDDEN', 'Verify your email before starting the trial');
    }
    const onlySupervisor =
      user.memberships.length > 0 && user.memberships.every((item) => item.role === 'SUPERVISOR');
    if (onlySupervisor) {
      throw new AppException(403, 'FORBIDDEN', 'Supervisors do not start a personal trial');
    }
    const settings = await this.settings();
    const now = new Date();
    try {
      const trial = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.trial.findUnique({ where: { userId } });
        if (
          existing?.status === 'ACTIVE' ||
          existing?.status === 'EXPIRED' ||
          existing?.startedAt
        ) {
          throw new AppException(409, 'CONFLICT', 'This account already used its trial');
        }
        const startedAt = now;
        const expiresAt = addUtcDays(startedAt, settings.trialDays);
        const saved = existing
          ? await tx.trial.update({
              where: { id: existing.id },
              data: { status: 'ACTIVE', startedAt, expiresAt },
            })
          : await tx.trial.create({
              data: { userId, status: 'ACTIVE', startedAt, expiresAt },
            });
        await tx.subscriptionEvent.create({
          data: {
            userId,
            actorId: userId,
            trialId: saved.id,
            type: 'trial.started',
            metadata: { expiresAt: expiresAt.toISOString(), trialDays: settings.trialDays },
          },
        });
        await this.audit.record(tx, {
          actorId: userId,
          action: 'billing.trial_started',
          entityType: 'trial',
          entityId: saved.id,
          requestId,
        });
        return saved;
      });
      return this.toTrialDto(trial, now, true);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(409, 'CONFLICT', 'This account already used its trial');
      }
      throw error;
    }
  }

  async listPlans(activeOnly = true) {
    const rows = await this.prisma.plan.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { interval: 'asc' },
    });
    return { plans: rows.map(this.toPlanDto) };
  }

  async selectPlan(userId: string, planCode: PlanCode, requestId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.emailVerifiedAt) {
      throw new AppException(403, 'FORBIDDEN', 'Verify your email before choosing a plan');
    }
    const onlySupervisor = await this.isSupervisorOnly(userId);
    if (onlySupervisor) {
      throw new AppException(403, 'FORBIDDEN', 'Supervisors do not hold a personal subscription');
    }
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan?.active) throw new AppException(404, 'NOT_FOUND', 'Plan not found');
    const now = new Date();
    const current = await this.currentSubscription(userId, now);
    if (
      current &&
      OPEN_SUB_STATUSES.includes(current.status as (typeof OPEN_SUB_STATUSES)[number])
    ) {
      if (current.planId === plan.id && current.status === 'PENDING') {
        return this.toSubscriptionDto(current);
      }
      throw new AppException(409, 'CONFLICT', 'An open subscription already exists');
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: { userId, planId: plan.id, status: 'PENDING' },
        include: { plan: true },
      });
      await tx.subscriptionEvent.create({
        data: {
          userId,
          actorId: userId,
          subscriptionId: subscription.id,
          type: 'subscription.plan_selected',
          metadata: { planCode, payment: 'not_captured' },
        },
      });
      await this.audit.record(tx, {
        actorId: userId,
        action: 'billing.plan_selected',
        entityType: 'subscription',
        entityId: subscription.id,
        requestId,
        metadata: { planCode },
      });
      return subscription;
    });
    return this.toSubscriptionDto(created);
  }

  async cancelAtPeriodEnd(userId: string, requestId?: string) {
    const now = new Date();
    const current = await this.currentSubscription(userId, now);
    if (!current || current.status !== 'ACTIVE') {
      throw new AppException(409, 'CONFLICT', 'No active subscription to cancel');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.subscription.update({
        where: { id: current.id },
        data: { cancelAtPeriodEnd: true, cancelledAt: now },
        include: { plan: true },
      });
      await tx.subscriptionEvent.create({
        data: {
          userId,
          actorId: userId,
          subscriptionId: row.id,
          type: 'subscription.cancel_at_period_end',
        },
      });
      await this.audit.record(tx, {
        actorId: userId,
        action: 'billing.subscription_cancel_requested',
        entityType: 'subscription',
        entityId: row.id,
        requestId,
      });
      return row;
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user) {
      await this.mail.sendOnce({
        userId,
        email: user.email,
        eventKey: `notify.subscription.cancelled:${updated.id}`,
        subject: 'Résiliation confirmée',
        text: 'Votre abonnement sera résilié à l’échéance. Les données scientifiques restent conservées.',
        test: false,
      });
    }
    return this.toSubscriptionDto(updated);
  }

  async events(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [total, rows] = await Promise.all([
      this.prisma.subscriptionEvent.count({ where }),
      this.prisma.subscriptionEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      events: rows.map((row) => ({
        id: row.id,
        type: row.type,
        createdAt: row.createdAt.toISOString(),
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      })),
      page,
      pageSize,
      total,
    };
  }

  async stats() {
    const now = new Date();
    await this.expireDue(now);
    const [
      trialsNotStarted,
      trialsActive,
      trialsExpired,
      subscriptionsPending,
      subscriptionsActive,
      subscriptionsGrace,
      subscriptionsExpired,
      subscriptionsCancelled,
      startedTrials,
      paidFromTrial,
      liveCollected,
      liveRefunded,
      testPaymentCount,
      paymentsPending,
      paymentsFailed,
      expiringSoon,
    ] = await Promise.all([
      this.prisma.trial.count({ where: { status: 'NOT_STARTED' } }),
      this.prisma.trial.count({ where: { status: 'ACTIVE' } }),
      this.prisma.trial.count({ where: { status: 'EXPIRED' } }),
      this.prisma.subscription.count({ where: { status: 'PENDING' } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: { in: ['GRACE_PERIOD', 'PAST_DUE'] } } }),
      this.prisma.subscription.count({ where: { status: 'EXPIRED' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      this.prisma.trial.count({ where: { startedAt: { not: null } } }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE', user: { trial: { startedAt: { not: null } } } },
      }),
      this.prisma.payment.aggregate({
        where: {
          environment: 'LIVE',
          status: { in: ['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
        },
        _sum: { amountMinor: true },
      }),
      this.prisma.payment.aggregate({
        where: { environment: 'LIVE', status: { in: ['REFUNDED', 'PARTIALLY_REFUNDED'] } },
        _sum: { refundedAmountMinor: true },
      }),
      this.prisma.payment.count({ where: { environment: 'TEST' } }),
      this.prisma.payment.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
      this.prisma.payment.count({ where: { status: 'FAILED' } }),
      this.prisma.subscription.count({
        where: {
          status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
          currentPeriodEnd: { lte: addUtcDays(now, 7), gte: now },
        },
      }),
    ]);
    const liveCollectedMinor = liveCollected._sum.amountMinor ?? 0;
    const liveRefundedMinor = liveRefunded._sum.refundedAmountMinor ?? 0;
    const liveNetMinor = liveCollectedMinor - liveRefundedMinor;
    const conversionStartedToPaid =
      startedTrials === 0 ? 0 : Math.round((paidFromTrial / startedTrials) * 1000) / 10;
    return {
      trialsNotStarted,
      trialsActive,
      trialsExpired,
      subscriptionsPending,
      subscriptionsActive,
      subscriptionsGrace,
      subscriptionsExpired,
      subscriptionsCancelled,
      conversionStartedToPaid,
      liveCollectedMinor,
      liveRefundedMinor,
      liveNetMinor,
      testPaymentCount,
      paymentsPending,
      paymentsFailed,
      expiringSoon,
    };
  }

  async settings() {
    return this.prisma.billingSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', trialDays: 30, graceDays: 7 },
    });
  }

  async updateSettings(
    actorId: string,
    body: {
      trialDays?: number;
      graceDays?: number;
      taxBps?: number;
      invoicePrefix?: string;
      issuerName?: string | null;
      issuerAddress?: string | null;
      issuerLegalId?: string | null;
      issuerEmail?: string | null;
    },
    requestId?: string,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.billingSettings.upsert({
        where: { id: 'default' },
        update: {
          ...(body.trialDays != null ? { trialDays: body.trialDays } : {}),
          ...(body.graceDays != null ? { graceDays: body.graceDays } : {}),
          ...(body.taxBps != null ? { taxBps: body.taxBps } : {}),
          ...(body.invoicePrefix != null ? { invoicePrefix: body.invoicePrefix } : {}),
          ...(body.issuerName !== undefined ? { issuerName: body.issuerName } : {}),
          ...(body.issuerAddress !== undefined ? { issuerAddress: body.issuerAddress } : {}),
          ...(body.issuerLegalId !== undefined ? { issuerLegalId: body.issuerLegalId } : {}),
          ...(body.issuerEmail !== undefined ? { issuerEmail: body.issuerEmail } : {}),
        },
        create: {
          id: 'default',
          trialDays: body.trialDays ?? 30,
          graceDays: body.graceDays ?? 7,
          taxBps: body.taxBps ?? 0,
          invoicePrefix: body.invoicePrefix ?? 'TP',
          issuerName: body.issuerName ?? null,
          issuerAddress: body.issuerAddress ?? null,
          issuerLegalId: body.issuerLegalId ?? null,
          issuerEmail: body.issuerEmail ?? null,
        },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'billing.settings_updated',
        entityType: 'billing_settings',
        entityId: row.id,
        requestId,
        metadata: body,
      });
      return row;
    });
    return this.toSettingsDto(updated);
  }

  toSettingsDto(row: {
    trialDays: number;
    graceDays: number;
    taxBps: number;
    invoicePrefix: string;
    issuerName: string | null;
    issuerAddress: string | null;
    issuerLegalId: string | null;
    issuerEmail: string | null;
    updatedAt: Date;
  }) {
    return {
      trialDays: row.trialDays,
      graceDays: row.graceDays,
      taxBps: row.taxBps,
      invoicePrefix: row.invoicePrefix,
      issuerName: row.issuerName,
      issuerAddress: row.issuerAddress,
      issuerLegalId: row.issuerLegalId,
      issuerEmail: row.issuerEmail,
      legalConfigured: Boolean(row.issuerName?.trim() && row.issuerLegalId?.trim()),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updatePlan(
    actorId: string,
    planId: string,
    body: { priceMad?: number; active?: boolean; name?: string },
    requestId?: string,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppException(404, 'NOT_FOUND', 'Plan not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.plan.update({ where: { id: planId }, data: body });
      await this.audit.record(tx, {
        actorId,
        action: 'billing.plan_updated',
        entityType: 'plan',
        entityId: planId,
        requestId,
        metadata: body,
      });
      return row;
    });
    return this.toPlanDto(updated);
  }

  async listTrials(query: {
    search?: string;
    status?: 'NOT_STARTED' | 'ACTIVE' | 'EXPIRED';
    page: number;
    pageSize: number;
  }) {
    await this.expireDue(new Date());
    const where: Prisma.TrialWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? {
            user: {
              OR: [
                { email: { contains: query.search.trim().toLowerCase(), mode: 'insensitive' } },
                {
                  profile: {
                    displayName: { contains: query.search.trim(), mode: 'insensitive' },
                  },
                },
              ],
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.trial.count({ where }),
      this.prisma.trial.findMany({
        where,
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      trials: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        email: row.user.email,
        displayName: row.user.profile?.displayName ?? row.user.email,
        status: row.status,
        startedAt: row.startedAt?.toISOString() ?? null,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async listSubscriptions(query: {
    search?: string;
    status?: Prisma.SubscriptionWhereInput['status'];
    page: number;
    pageSize: number;
  }) {
    await this.expireDue(new Date());
    const where: Prisma.SubscriptionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? {
            user: {
              OR: [
                { email: { contains: query.search.trim().toLowerCase(), mode: 'insensitive' } },
                {
                  profile: {
                    displayName: { contains: query.search.trim(), mode: 'insensitive' },
                  },
                },
              ],
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        include: { user: { include: { profile: true } }, plan: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      subscriptions: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        email: row.user.email,
        displayName: row.user.profile?.displayName ?? row.user.email,
        planCode: row.plan.code,
        status: row.status,
        currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        createdAt: row.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async activateSubscription(
    actorId: string,
    subscriptionId: string,
    reason: string,
    requestId?: string,
  ) {
    const now = new Date();
    const settings = await this.settings();
    const row = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!row) throw new AppException(404, 'NOT_FOUND', 'Subscription not found');
    if (row.status === 'ACTIVE') return this.toSubscriptionDto(row);
    if (row.status === 'CANCELLED' || row.status === 'EXPIRED') {
      throw new AppException(409, 'CONFLICT', 'This subscription cannot be activated');
    }
    const periodStart = now;
    const periodEndAt = periodEnd(periodStart, row.plan.interval);
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.subscription.update({
        where: { id: row.id },
        data: {
          status: 'ACTIVE',
          activatedAt: now,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEndAt,
          gracePeriodEndsAt: addUtcDays(periodEndAt, settings.graceDays),
        },
        include: { plan: true },
      });
      const theses = await tx.thesisMembership.findMany({
        where: { userId: row.userId, role: 'DOCTORAL_STUDENT' },
        select: { thesisId: true },
      });
      for (const membership of theses) {
        await tx.thesisSubscriptionCoverage.upsert({
          where: { thesisId: membership.thesisId },
          update: { subscriptionId: saved.id },
          create: { thesisId: membership.thesisId, subscriptionId: saved.id },
        });
      }
      await tx.subscriptionEvent.create({
        data: {
          userId: row.userId,
          actorId,
          subscriptionId: saved.id,
          type: 'subscription.activated_by_admin',
          metadata: { reason, payment: 'not_captured' },
        },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'billing.subscription_activated',
        entityType: 'subscription',
        entityId: saved.id,
        requestId,
        metadata: { reason },
      });
      return saved;
    });
    return this.toSubscriptionDto(updated);
  }

  async markPastDue(actorId: string, subscriptionId: string, reason: string, requestId?: string) {
    const settings = await this.settings();
    const now = new Date();
    const row = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!row || row.status !== 'ACTIVE') {
      throw new AppException(409, 'CONFLICT', 'Only an active subscription can enter grace');
    }
    const graceEnds = addUtcDays(now, settings.graceDays);
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.subscription.update({
        where: { id: row.id },
        data: { status: 'GRACE_PERIOD', gracePeriodEndsAt: graceEnds },
        include: { plan: true },
      });
      await tx.subscriptionEvent.create({
        data: {
          userId: row.userId,
          actorId,
          subscriptionId: saved.id,
          type: 'subscription.grace_period',
          metadata: { reason, gracePeriodEndsAt: graceEnds.toISOString() },
        },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'billing.subscription_grace',
        entityType: 'subscription',
        entityId: saved.id,
        requestId,
        metadata: { reason },
      });
      return saved;
    });
    return this.toSubscriptionDto(updated);
  }

  async extendAccess(
    actorId: string,
    userId: string,
    days: number,
    reason: string,
    requestId?: string,
  ) {
    const trial = await this.ensureTrialRow(userId);
    const now = new Date();
    const base =
      trial.expiresAt && trial.expiresAt.getTime() > now.getTime() ? trial.expiresAt : now;
    const expiresAt = addUtcDays(base, days);
    const startedAt = trial.startedAt ?? now;
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.trial.update({
        where: { id: trial.id },
        data: { status: 'ACTIVE', startedAt, expiresAt },
      });
      await tx.subscriptionEvent.create({
        data: {
          userId,
          actorId,
          trialId: saved.id,
          type: 'trial.extended_by_admin',
          metadata: { days, reason, expiresAt: expiresAt.toISOString() },
        },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'billing.trial_extended',
        entityType: 'trial',
        entityId: saved.id,
        requestId,
        metadata: { days, reason },
      });
      return saved;
    });
    return this.toTrialDto(updated, now, true);
  }

  async adminEvents(query: { userId?: string; page: number; pageSize: number }) {
    const where = query.userId ? { userId: query.userId } : {};
    const [total, rows] = await Promise.all([
      this.prisma.subscriptionEvent.count({ where }),
      this.prisma.subscriptionEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      events: rows.map((row) => ({
        id: row.id,
        type: row.type,
        createdAt: row.createdAt.toISOString(),
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async ensureTrialRow(userId: string) {
    const existing = await this.prisma.trial.findUnique({ where: { userId } });
    if (existing) return existing;
    try {
      return await this.prisma.trial.create({ data: { userId, status: 'NOT_STARTED' } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.trial.findUniqueOrThrow({ where: { userId } });
      }
      throw error;
    }
  }

  private async currentSubscription(userId: string, now: Date) {
    const row = await this.prisma.subscription.findFirst({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    const status = refreshSubscriptionStatus({
      status: row.status,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      gracePeriodEndsAt: row.gracePeriodEndsAt,
      now,
    });
    if (status !== row.status) {
      return this.prisma.subscription.update({
        where: { id: row.id },
        data: { status },
        include: { plan: true },
      });
    }
    return row;
  }

  private async expireDue(now: Date) {
    await this.prisma.trial.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    await this.prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lte: now },
      },
      data: { status: 'CANCELLED' },
    });
    await this.prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: { lte: now },
      },
      data: { status: 'GRACE_PERIOD' },
    });
    await this.prisma.subscription.updateMany({
      where: {
        status: { in: ['GRACE_PERIOD', 'PAST_DUE'] },
        gracePeriodEndsAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });
  }

  private async isSupervisorOnly(userId: string) {
    const memberships = await this.prisma.thesisMembership.findMany({
      where: { userId },
      select: { role: true },
    });
    return memberships.length > 0 && memberships.every((item) => item.role === 'SUPERVISOR');
  }

  private toTrialDto(
    trial: {
      status: 'NOT_STARTED' | 'ACTIVE' | 'EXPIRED';
      startedAt: Date | null;
      expiresAt: Date | null;
    },
    now: Date,
    canStartRole: boolean,
  ) {
    const status = trialStatusAt({
      stored: trial.status,
      startedAt: trial.startedAt,
      expiresAt: trial.expiresAt,
      now,
    });
    const remaining = daysRemaining(trial.expiresAt, now);
    return {
      status,
      startedAt: trial.startedAt?.toISOString() ?? null,
      expiresAt: trial.expiresAt?.toISOString() ?? null,
      daysRemaining: status === 'ACTIVE' ? remaining : status === 'EXPIRED' ? 0 : null,
      progressPercent: trialProgressPercent(trial.startedAt, trial.expiresAt, now),
      reminders: trialReminders(status, remaining),
      canStart: canStartRole && status === 'NOT_STARTED',
    };
  }

  private toSubscriptionDto(
    row: {
      id: string;
      status: string;
      cancelAtPeriodEnd: boolean;
      currentPeriodStart: Date | null;
      currentPeriodEnd: Date | null;
      gracePeriodEndsAt: Date | null;
      plan: { code: PlanCode; name: string; priceMad: number; interval: 'MONTH' | 'YEAR' };
    } | null,
  ) {
    if (!row) {
      return {
        id: null,
        status: null,
        planCode: null,
        planName: null,
        priceMad: null,
        interval: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        gracePeriodEndsAt: null,
        paymentProviderReady: this.payments.checkoutAvailable,
      };
    }
    return {
      id: row.id,
      status: row.status,
      planCode: row.plan.code,
      planName: row.plan.name,
      priceMad: row.plan.priceMad,
      interval: row.plan.interval,
      currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      gracePeriodEndsAt: row.gracePeriodEndsAt?.toISOString() ?? null,
      paymentProviderReady: this.payments.checkoutAvailable,
    };
  }

  private toPlanDto(plan: {
    id: string;
    code: PlanCode;
    name: string;
    interval: 'MONTH' | 'YEAR';
    priceMad: number;
    currency: string;
    active: boolean;
  }) {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      interval: plan.interval,
      priceMad: plan.priceMad,
      currency: 'MAD' as const,
      active: plan.active,
    };
  }
}
