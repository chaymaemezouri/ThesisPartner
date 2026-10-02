import type { MembershipRole } from '@thesispartner/types';

export interface MembershipSnapshot {
  userId: string;
  thesisId: string;
  role: MembershipRole;
}

export interface ThesisMembershipLookup {
  findByUserAndThesis(userId: string, thesisId: string): Promise<MembershipSnapshot | null>;
}

export const THESIS_MEMBERSHIP_LOOKUP = Symbol('THESIS_MEMBERSHIP_LOOKUP');
