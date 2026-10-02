import {
  canClose,
  canCreateRemark,
  canReopen,
  canReply,
  canResolve,
  canViewRemark,
} from './remark-policy';

describe('remark policy', () => {
  it('lets only a supervisor create and close remarks', () => {
    expect(canCreateRemark('SUPERVISOR')).toBe(true);
    expect(canCreateRemark('DOCTORAL_STUDENT')).toBe(false);
    expect(canClose('SUPERVISOR', 'RESOLVED')).toBe(true);
    expect(canClose('SUPERVISOR', 'OPEN')).toBe(false);
    expect(canClose('DOCTORAL_STUDENT', 'RESOLVED')).toBe(false);
    expect(canReopen('SUPERVISOR', 'CLOSED')).toBe(true);
    expect(canReopen('SUPERVISOR', 'RESOLVED')).toBe(true);
    expect(canReopen('DOCTORAL_STUDENT', 'CLOSED')).toBe(false);
  });

  it('lets the doctoral student resolve open work and reply while open', () => {
    expect(canResolve('DOCTORAL_STUDENT', 'OPEN')).toBe(true);
    expect(canResolve('DOCTORAL_STUDENT', 'IN_PROGRESS')).toBe(true);
    expect(canResolve('DOCTORAL_STUDENT', 'RESOLVED')).toBe(false);
    expect(canResolve('SUPERVISOR', 'OPEN')).toBe(false);
    expect(canReply('DOCTORAL_STUDENT', 'OPEN')).toBe(true);
    expect(canReply('SUPERVISOR', 'IN_PROGRESS')).toBe(true);
    expect(canReply('DOCTORAL_STUDENT', 'CLOSED')).toBe(false);
    expect(canViewRemark('ADMIN')).toBe(true);
  });
});
