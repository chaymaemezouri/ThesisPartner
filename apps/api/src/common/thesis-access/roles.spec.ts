import { MembershipRole } from '@prisma/client';
import { MEMBERSHIP_ROLES } from '@thesispartner/types';

describe('membership roles', () => {
  it('matches the database enum', () => {
    expect([...Object.values(MembershipRole)].sort()).toEqual([...MEMBERSHIP_ROLES].sort());
  });
});
