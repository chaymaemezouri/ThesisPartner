import type { MembershipRole } from '@thesispartner/types';
import { AppException } from '../common/errors/app.exception';

export function assertCanInvite(actorRole: MembershipRole, invitedRole: MembershipRole): void {
  if (actorRole === 'ADMIN' || actorRole === 'SUPERVISOR') return;
  if (actorRole === 'DOCTORAL_STUDENT' && invitedRole === 'SUPERVISOR') return;
  throw new AppException(403, 'FORBIDDEN', 'You cannot assign this role');
}
