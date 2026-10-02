import { STANDARD_OBJECTIVES } from './standard-path.catalog';

export const OBJECTIVE_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const OBJECTIVE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];
export type ObjectivePriority = (typeof OBJECTIVE_PRIORITIES)[number];

const PRIORITY_RANK: Record<ObjectivePriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const STANDARD_RANK = new Map(STANDARD_OBJECTIVES.map((item, index) => [item.code, index]));

function standardRank(item: SortableObjective): number | null {
  if (!item.templateCode) return null;
  const rank = STANDARD_RANK.get(item.templateCode);
  return rank === undefined ? null : rank;
}

export class ObjectiveRuleError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

export type ObjectiveDraft = {
  status: ObjectiveStatus;
  priority: ObjectivePriority;
  progress: number;
  startDate: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;
};

/**
 * Standard-path objectives stay in catalog order at the start of the list.
 * Other active objectives then sort by:
 * 1. overdue first
 * 2. nearest due date (missing dates last)
 * 3. priority CRITICAL → LOW
 * 4. oldest createdAt
 * Completed objectives sort by completedAt, newest first.
 * Cancelled objectives stay after the others.
 */
export type SortableObjective = {
  status: ObjectiveStatus;
  priority: ObjectivePriority;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  templateCode?: string | null;
};

export function dayKey(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function isOverdue(
  objective: { status: ObjectiveStatus; dueDate: Date | null },
  now: Date,
): boolean {
  const due = dayKey(objective.dueDate);
  const today = dayKey(now);
  if (!due || !today) return false;
  if (objective.status === 'COMPLETED' || objective.status === 'CANCELLED') return false;
  return due < today;
}

export function normalizeObjective(draft: ObjectiveDraft, now: Date): ObjectiveDraft {
  if (!Number.isInteger(draft.progress) || draft.progress < 0 || draft.progress > 100) {
    throw new ObjectiveRuleError('progress', 'La progression doit être un entier entre 0 et 100');
  }
  const start = dayKey(draft.startDate);
  const due = dayKey(draft.dueDate);
  if (start && due && due < start) {
    throw new ObjectiveRuleError('dueDate', 'L’échéance doit être postérieure ou égale au début');
  }
  if (draft.status === 'COMPLETED') {
    return {
      ...draft,
      progress: 100,
      completedAt: draft.completedAt ?? now,
    };
  }
  return { ...draft, completedAt: null };
}

export function sortObjectives<T extends SortableObjective>(
  items: readonly T[],
  now: Date,
  statusFilter?: ObjectiveStatus,
): T[] {
  const copy = [...items];
  if (statusFilter === 'COMPLETED') {
    copy.sort((left, right) => {
      const byCompletion = (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0);
      if (byCompletion !== 0) return byCompletion;
      return left.createdAt.getTime() - right.createdAt.getTime();
    });
    return copy;
  }

  const group = (item: SortableObjective) => {
    if (item.status === 'CANCELLED') return 2;
    if (item.status === 'COMPLETED') return 1;
    return 0;
  };

  copy.sort((left, right) => {
    const byGroup = group(left) - group(right);
    if (byGroup !== 0) return byGroup;
    const leftRank = standardRank(left);
    const rightRank = standardRank(right);
    if (leftRank !== null || rightRank !== null) {
      if (leftRank === null) return 1;
      if (rightRank === null) return -1;
      return leftRank - rightRank;
    }
    if (left.status === 'COMPLETED' && right.status === 'COMPLETED') {
      return (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0);
    }
    const byOverdue = Number(isOverdue(right, now)) - Number(isOverdue(left, now));
    if (byOverdue !== 0) return byOverdue;
    const leftDue = dayKey(left.dueDate) ?? '9999-12-31';
    const rightDue = dayKey(right.dueDate) ?? '9999-12-31';
    if (leftDue !== rightDue) return leftDue < rightDue ? -1 : 1;
    const byPriority = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
    if (byPriority !== 0) return byPriority;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
  return copy;
}

export type ObjectiveCounts = {
  total: number;
  planned: number;
  inProgress: number;
  completed: number;
  overdue: number;
};

export function summarizeObjectives(
  items: readonly { status: ObjectiveStatus; dueDate: Date | null }[],
  now: Date,
): ObjectiveCounts {
  const counts: ObjectiveCounts = {
    total: 0,
    planned: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };
  for (const item of items) {
    if (item.status !== 'CANCELLED') counts.total += 1;
    if (item.status === 'PLANNED') counts.planned += 1;
    if (item.status === 'IN_PROGRESS') counts.inProgress += 1;
    if (item.status === 'COMPLETED') counts.completed += 1;
    if (isOverdue(item, now)) counts.overdue += 1;
  }
  return counts;
}

export function supervisionSummary(counts: ObjectiveCounts): {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
} {
  return {
    total: counts.total,
    inProgress: counts.inProgress,
    completed: counts.completed,
    overdue: counts.overdue,
  };
}
