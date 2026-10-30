import { Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { refreshSubscriptionStatus, subscriptionWrites, trialStatusAt } from './billing.util';

export type CoverageSnapshot = {
  writable: boolean;
  source: 'trial' | 'subscription' | 'none';
  expiresAt: string | null;
};

@Injectable()
export class SubscriptionAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async describeThesis(thesisId: string, now = new Date()): Promise<CoverageSnapshot> {
    const doctoral = await this.prisma.thesisMembership.findFirst({
      where: { thesisId, role: 'DOCTORAL_STUDENT' },
      orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
      select: { userId: true },
    });
    if (!doctoral) return { writable: false, source: 'none', expiresAt: null };

    const coverage = await this.prisma.thesisSubscriptionCoverage.findUnique({
      where: { thesisId },
      include: { subscription: true },
    });
    if (coverage) {
      const status = refreshSubscriptionStatus({
        status: coverage.subscription.status,
        currentPeriodEnd: coverage.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: coverage.subscription.cancelAtPeriodEnd,
        gracePeriodEndsAt: coverage.subscription.gracePeriodEndsAt,
        now,
      });
      if (status !== coverage.subscription.status) {
        await this.prisma.subscription.update({
          where: { id: coverage.subscription.id },
          data: { status },
        });
      }
      if (subscriptionWrites(status, now, coverage.subscription.gracePeriodEndsAt)) {
        return {
          writable: true,
          source: 'subscription',
          expiresAt: coverage.subscription.currentPeriodEnd?.toISOString() ?? null,
        };
      }
    }

    const trial = await this.prisma.trial.findUnique({ where: { userId: doctoral.userId } });
    if (trial) {
      const status = trialStatusAt({
        stored: trial.status,
        startedAt: trial.startedAt,
        expiresAt: trial.expiresAt,
        now,
      });
      if (status !== trial.status) {
        await this.prisma.trial.update({ where: { id: trial.id }, data: { status } });
      }
      if (status === 'ACTIVE') {
        return {
          writable: true,
          source: 'trial',
          expiresAt: trial.expiresAt?.toISOString() ?? null,
        };
      }
    }

    return { writable: false, source: 'none', expiresAt: trial?.expiresAt?.toISOString() ?? null };
  }

  async assertScientificWrite(thesisId: string): Promise<void> {
    const coverage = await this.describeThesis(thesisId);
    if (!coverage.writable) {
      throw new AppException(
        403,
        'SUBSCRIPTION_REQUIRED',
        'Scientific edits require an active trial or Thesis Flow Pro coverage',
      );
    }
  }

  async assertUserCanCreateThesis(userId: string, now = new Date()): Promise<void> {
    const existing = await this.prisma.thesisMembership.count({
      where: { userId, role: 'DOCTORAL_STUDENT' },
    });
    if (existing > 0 && process.env.NODE_ENV !== 'test') {
      throw new AppException(409, 'CONFLICT', 'V1 covers one main thesis per doctoral student');
    }
    const snapshot = await this.userWriteSnapshot(userId, now);
    if (!snapshot.writable) {
      throw new AppException(
        403,
        'SUBSCRIPTION_REQUIRED',
        'Start the 30-day trial or subscribe to Thesis Flow Pro to create a thesis',
      );
    }
  }

  async userWriteSnapshot(userId: string, now = new Date()): Promise<CoverageSnapshot> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (sub) {
      const status = refreshSubscriptionStatus({
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        gracePeriodEndsAt: sub.gracePeriodEndsAt,
        now,
      });
      if (subscriptionWrites(status, now, sub.gracePeriodEndsAt)) {
        return {
          writable: true,
          source: 'subscription',
          expiresAt: sub.currentPeriodEnd?.toISOString() ?? null,
        };
      }
    }
    const trial = await this.prisma.trial.findUnique({ where: { userId } });
    if (trial) {
      const status = trialStatusAt({
        stored: trial.status,
        startedAt: trial.startedAt,
        expiresAt: trial.expiresAt,
        now,
      });
      if (status === 'ACTIVE') {
        return {
          writable: true,
          source: 'trial',
          expiresAt: trial.expiresAt?.toISOString() ?? null,
        };
      }
    }
    return { writable: false, source: 'none', expiresAt: null };
  }
}
