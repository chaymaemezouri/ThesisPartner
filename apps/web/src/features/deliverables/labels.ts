/** English fallbacks for non-hook consumers. Prefer `t('deliverables.*')` in UI. */
export const DELIVERABLE_TYPE_LABEL = {
  ARTICLE: 'Article',
  THESIS_CHAPTER: 'Thesis chapter',
  REPORT: 'Report',
  CODE: 'Code',
  DATASET: 'Dataset',
  PRESENTATION: 'Presentation',
  POSTER: 'Poster',
  COMMUNICATION: 'Communication',
  OTHER: 'Other',
} as const;

export const DELIVERABLE_STATUS_LABEL = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  CHANGES_REQUESTED: 'Changes requested',
  VALIDATED: 'Validated',
  CANCELLED: 'Cancelled',
} as const;

export const DELIVERABLE_TAB_IDS = [
  'all',
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'VALIDATED',
] as const;

export type DeliverableTab = (typeof DELIVERABLE_TAB_IDS)[number];
