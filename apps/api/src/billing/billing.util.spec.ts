import {
  addUtcDays,
  daysRemaining,
  refreshSubscriptionStatus,
  trialReminders,
  trialStatusAt,
} from './billing.util';

describe('billing.util', () => {
  const started = new Date('2026-01-01T00:00:00.000Z');

  it('keeps a 30-day trial active until expiresAt', () => {
    const expires = addUtcDays(started, 30);
    expect(trialStatusAt({ stored: 'ACTIVE', startedAt: started, expiresAt: expires, now: started })).toBe(
      'ACTIVE',
    );
    expect(
      trialStatusAt({
        stored: 'ACTIVE',
        startedAt: started,
        expiresAt: expires,
        now: new Date(expires.getTime() - 1),
      }),
    ).toBe('ACTIVE');
    expect(
      trialStatusAt({ stored: 'ACTIVE', startedAt: started, expiresAt: expires, now: expires }),
    ).toBe('EXPIRED');
  });

  it('counts remaining days and reminders', () => {
    const expires = addUtcDays(started, 30);
    expect(daysRemaining(expires, started)).toBe(30);
    expect(trialReminders('ACTIVE', 7)).toEqual(['J-7']);
    expect(trialReminders('ACTIVE', 3)).toEqual(['J-7', 'J-3']);
    expect(trialReminders('ACTIVE', 1)).toEqual(['J-7', 'J-3', 'J-1']);
    expect(trialReminders('EXPIRED', 0)).toEqual([]);
  });

  it('closes an active period at currentPeriodEnd', () => {
    const end = new Date('2026-02-01T00:00:00.000Z');
    expect(
      refreshSubscriptionStatus({
        status: 'ACTIVE',
        currentPeriodEnd: end,
        cancelAtPeriodEnd: true,
        gracePeriodEndsAt: null,
        now: end,
      }),
    ).toBe('CANCELLED');
    expect(
      refreshSubscriptionStatus({
        status: 'ACTIVE',
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        gracePeriodEndsAt: addUtcDays(end, 7),
        now: end,
      }),
    ).toBe('GRACE_PERIOD');
    expect(
      refreshSubscriptionStatus({
        status: 'GRACE_PERIOD',
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        gracePeriodEndsAt: end,
        now: end,
      }),
    ).toBe('EXPIRED');
  });
});
