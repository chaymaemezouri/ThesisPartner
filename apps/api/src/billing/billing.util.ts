import type { PlanInterval, SubscriptionStatus, TrialStatus } from '@prisma/client';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addUtcDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MS_PER_DAY);
}

export function trialStatusAt(input: {
  stored: TrialStatus;
  startedAt: Date | null;
  expiresAt: Date | null;
  now: Date;
}): TrialStatus {
  if (input.stored === 'NOT_STARTED' || !input.startedAt || !input.expiresAt) {
    return 'NOT_STARTED';
  }
  if (input.now.getTime() >= input.expiresAt.getTime()) return 'EXPIRED';
  return 'ACTIVE';
}

export function daysRemaining(expiresAt: Date | null, now: Date): number | null {
  if (!expiresAt) return null;
  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}

export function trialProgressPercent(
  startedAt: Date | null,
  expiresAt: Date | null,
  now: Date,
): number | null {
  if (!startedAt || !expiresAt) return null;
  const total = expiresAt.getTime() - startedAt.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - startedAt.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function trialReminders(
  status: TrialStatus,
  remaining: number | null,
): Array<'J-7' | 'J-3' | 'J-1'> {
  if (status !== 'ACTIVE' || remaining == null) return [];
  const keys: Array<'J-7' | 'J-3' | 'J-1'> = [];
  if (remaining <= 7) keys.push('J-7');
  if (remaining <= 3) keys.push('J-3');
  if (remaining <= 1) keys.push('J-1');
  return keys;
}

export function subscriptionWrites(
  status: SubscriptionStatus,
  now: Date,
  graceEndsAt: Date | null,
) {
  if (status === 'ACTIVE') return true;
  if (status === 'GRACE_PERIOD' && graceEndsAt && now.getTime() < graceEndsAt.getTime())
    return true;
  return false;
}

export function refreshSubscriptionStatus(input: {
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  gracePeriodEndsAt: Date | null;
  now: Date;
}): SubscriptionStatus {
  const { status, currentPeriodEnd, cancelAtPeriodEnd, gracePeriodEndsAt, now } = input;
  if (status === 'PENDING' || status === 'EXPIRED' || status === 'CANCELLED') return status;
  if (status === 'GRACE_PERIOD' || status === 'PAST_DUE') {
    if (gracePeriodEndsAt && now.getTime() >= gracePeriodEndsAt.getTime()) return 'EXPIRED';
    return 'GRACE_PERIOD';
  }
  if (status === 'ACTIVE' && currentPeriodEnd && now.getTime() >= currentPeriodEnd.getTime()) {
    return cancelAtPeriodEnd ? 'CANCELLED' : 'GRACE_PERIOD';
  }
  return status;
}

export function periodEnd(from: Date, interval: PlanInterval): Date {
  return addUtcDays(from, interval === 'YEAR' ? 365 : 30);
}
