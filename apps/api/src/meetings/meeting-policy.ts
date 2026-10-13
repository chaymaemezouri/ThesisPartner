import type { MembershipRole } from '@thesispartner/types';
import type { MeetingStatus } from './meeting-rules';

export function canCreateMeeting(role: MembershipRole): boolean {
  return role === 'SUPERVISOR';
}

export function canRequestMeeting(role: MembershipRole): boolean {
  return role === 'DOCTORAL_STUDENT';
}

export function canViewMeeting(role: MembershipRole): boolean {
  return role === 'DOCTORAL_STUDENT' || role === 'SUPERVISOR' || role === 'ADMIN';
}

export function canManageMeeting(role: MembershipRole, status: MeetingStatus): boolean {
  return role === 'SUPERVISOR' && status === 'PLANNED';
}

export function canReviseRequest(role: MembershipRole, status: MeetingStatus): boolean {
  return role === 'DOCTORAL_STUDENT' && status === 'REQUESTED';
}

export function canConfirmRequest(role: MembershipRole, status: MeetingStatus): boolean {
  return role === 'SUPERVISOR' && status === 'REQUESTED';
}

export function canCancelMeeting(role: MembershipRole, status: MeetingStatus): boolean {
  return role === 'SUPERVISOR' && (status === 'PLANNED' || status === 'REQUESTED');
}
