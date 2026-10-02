import type { MembershipRole } from '@thesispartner/types';
import type { RemarkStatus } from './remark-rules';

export function canCreateRemark(role: MembershipRole): boolean {
  return role === 'SUPERVISOR';
}

export function canViewRemark(role: MembershipRole): boolean {
  return role === 'DOCTORAL_STUDENT' || role === 'SUPERVISOR' || role === 'ADMIN';
}

export function canReply(role: MembershipRole, status: RemarkStatus): boolean {
  if (status === 'CLOSED') return false;
  return role === 'DOCTORAL_STUDENT' || role === 'SUPERVISOR';
}

export function canResolve(role: MembershipRole, status: RemarkStatus): boolean {
  return (
    role === 'DOCTORAL_STUDENT' && (status === 'OPEN' || status === 'IN_PROGRESS')
  );
}

export function canClose(role: MembershipRole, status: RemarkStatus): boolean {
  return role === 'SUPERVISOR' && status === 'RESOLVED';
}

export function canReopen(role: MembershipRole, status: RemarkStatus): boolean {
  return role === 'SUPERVISOR' && (status === 'RESOLVED' || status === 'CLOSED');
}
