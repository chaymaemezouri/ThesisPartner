import { Inject, Injectable } from '@nestjs/common';
import type { MembershipRole } from '@thesispartner/types';
import { SubscriptionAccessService } from '../../billing/subscription-access.service';
import { THESIS_MEMBERSHIP_LOOKUP, type ThesisMembershipLookup } from './thesis-membership.lookup';
import { ThesisAccessPolicy } from './thesis-access.policy';

@Injectable()
export class ThesisAccessService {
  constructor(
    @Inject(THESIS_MEMBERSHIP_LOOKUP) private readonly memberships: ThesisMembershipLookup,
    private readonly policy: ThesisAccessPolicy,
    private readonly billingAccess: SubscriptionAccessService,
  ) {}

  async assertCanAccess(input: {
    actorId: string;
    thesisId: string;
    allowedRoles: readonly MembershipRole[];
    write?: boolean;
  }): Promise<void> {
    const membership = await this.memberships.findByUserAndThesis(input.actorId, input.thesisId);
    this.policy.assert({
      actorId: input.actorId,
      thesisId: input.thesisId,
      membership,
      allowedRoles: input.allowedRoles,
    });
    if (input.write) {
      await this.billingAccess.assertScientificWrite(input.thesisId);
    }
  }

  async assertCanCreateThesis(userId: string): Promise<void> {
    await this.billingAccess.assertUserCanCreateThesis(userId);
  }

  async coverageForThesis(thesisId: string) {
    return this.billingAccess.describeThesis(thesisId);
  }
}
