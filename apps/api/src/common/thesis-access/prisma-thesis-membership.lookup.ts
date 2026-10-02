import { Injectable } from '@nestjs/common';
import { MEMBERSHIP_ROLES, type MembershipRole } from '@thesispartner/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { MembershipSnapshot, ThesisMembershipLookup } from './thesis-membership.lookup';

@Injectable()
export class PrismaThesisMembershipLookup implements ThesisMembershipLookup {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndThesis(userId: string, thesisId: string): Promise<MembershipSnapshot | null> {
    const row = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId } },
      select: { userId: true, thesisId: true, role: true },
    });
    if (!row) return null;
    return {
      userId: row.userId,
      thesisId: row.thesisId,
      role: asMembershipRole(row.role),
    };
  }
}

function asMembershipRole(value: string): MembershipRole {
  if ((MEMBERSHIP_ROLES as readonly string[]).includes(value)) {
    return value as MembershipRole;
  }
  throw new Error('Unknown membership role');
}
