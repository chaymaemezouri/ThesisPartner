/** English fallbacks for non-hook consumers. Prefer `t('remarks.*')` in UI. */
export const REMARK_STATUS_LABEL = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Corrected',
  CLOSED: 'Closed',
} as const;

export const REMARK_PRIORITY_LABEL = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const;

export const REMARK_TAB_IDS = ['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export type RemarkTab = (typeof REMARK_TAB_IDS)[number];

export const REMARK_TARGET_KIND_LABEL = {
  THESIS: 'Thesis',
  OBJECTIVE: 'Objective',
  TASK: 'Step',
  DELIVERABLE: 'Deliverable',
  DELIVERABLE_VERSION: 'Version',
} as const;
