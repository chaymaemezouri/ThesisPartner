import { SuperAdminGuard } from './super-admin.guard';

describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();

  function context(auth: { platformRole: string; userId: string } | undefined) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ auth }),
      }),
    } as never;
  }

  it('allows SUPER_ADMIN', () => {
    expect(guard.canActivate(context({ userId: 'u1', platformRole: 'SUPER_ADMIN' }))).toBe(true);
  });

  it('rejects unauthenticated requests', () => {
    expect(() => guard.canActivate(context(undefined))).toThrow(
      expect.objectContaining({ appCode: 'UNAUTHORIZED' }),
    );
  });

  it('rejects non-admin platform roles', () => {
    expect(() => guard.canActivate(context({ userId: 'u1', platformRole: 'USER' }))).toThrow(
      expect.objectContaining({ appCode: 'FORBIDDEN' }),
    );
  });
});
