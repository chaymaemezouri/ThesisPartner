import { canEditStepTask, canReviewStepTask, canSubmitStepTask } from './step-task-rules';

describe('step task rules', () => {
  it('lets the student edit and submit only a draft, a correction or a rejection', () => {
    expect(canEditStepTask('DRAFT')).toBe(true);
    expect(canSubmitStepTask('CHANGES_REQUESTED')).toBe(true);
    expect(canEditStepTask('SUBMITTED')).toBe(false);
    expect(canEditStepTask('VALIDATED')).toBe(false);
    expect(canSubmitStepTask('IN_REVIEW')).toBe(false);
  });

  it('lets the supervisor review a submitted task and close the review', () => {
    expect(canReviewStepTask('SUBMITTED', 'IN_REVIEW')).toBe(true);
    expect(canReviewStepTask('IN_REVIEW', 'VALIDATED')).toBe(true);
    expect(canReviewStepTask('IN_REVIEW', 'CHANGES_REQUESTED')).toBe(true);
    expect(canReviewStepTask('VALIDATED', 'REJECTED')).toBe(false);
    expect(canReviewStepTask('IN_REVIEW', 'IN_REVIEW')).toBe(false);
  });
});
