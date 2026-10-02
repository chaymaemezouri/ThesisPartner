export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type ProgressMode = 'MANUAL' | 'TASK_BASED';

export type TaskSummary = {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  cancelled: number;
};

export type ProgressMeasurement = {
  progress: number;
  mode: ProgressMode;
  summary: TaskSummary;
};

/**
 * Task-based progress is the share of non-cancelled tasks whose status is DONE.
 * The percentage is an integer. Rounding uses Math.round, which rounds halves
 * away from zero for positive numbers (1.5 becomes 2). Examples: 1/2 is 50,
 * 1/3 is 33, 2/3 is 67, 3/4 is 75.
 * Cancelled tasks are excluded from the numerator and the denominator.
 * When no non-cancelled task remains (none at all, or every task cancelled),
 * the stored manual progress is returned and the mode is MANUAL. That avoids
 * a division by zero and keeps objectives created before tasks were available.
 */
export function measureObjectiveProgress(
  manualProgress: number,
  tasks: readonly { status: TaskStatus }[],
): ProgressMeasurement {
  const summary: TaskSummary = { total: 0, todo: 0, inProgress: 0, done: 0, cancelled: 0 };
  for (const task of tasks) {
    summary.total += 1;
    if (task.status === 'TODO') summary.todo += 1;
    if (task.status === 'IN_PROGRESS') summary.inProgress += 1;
    if (task.status === 'DONE') summary.done += 1;
    if (task.status === 'CANCELLED') summary.cancelled += 1;
  }
  const active = summary.total - summary.cancelled;
  if (active === 0) {
    return { progress: clampProgress(manualProgress), mode: 'MANUAL', summary };
  }
  return {
    progress: Math.round((summary.done / active) * 100),
    mode: 'TASK_BASED',
    summary,
  };
}

/**
 * DONE stores the completion instant. Moving back to TODO or IN_PROGRESS clears it.
 * CANCELLED also clears it, because a cancelled task no longer counts as finished.
 * Staying on DONE keeps the original instant.
 */
export function resolveTaskCompletedAt(
  nextStatus: TaskStatus,
  now: Date,
  previous?: { status: TaskStatus; completedAt: Date | null },
): Date | null {
  if (nextStatus !== 'DONE') return null;
  if (previous?.status === 'DONE' && previous.completedAt) return previous.completedAt;
  return now;
}

function clampProgress(value: number): number {
  if (!Number.isInteger(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
