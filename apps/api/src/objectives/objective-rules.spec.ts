import {
  isOverdue,
  normalizeObjective,
  ObjectiveRuleError,
  sortObjectives,
  summarizeObjectives,
} from './objective-rules';

const now = new Date('2026-09-29T12:00:00.000Z');

function draft(overrides: Partial<Parameters<typeof normalizeObjective>[0]> = {}) {
  return {
    status: 'IN_PROGRESS' as const,
    priority: 'MEDIUM' as const,
    progress: 40,
    startDate: null,
    dueDate: null,
    completedAt: null,
    ...overrides,
  };
}

describe('objective rules', () => {
  it('forces progress to 100 and sets completedAt when the objective is completed', () => {
    const result = normalizeObjective(draft({ status: 'COMPLETED', progress: 40 }), now);
    expect(result.progress).toBe(100);
    expect(result.completedAt).toEqual(now);
  });

  it('keeps an existing completion instant', () => {
    const completedAt = new Date('2026-09-01T00:00:00.000Z');
    const result = normalizeObjective(
      draft({ status: 'COMPLETED', completedAt, progress: 100 }),
      now,
    );
    expect(result.completedAt).toEqual(completedAt);
  });

  it('clears completedAt when a completed objective is reopened', () => {
    const result = normalizeObjective(
      draft({
        status: 'IN_PROGRESS',
        progress: 80,
        completedAt: new Date('2026-09-01T00:00:00.000Z'),
      }),
      now,
    );
    expect(result.completedAt).toBeNull();
    expect(result.progress).toBe(80);
  });

  it('rejects a due date before the start date and progress outside 0–100', () => {
    expect(() =>
      normalizeObjective(
        draft({
          startDate: new Date('2026-10-02T00:00:00.000Z'),
          dueDate: new Date('2026-10-01T00:00:00.000Z'),
        }),
        now,
      ),
    ).toThrow(ObjectiveRuleError);
    expect(() => normalizeObjective(draft({ progress: 101 }), now)).toThrow(ObjectiveRuleError);
    expect(() => normalizeObjective(draft({ progress: -1 }), now)).toThrow(ObjectiveRuleError);
  });

  it('marks only open objectives with a past due date as overdue', () => {
    const due = new Date('2026-09-28T00:00:00.000Z');
    expect(isOverdue({ status: 'IN_PROGRESS', dueDate: due }, now)).toBe(true);
    expect(isOverdue({ status: 'COMPLETED', dueDate: due }, now)).toBe(false);
    expect(isOverdue({ status: 'CANCELLED', dueDate: due }, now)).toBe(false);
    expect(
      isOverdue({ status: 'PLANNED', dueDate: new Date('2026-09-29T00:00:00.000Z') }, now),
    ).toBe(false);
    expect(isOverdue({ status: 'PLANNED', dueDate: null }, now)).toBe(false);
  });

  it('counts real statuses and excludes cancelled objectives from the total', () => {
    expect(
      summarizeObjectives(
        [
          { status: 'PLANNED', dueDate: new Date('2026-10-01T00:00:00.000Z') },
          { status: 'IN_PROGRESS', dueDate: new Date('2026-09-01T00:00:00.000Z') },
          { status: 'COMPLETED', dueDate: new Date('2026-09-01T00:00:00.000Z') },
          { status: 'CANCELLED', dueDate: new Date('2026-09-01T00:00:00.000Z') },
        ],
        now,
      ),
    ).toEqual({ total: 3, planned: 1, inProgress: 1, completed: 1, overdue: 1 });
  });

  it('sorts overdue objectives ahead of later due dates', () => {
    const sorted = sortObjectives(
      [
        {
          id: 'later',
          status: 'PLANNED' as const,
          priority: 'LOW' as const,
          dueDate: new Date('2026-12-01T00:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 'overdue',
          status: 'IN_PROGRESS' as const,
          priority: 'MEDIUM' as const,
          dueDate: new Date('2026-09-01T00:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
      now,
    );
    expect(sorted.map((item) => item.id)).toEqual(['overdue', 'later']);
  });

  it('keeps standard objectives in catalog order before the others', () => {
    const row = (id: string, templateCode: string | null, dueDate: string) => ({
      id,
      status: 'PLANNED' as const,
      priority: 'MEDIUM' as const,
      dueDate: new Date(dueDate),
      completedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      templateCode,
    });
    const sorted = sortObjectives(
      [
        row('custom', null, '2026-09-01T00:00:00.000Z'),
        row('experiment', 'EXPERIMENTATION', '2026-09-20T00:00:00.000Z'),
        row('method', 'METHODOLOGIE', '2026-11-30T00:00:00.000Z'),
        row('state', 'ETAT_ART', '2026-10-15T00:00:00.000Z'),
      ],
      now,
    );
    expect(sorted.map((item) => item.id)).toEqual(['state', 'method', 'experiment', 'custom']);
  });
});
