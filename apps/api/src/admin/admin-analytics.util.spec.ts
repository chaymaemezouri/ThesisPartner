import {
  fillDailySeries,
  sanitizeAuditMetadata,
  toDayKey,
  toMonthKey,
} from './admin-analytics.util';

describe('admin-analytics.util', () => {
  it('builds day and month keys in UTC', () => {
    const date = new Date('2026-10-23T15:30:00.000Z');
    expect(toDayKey(date)).toBe('2026-10-23');
    expect(toMonthKey(date)).toBe('2026-10-01');
  });

  it('fills missing days with zero counts', () => {
    const from = new Date('2026-10-01T00:00:00.000Z');
    const to = new Date('2026-10-04T00:00:00.000Z');
    const counts = new Map([['2026-10-02', 3]]);
    expect(fillDailySeries(from, to, counts)).toEqual([
      { date: '2026-10-01', count: 0 },
      { date: '2026-10-02', count: 3 },
      { date: '2026-10-03', count: 0 },
      { date: '2026-10-04', count: 0 },
    ]);
  });

  it('strips secrets from audit metadata', () => {
    expect(
      sanitizeAuditMetadata({
        reason: 'ok',
        token: 'abc',
        passwordHash: 'x',
        nested: { secret: 'no', count: 2 },
      }),
    ).toEqual({ reason: 'ok', nested: { count: 2 } });
  });
});
