import { Inject, Injectable } from '@nestjs/common';
import type { MembershipRole } from '@thesispartner/types';
import { SubscriptionAccessService } from '../../billing/subscription-access.service';
import { AppException } from '../errors/app.exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { THESIS_MEMBERSHIP_LOOKUP, type ThesisMembershipLookup } from './thesis-membership.lookup';
import { ThesisAccessPolicy } from './thesis-access.policy';

@Injectable()
export class ThesisAccessService {
  constructor(
    @Inject(THESIS_MEMBERSHIP_LOOKUP) private readonly memberships: ThesisMembershipLookup,
    private readonly policy: ThesisAccessPolicy,
    private readonly billingAccess: SubscriptionAccessService,
    private readonly prisma: PrismaService,
  ) {}

  async assertCanAccess(input: {
    actorId: string;
    thesisId: string;
    allowedRoles: readonly MembershipRole[];
    write?: boolean;
    requireVerified?: boolean;
  }): Promise<void> {
    const membership = await this.memberships.findByUserAndThesis(input.actorId, input.thesisId);
    this.policy.assert({
      actorId: input.actorId,
      thesisId: input.thesisId,
      membership,
      allowedRoles: input.allowedRoles,
    });
    if (input.write || input.requireVerified) {
      await this.assertEmailVerified(input.actorId);
    }
    if (input.write) {
      await this.billingAccess.assertScientificWrite(input.thesisId);
    }
  }

  async assertCanCreateThesis(userId: string): Promise<void> {
    await this.assertEmailVerified(userId);
    await this.billingAccess.assertUserCanCreateThesis(userId);
  }

  async assertEmailVerified(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });
    if (!user?.emailVerifiedAt) {
      throw new AppException(
        403,
        'EMAIL_NOT_VERIFIED',
        'Verify your email address before continuing',
      );
    }
  }

  async coverageForThesis(thesisId: string) {
    return this.billingAccess.describeThesis(thesisId);
  }
}
