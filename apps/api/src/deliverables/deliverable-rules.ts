export const DELIVERABLE_TYPES = [
  'ARTICLE',
  'THESIS_CHAPTER',
  'REPORT',
  'CODE',
  'DATASET',
  'PRESENTATION',
  'POSTER',
  'COMMUNICATION',
  'OTHER',
] as const;

export const DELIVERABLE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'VALIDATED',
  'CANCELLED',
] as const;

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];
export type DeliverableSort = 'due' | 'updated';

/** The first stored revision is 1. The client never chooses this number. */
export function nextVersionNumber(currentMax: number | null | undefined): number {
  return (currentMax ?? 0) + 1;
}

export const VERSION_HISTORY_LIMIT = 100;

export type DeliverableCounts = {
  total: number;
  draft: number;
  submitted: number;
  changesRequested: number;
  validated: number;
  overdue: number;
};

type SortableDeliverable = {
  id: string;
  status: DeliverableStatus;
  dueDate: Date | null;
  updatedAt: Date;
};

/**
 * Active deliverables (draft, submitted, changes requested) come first,
 * ordered by the nearest due date. A missing due date stays after dated ones.
 * Equal dates use the most recent update, then the id.
 * Validated deliverables follow, newest update first.
 * Cancelled deliverables stay last.
 * `updated` keeps the same groups and orders each group by updatedAt only.
 */
export function sortDeliverables<T extends SortableDeliverable>(
  items: readonly T[],
  sort: DeliverableSort = 'due',
): T[] {
  const copy = [...items];
  copy.sort((left, right) => {
    const byGroup = group(left.status) - group(right.status);
    if (byGroup !== 0) return byGroup;
    if (sort === 'due' && group(left.status) === 0) {
      const leftDue = dayKey(left.dueDate) ?? '9999-12-31';
      const rightDue = dayKey(right.dueDate) ?? '9999-12-31';
      if (leftDue !== rightDue) return leftDue < rightDue ? -1 : 1;
    }
    const byUpdate = right.updatedAt.getTime() - left.updatedAt.getTime();
    if (byUpdate !== 0) return byUpdate;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
  return copy;
}

/** A deliverable is overdue when its calendar day is before today (UTC) and it is still open. */
export function isDeliverableOverdue(
  item: { status: DeliverableStatus; dueDate: Date | null },
  now: Date,
): boolean {
  if (item.status === 'VALIDATED' || item.status === 'CANCELLED') return false;
  const due = dayKey(item.dueDate);
  const today = dayKey(now);
  if (!due || !today) return false;
  return due < today;
}

/**
 * total excludes CANCELLED. Draft, submitted, changes requested and validated
 * are counted on their own. overdue counts open deliverables whose due day has passed.
 */
export function summarizeDeliverables(
  items: readonly { status: DeliverableStatus; dueDate: Date | null }[],
  now: Date,
): DeliverableCounts {
  const counts: DeliverableCounts = {
    total: 0,
    draft: 0,
    submitted: 0,
    changesRequested: 0,
    validated: 0,
    overdue: 0,
  };
  for (const item of items) {
    if (item.status !== 'CANCELLED') counts.total += 1;
    if (item.status === 'DRAFT') counts.draft += 1;
    if (item.status === 'SUBMITTED') counts.submitted += 1;
    if (item.status === 'CHANGES_REQUESTED') counts.changesRequested += 1;
    if (item.status === 'VALIDATED') counts.validated += 1;
    if (isDeliverableOverdue(item, now)) counts.overdue += 1;
  }
  return counts;
}

function group(status: DeliverableStatus): number {
  if (status === 'CANCELLED') return 2;
  if (status === 'VALIDATED') return 1;
  return 0;
}

function dayKey(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}
