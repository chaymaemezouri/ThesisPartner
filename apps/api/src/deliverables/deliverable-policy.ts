import type { MembershipRole } from '@thesispartner/types';
import type { DeliverableStatus } from './deliverable-rules';

export function canCreateDeliverable(role: MembershipRole): boolean {
  return role === 'DOCTORAL_STUDENT' || role === 'SUPERVISOR';
}

/** Metadata edits stay open in draft and after changes are requested. */
export function canEditDeliverable(role: MembershipRole, status: DeliverableStatus): boolean {
  return (
    role === 'DOCTORAL_STUDENT' && (status === 'DRAFT' || status === 'CHANGES_REQUESTED')
  );
}

export function canCancelDeliverable(role: MembershipRole, status: DeliverableStatus): boolean {
  return role === 'DOCTORAL_STUDENT' && status === 'DRAFT';
}

export function canViewDeliverable(role: MembershipRole): boolean {
  return role === 'DOCTORAL_STUDENT' || role === 'SUPERVISOR' || role === 'ADMIN';
}

/** New versions while drafting or correcting after supervisor feedback. */
export function canCreateVersion(role: MembershipRole, status: DeliverableStatus): boolean {
  if (status === 'DRAFT') return role === 'DOCTORAL_STUDENT' || role === 'SUPERVISOR';
  if (status === 'CHANGES_REQUESTED') return role === 'DOCTORAL_STUDENT';
  return false;
}

export function canUploadFile(role: MembershipRole, status: DeliverableStatus): boolean {
  return canCreateVersion(role, status);
}

export function canDownloadFile(role: MembershipRole): boolean {
  return canViewDeliverable(role);
}

export function canEditMetadata(role: MembershipRole, status: DeliverableStatus): boolean {
  return canEditDeliverable(role, status);
}

export function canCancel(role: MembershipRole, status: DeliverableStatus): boolean {
  return canCancelDeliverable(role, status);
}

/** Doctoral student submits a draft or a corrected deliverable. */
export function canSubmit(role: MembershipRole, status: DeliverableStatus): boolean {
  return (
    role === 'DOCTORAL_STUDENT' && (status === 'DRAFT' || status === 'CHANGES_REQUESTED')
  );
}

/** Supervisor asks for corrections on a submitted deliverable. */
export function canRequestChanges(role: MembershipRole, status: DeliverableStatus): boolean {
  return role === 'SUPERVISOR' && status === 'SUBMITTED';
}

/** Supervisor validates a submitted deliverable. */
export function canValidate(role: MembershipRole, status: DeliverableStatus): boolean {
  return role === 'SUPERVISOR' && status === 'SUBMITTED';
}

export function canReview(role: MembershipRole, status: DeliverableStatus): boolean {
  return canRequestChanges(role, status) || canValidate(role, status);
}
