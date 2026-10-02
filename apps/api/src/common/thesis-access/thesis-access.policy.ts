import type { MembershipRole } from '@thesispartner/types';
import { AppException } from '../errors/app.exception';
import type { MembershipSnapshot } from './thesis-membership.lookup';

export class ThesisAccessPolicy {
  assert(input: {
    actorId: string;
    thesisId: string;
    membership: MembershipSnapshot | null;
    allowedRoles: readonly MembershipRole[];
  }): void {
    if (
      !input.membership ||
      input.membership.userId !== input.actorId ||
      input.membership.thesisId !== input.thesisId
    ) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }

    if (!input.allowedRoles.includes(input.membership.role)) {
      throw new AppException(403, 'FORBIDDEN', 'Insufficient permissions');
    }
  }
}
