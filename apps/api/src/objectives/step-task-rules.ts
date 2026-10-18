export const STEP_TASK_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'VALIDATED',
  'REJECTED',
] as const;

export type StepTaskStatus = (typeof STEP_TASK_STATUSES)[number];

const EDITABLE: readonly StepTaskStatus[] = ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'];

export function canEditStepTask(status: StepTaskStatus): boolean {
  return EDITABLE.includes(status);
}

export function canSubmitStepTask(status: StepTaskStatus): boolean {
  return EDITABLE.includes(status);
}

export function canReviewStepTask(
  status: StepTaskStatus,
  decision: 'IN_REVIEW' | 'VALIDATED' | 'CHANGES_REQUESTED' | 'REJECTED',
): boolean {
  if (status !== 'SUBMITTED' && status !== 'IN_REVIEW') return false;
  if (decision === 'IN_REVIEW') return status === 'SUBMITTED';
  return true;
}

export function reviewNeedsMessage(
  decision: 'IN_REVIEW' | 'VALIDATED' | 'CHANGES_REQUESTED' | 'REJECTED',
): boolean {
  return decision === 'CHANGES_REQUESTED' || decision === 'REJECTED';
}
