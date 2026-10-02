import { Module } from '@nestjs/common';
import { PrismaThesisMembershipLookup } from './prisma-thesis-membership.lookup';
import { THESIS_MEMBERSHIP_LOOKUP } from './thesis-membership.lookup';
import { ThesisAccessPolicy } from './thesis-access.policy';
import { ThesisAccessService } from './thesis-access.service';

@Module({
  providers: [
    ThesisAccessPolicy,
    ThesisAccessService,
    PrismaThesisMembershipLookup,
    {
      provide: THESIS_MEMBERSHIP_LOOKUP,
      useExisting: PrismaThesisMembershipLookup,
    },
  ],
  exports: [ThesisAccessService],
})
export class ThesisAccessModule {}
