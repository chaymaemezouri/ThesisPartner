import { assertCanInvite } from './invite.policy';

describe('assertCanInvite', () => {
  it('lets a doctoral student invite a supervisor only', () => {
    expect(() => assertCanInvite('DOCTORAL_STUDENT', 'SUPERVISOR')).not.toThrow();
    expect(() => assertCanInvite('DOCTORAL_STUDENT', 'ADMIN')).toThrow(/cannot assign/);
    expect(() => assertCanInvite('DOCTORAL_STUDENT', 'DOCTORAL_STUDENT')).toThrow(/cannot assign/);
  });

  it('lets a supervisor or an admin invite any role', () => {
    expect(() => assertCanInvite('SUPERVISOR', 'DOCTORAL_STUDENT')).not.toThrow();
    expect(() => assertCanInvite('ADMIN', 'ADMIN')).not.toThrow();
  });
});
