/** English fallbacks for non-hook consumers (forms/tests). Prefer `t('objectives.status.*')` in UI. */
export const STATUS_LABEL = {
  PLANNED: 'Upcoming',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const TASK_STATUS_LABEL = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
} as const;

export const STATUS_TAB_IDS = ['all', 'IN_PROGRESS', 'PLANNED', 'COMPLETED', 'overdue'] as const;

export type StatusTab = (typeof STATUS_TAB_IDS)[number];
