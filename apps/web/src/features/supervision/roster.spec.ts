import { describe, expect, it } from 'vitest';
import { matchesRoster, rosterStats, sortRoster, type RosterThesis } from './roster';

const alpha: RosterThesis = {
  thesisId: 'a',
  title: 'Anomalies',
  progressPercentage: 20,
  pendingValidationCount: 1,
  doctoralStudent: { givenName: 'Youssef', familyName: 'El Amrani' },
  objectiveSummary: { inProgress: 1, overdue: 2 },
};

const beta: RosterThesis = {
  thesisId: 'b',
  title: 'Méthode',
  progressPercentage: 80,
  pendingValidationCount: 0,
  doctoralStudent: { givenName: 'Ada', familyName: 'Martin' },
  objectiveSummary: { inProgress: 3, overdue: 0 },
};

describe('supervisor roster', () => {
  it('sums students, average progress, open objectives and reviews', () => {
    expect(rosterStats([alpha, beta])).toEqual({
      students: 2,
      averageProgress: 50,
      inProgress: 4,
      overdue: 2,
      pending: 1,
    });
  });

  it('filters by name, thesis, lateness and reviews', () => {
    expect(matchesRoster(alpha, 'anomal', 'all', 'Student')).toBe(true);
    expect(matchesRoster(alpha, 'ada', 'all', 'Student')).toBe(false);
    expect(matchesRoster(alpha, '', 'late', 'Student')).toBe(true);
    expect(matchesRoster(beta, '', 'late', 'Student')).toBe(false);
    expect(matchesRoster(alpha, '', 'pending', 'Student')).toBe(true);
    expect(matchesRoster(beta, '', 'on_track', 'Student')).toBe(true);
    expect(matchesRoster(alpha, '', 'attention', 'Student')).toBe(false);
  });

  it('sorts by name or progress', () => {
    expect(sortRoster([alpha, beta], 'name', 'Student').map((item) => item.thesisId)).toEqual([
      'b',
      'a',
    ]);
    expect(
      sortRoster([alpha, beta], 'progress-desc', 'Student').map((item) => item.thesisId),
    ).toEqual(['b', 'a']);
  });
});
