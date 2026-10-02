import {
  canCancel,
  canCancelDeliverable,
  canCreateDeliverable,
  canCreateVersion,
  canDownloadFile,
  canUploadFile,
  canEditDeliverable,
  canEditMetadata,
  canRequestChanges,
  canReview,
  canSubmit,
  canValidate,
  canViewDeliverable,
} from './deliverable-policy';
import { isDeliverableOverdue, nextVersionNumber, sortDeliverables } from './deliverable-rules';

describe('deliverable rules', () => {
  const now = new Date('2026-09-30T12:00:00.000Z');

  it('puts open deliverables before validated and cancelled ones', () => {
    const sorted = sortDeliverables([
      item('c', 'CANCELLED', null, '2026-09-30T00:00:00.000Z'),
      item('v', 'VALIDATED', null, '2026-09-29T00:00:00.000Z'),
      item('d', 'DRAFT', '2026-10-02', '2026-09-01T00:00:00.000Z'),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(['d', 'v', 'c']);
  });

  it('orders active deliverables by the nearest due date, then the latest update', () => {
    const sorted = sortDeliverables([
      item('late', 'DRAFT', '2026-12-01', '2026-09-02T00:00:00.000Z'),
      item('soon', 'SUBMITTED', '2026-10-01', '2026-09-01T00:00:00.000Z'),
      item('none', 'CHANGES_REQUESTED', null, '2026-09-20T00:00:00.000Z'),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(['soon', 'late', 'none']);
  });

  it('orders validated deliverables by the latest update', () => {
    const sorted = sortDeliverables(
      [
        item('old', 'VALIDATED', '2026-01-01', '2026-09-01T00:00:00.000Z'),
        item('new', 'VALIDATED', '2026-12-01', '2026-09-20T00:00:00.000Z'),
      ],
      'updated',
    );
    expect(sorted.map((entry) => entry.id)).toEqual(['new', 'old']);
  });

  it('marks an open deliverable overdue only when the due day is before today', () => {
    expect(
      isDeliverableOverdue({ status: 'DRAFT', dueDate: new Date('2026-09-29T00:00:00.000Z') }, now),
    ).toBe(true);
    expect(
      isDeliverableOverdue({ status: 'DRAFT', dueDate: new Date('2026-09-30T00:00:00.000Z') }, now),
    ).toBe(false);
    expect(
      isDeliverableOverdue(
        { status: 'VALIDATED', dueDate: new Date('2020-01-01T00:00:00.000Z') },
        now,
      ),
    ).toBe(false);
    expect(
      isDeliverableOverdue(
        { status: 'CANCELLED', dueDate: new Date('2020-01-01T00:00:00.000Z') },
        now,
      ),
    ).toBe(false);
  });
});

describe('deliverable policy', () => {
  it('lets a doctoral student create and edit drafts or corrections', () => {
    expect(canCreateDeliverable('DOCTORAL_STUDENT')).toBe(true);
    expect(canCreateDeliverable('SUPERVISOR')).toBe(true);
    expect(canEditDeliverable('DOCTORAL_STUDENT', 'DRAFT')).toBe(true);
    expect(canEditMetadata('DOCTORAL_STUDENT', 'DRAFT')).toBe(true);
    expect(canEditDeliverable('DOCTORAL_STUDENT', 'CHANGES_REQUESTED')).toBe(true);
    expect(canEditDeliverable('DOCTORAL_STUDENT', 'SUBMITTED')).toBe(false);
    expect(canEditDeliverable('DOCTORAL_STUDENT', 'VALIDATED')).toBe(false);
    expect(canEditDeliverable('SUPERVISOR', 'DRAFT')).toBe(false);
    expect(canCancelDeliverable('DOCTORAL_STUDENT', 'DRAFT')).toBe(true);
    expect(canCancel('DOCTORAL_STUDENT', 'DRAFT')).toBe(true);
    expect(canCancelDeliverable('DOCTORAL_STUDENT', 'VALIDATED')).toBe(false);
    expect(canViewDeliverable('SUPERVISOR')).toBe(true);
    expect(canViewDeliverable('DOCTORAL_STUDENT')).toBe(true);
  });

  it('opens submit and review only on the allowed transitions', () => {
    expect(canSubmit('DOCTORAL_STUDENT', 'DRAFT')).toBe(true);
    expect(canSubmit('DOCTORAL_STUDENT', 'CHANGES_REQUESTED')).toBe(true);
    expect(canSubmit('DOCTORAL_STUDENT', 'SUBMITTED')).toBe(false);
    expect(canSubmit('DOCTORAL_STUDENT', 'VALIDATED')).toBe(false);
    expect(canSubmit('SUPERVISOR', 'DRAFT')).toBe(false);
    expect(canRequestChanges('SUPERVISOR', 'SUBMITTED')).toBe(true);
    expect(canRequestChanges('SUPERVISOR', 'DRAFT')).toBe(false);
    expect(canRequestChanges('DOCTORAL_STUDENT', 'SUBMITTED')).toBe(false);
    expect(canValidate('SUPERVISOR', 'SUBMITTED')).toBe(true);
    expect(canValidate('SUPERVISOR', 'CHANGES_REQUESTED')).toBe(false);
    expect(canValidate('DOCTORAL_STUDENT', 'SUBMITTED')).toBe(false);
    expect(canReview('SUPERVISOR', 'SUBMITTED')).toBe(true);
    expect(canReview('DOCTORAL_STUDENT', 'SUBMITTED')).toBe(false);
  });

  it('allows versions while drafting or correcting, including supervisor draft attach', () => {
    expect(canCreateVersion('DOCTORAL_STUDENT', 'DRAFT')).toBe(true);
    expect(canCreateVersion('DOCTORAL_STUDENT', 'CHANGES_REQUESTED')).toBe(true);
    expect(canCreateVersion('DOCTORAL_STUDENT', 'VALIDATED')).toBe(false);
    expect(canCreateVersion('DOCTORAL_STUDENT', 'CANCELLED')).toBe(false);
    expect(canCreateVersion('DOCTORAL_STUDENT', 'SUBMITTED')).toBe(false);
    expect(canCreateVersion('SUPERVISOR', 'DRAFT')).toBe(true);
    expect(canCreateVersion('SUPERVISOR', 'CHANGES_REQUESTED')).toBe(false);
    expect(canCreateVersion('ADMIN', 'DRAFT')).toBe(false);
    expect(canUploadFile('DOCTORAL_STUDENT', 'DRAFT')).toBe(true);
    expect(canUploadFile('SUPERVISOR', 'DRAFT')).toBe(true);
    expect(canUploadFile('DOCTORAL_STUDENT', 'CHANGES_REQUESTED')).toBe(true);
    expect(canUploadFile('DOCTORAL_STUDENT', 'VALIDATED')).toBe(false);
    expect(canDownloadFile('SUPERVISOR')).toBe(true);
    expect(canDownloadFile('DOCTORAL_STUDENT')).toBe(true);
  });
});

describe('version numbers', () => {
  it('starts at 1 and then increments', () => {
    expect(nextVersionNumber(null)).toBe(1);
    expect(nextVersionNumber(undefined)).toBe(1);
    expect(nextVersionNumber(1)).toBe(2);
    expect(nextVersionNumber(2)).toBe(3);
  });
});

function item(
  id: string,
  status: 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'VALIDATED' | 'CANCELLED',
  due: string | null,
  updatedAt: string,
) {
  return {
    id,
    status,
    dueDate: due ? new Date(`${due}T00:00:00.000Z`) : null,
    updatedAt: new Date(updatedAt),
  };
}
