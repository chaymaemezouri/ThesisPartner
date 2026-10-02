import { AppException } from '../errors/app.exception';
import { ThesisAccessPolicy } from './thesis-access.policy';

describe('ThesisAccessPolicy', () => {
  const policy = new ThesisAccessPolicy();
  const thesisId = '11111111-1111-4111-8111-111111111111';
  const actorId = '22222222-2222-4222-8222-222222222222';

  it('allows a member with a permitted role', () => {
    expect(() =>
      policy.assert({
        actorId,
        thesisId,
        membership: { userId: actorId, thesisId, role: 'DOCTORAL_STUDENT' },
        allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR'],
      }),
    ).not.toThrow();
  });

  it('hides a thesis from a user who is not a member', () => {
    expect.assertions(2);
    try {
      policy.assert({
        actorId,
        thesisId,
        membership: null,
        allowedRoles: ['DOCTORAL_STUDENT'],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getStatus()).toBe(404);
    }
  });

  it('rejects a member whose role is not allowed', () => {
    expect.assertions(2);
    try {
      policy.assert({
        actorId,
        thesisId,
        membership: { userId: actorId, thesisId, role: 'DOCTORAL_STUDENT' },
        allowedRoles: ['SUPERVISOR'],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).appCode).toBe('FORBIDDEN');
    }
  });
});
