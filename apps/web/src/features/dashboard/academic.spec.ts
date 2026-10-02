import { describe, expect, it } from 'vitest';
import { groupActivity } from './activity';
import { formatDate, relativeDays, thesisCalendar } from './format';
import { markPhases } from './phases';
import { computeProgressStatus } from './progress-status';

describe('academic dashboard helpers', () => {
  it('formats a day as 5 oct. 2026', () => {
    expect(formatDate('2026-10-05').replace(/\s/g, ' ')).toBe('Oct 5, 2026');
  });

  it('describes a future day and a late day', () => {
    expect(relativeDays('2026-10-05', '2026-09-30')).toBe('in 5 days');
    expect(relativeDays('2026-09-20', '2026-09-30')).toBe('10 days overdue');
  });

  it('reports a schedule status from overdue objectives', () => {
    expect(computeProgressStatus(0)).toBe('On schedule');
    expect(computeProgressStatus(1)).toBe('1 objective overdue');
    expect(computeProgressStatus(3)).toBe('3 objectives overdue');
  });

  it('computes the doctoral year and month', () => {
    expect(thesisCalendar('2025-10-01', '2028-09-30', '2026-09-30')).toBe('1st year · month 12/36');
  });

  it('marks the current phase from objective titles', () => {
    expect(
      markPhases([
        { title: "État de l'art", status: 'COMPLETED' },
        { title: 'Expérimentation', status: 'IN_PROGRESS' },
        { title: 'Rédaction du manuscrit', status: 'PLANNED' },
        { title: 'Préparation de la soutenance', status: 'PLANNED' },
      ]),
    ).toEqual(['done', 'current', 'upcoming', 'upcoming']);
  });

  it('groups identical events and drops generic profile updates', () => {
    const lines = groupActivity(
      [
        { type: 'PROFILE_UPDATED', occurredAt: '2026-09-30T08:00:00.000Z' },
        { type: 'OBJECTIVE_UPDATED', occurredAt: '2026-09-30T09:00:00.000Z' },
        { type: 'OBJECTIVE_UPDATED', occurredAt: '2026-09-30T10:00:00.000Z' },
        { type: 'THESIS_CREATED', occurredAt: '2026-09-28T12:00:00.000Z' },
      ],
      '2026-09-30',
    );
    expect(lines.map((line) => line.text)).toEqual([
      '2 updates today',
      'Thesis created',
    ]);
  });
});
