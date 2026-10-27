import { AdminService } from './admin.service';

describe('AdminService', () => {
  const actorId = '11111111-1111-4111-8111-111111111111';
  const targetId = '22222222-2222-4222-8222-222222222222';
  const otherAdminId = '33333333-3333-4333-8333-333333333333';

  function buildService(overrides: {
    target?: Record<string, unknown> | null;
    activeSuperAdmins?: number;
    audit?: { record: jest.Mock };
    sessions?: { revokeAll: jest.Mock };
    health?: { check: jest.Mock };
    env?: { NODE_ENV: 'development' | 'test' | 'production' };
    prismaExtras?: Record<string, unknown>;
  }) {
    const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
    const sessions = overrides.sessions ?? { revokeAll: jest.fn().mockResolvedValue(undefined) };
    const health = overrides.health ?? {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        checks: { api: 'ok', database: 'ok', redis: 'ok', storage: 'ok' },
      }),
    };
    const env = overrides.env ?? { NODE_ENV: 'test' as const };
    const target =
      overrides.target === undefined
        ? {
            id: targetId,
            email: 'user@example.test',
            platformRole: 'USER',
            disabledAt: null,
          }
        : overrides.target;

    const profile = {
      displayName: 'Ada Lovelace',
      givenName: 'Ada',
      familyName: 'Lovelace',
      institution: null,
      academicTitle: null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
          if (where.id === targetId) {
            if (!target) return null;
            return {
              ...target,
              emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              profile,
              memberships: [],
            };
          }
          return null;
        }),
        count: jest.fn().mockResolvedValue(overrides.activeSuperAdmins ?? 2),
        update: jest.fn().mockResolvedValue({}),
      },
      thesis: { count: jest.fn().mockResolvedValue(3) },
      thesisMembership: {
        groupBy: jest.fn().mockResolvedValue([{ userId: targetId }]),
      },
      invitation: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      session: { count: jest.fn().mockResolvedValue(0) },
      auditLog: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      ...overrides.prismaExtras,
    };
    prisma.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));

    const service = new AdminService(
      prisma as never,
      audit as never,
      sessions as never,
      health as never,
      env as never,
    );
    return { service, prisma, audit, sessions, health };
  }

  it('computes enriched dashboard stats from real counts', async () => {
    const { service, prisma, health } = buildService({});
    prisma.user.count = jest
      .fn()
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(9);
    prisma.thesis.count = jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(3);
    prisma.thesisMembership.groupBy = jest
      .fn()
      .mockResolvedValueOnce([{ userId: 'a' }, { userId: 'b' }])
      .mockResolvedValueOnce([{ userId: 'c' }]);
    prisma.invitation.groupBy = jest.fn().mockResolvedValue([
      { status: 'PENDING', _count: { _all: 5 } },
      { status: 'ACCEPTED', _count: { _all: 12 } },
      { status: 'REJECTED', _count: { _all: 2 } },
      { status: 'EXPIRED', _count: { _all: 1 } },
    ]);
    prisma.$queryRaw = jest
      .fn()
      .mockResolvedValue([{ day: new Date('2026-10-01T00:00:00.000Z'), count: 2 }]);

    const result = await service.stats();

    expect(result.totalUsers).toBe(10);
    expect(result.activeAccounts).toBe(8);
    expect(result.suspendedAccounts).toBe(2);
    expect(result.doctoralStudents).toBe(2);
    expect(result.supervisors).toBe(1);
    expect(result.theses).toBe(4);
    expect(result.activeTheses).toBe(3);
    expect(result.invitationsPending).toBe(5);
    expect(result.invitationsAccepted).toBe(12);
    expect(result.invitationsRejected).toBe(2);
    expect(result.invitationsExpired).toBe(1);
    expect(result.registrationsLast7Days).toBe(1);
    expect(result.registrationsLast30Days).toBe(3);
    expect(result.registrationsLast12Months).toBe(9);
    expect(
      result.registrationsByDay.some((point) => point.date === '2026-10-01' && point.count === 2),
    ).toBe(true);
    expect(result.health).toEqual({
      status: 'ok',
      checks: { api: 'ok', database: 'ok', redis: 'ok', storage: 'ok' },
    });
    expect(health.check).toHaveBeenCalled();
  });

  it('returns analytics aggregates without inventing metrics', async () => {
    const { service, prisma } = buildService({});
    prisma.thesis.count = jest.fn().mockResolvedValue(4);
    prisma.invitation.count = jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    prisma.session.count = jest.fn().mockResolvedValue(7);
    prisma.auditLog.count = jest.fn().mockResolvedValueOnce(11).mockResolvedValueOnce(1);
    prisma.$queryRaw = jest.fn().mockResolvedValue([]);

    const result = await service.analytics();

    expect(result.thesesWithoutSupervisor).toBe(4);
    expect(result.pendingInvitationsOlderThan7Days).toBe(2);
    expect(result.expiredInvitations).toBe(3);
    expect(result.activeSessions).toBe(7);
    expect(result.loginsLast30Days).toBe(11);
    expect(result.supervisorChangesLast30Days).toBe(1);
    expect(result.registrationsByDay.length).toBeGreaterThan(0);
    expect(result.activityByDay.length).toBeGreaterThan(0);
    expect(result.registrationsByMonth.length).toBeGreaterThan(0);
  });

  it('lists audit entries with sanitized metadata', async () => {
    const entryId = '44444444-4444-4444-8444-444444444444';
    const { service, prisma } = buildService({});
    prisma.auditLog.count = jest.fn().mockResolvedValue(1);
    prisma.auditLog.findMany = jest.fn().mockResolvedValue([
      {
        id: entryId,
        action: 'admin.user_suspend',
        entityType: 'user',
        entityId: targetId,
        actorId,
        thesisId: null,
        requestId: 'req-9',
        metadata: { reason: 'Abuse', token: 'secret-value', passwordHash: 'x' },
        createdAt: new Date('2026-10-23T12:00:00.000Z'),
        actor: {
          email: 'admin@example.test',
          profile: { displayName: 'Super Admin' },
        },
        thesis: null,
      },
    ]);

    const result = await service.listAudit({ page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    const entry = result.entries[0];
    expect(entry).toBeDefined();
    expect(entry).toMatchObject({
      id: entryId,
      action: 'admin.user_suspend',
      actorEmail: 'admin@example.test',
      actorDisplayName: 'Super Admin',
      metadata: { reason: 'Abuse' },
    });
    expect(entry?.metadata).not.toHaveProperty('token');
    expect(entry?.metadata).not.toHaveProperty('passwordHash');
  });

  it('returns system health without exposing secrets', async () => {
    const { service } = buildService({});
    const result = await service.system();
    expect(result).toMatchObject({
      nodeEnv: 'test',
      health: { status: 'ok' },
      activeSessions: 0,
      invitationsPending: 0,
    });
    expect(result).not.toHaveProperty('databaseUrl');
    expect(result).not.toHaveProperty('redisUrl');
  });

  it('refuses self-suspension', async () => {
    const { service } = buildService({});
    await expect(
      service.suspend(actorId, actorId, { reason: 'test' }, 'req-1'),
    ).rejects.toMatchObject({ appCode: 'BAD_REQUEST' });
  });

  it('refuses suspending the last active Super Admin', async () => {
    const { service, prisma } = buildService({
      target: {
        id: targetId,
        email: 'admin@example.test',
        platformRole: 'SUPER_ADMIN',
        disabledAt: null,
      },
      activeSuperAdmins: 1,
    });

    await expect(
      service.suspend(actorId, targetId, { reason: 'cleanup' }, 'req-2'),
    ).rejects.toMatchObject({ appCode: 'BAD_REQUEST' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('suspends a regular user, revokes sessions, and writes an audit entry', async () => {
    const { service, prisma, audit, sessions } = buildService({});
    let suspended = false;
    prisma.user.findUnique = jest.fn().mockImplementation(async () => ({
      id: targetId,
      email: 'user@example.test',
      platformRole: 'USER',
      disabledAt: suspended ? new Date('2026-10-23T12:00:00.000Z') : null,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      profile: {
        displayName: 'Ada Lovelace',
        givenName: 'Ada',
        familyName: 'Lovelace',
        institution: null,
        academicTitle: null,
      },
      memberships: [],
    }));
    prisma.user.update = jest.fn().mockImplementation(async () => {
      suspended = true;
      return {};
    });

    const result = await service.suspend(actorId, targetId, { reason: 'Abuse' }, 'req-3');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: targetId },
      data: { disabledAt: expect.any(Date) },
    });
    expect(sessions.revokeAll).toHaveBeenCalledWith(prisma, targetId);
    expect(audit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        actorId,
        action: 'admin.user_suspend',
        entityType: 'user',
        entityId: targetId,
        requestId: 'req-3',
        metadata: expect.objectContaining({ reason: 'Abuse' }),
      }),
    );
    expect(result.id).toBe(targetId);
    expect(result.disabledAt).toBe('2026-10-23T12:00:00.000Z');
  });

  it('allows suspending a Super Admin when another remains active', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const sessions = { revokeAll: jest.fn().mockResolvedValue(undefined) };
    const health = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        checks: { api: 'ok', database: 'ok', redis: 'ok', storage: 'ok' },
      }),
    };
    const profile = {
      displayName: 'Other Admin',
      givenName: 'Other',
      familyName: 'Admin',
      institution: null,
      academicTitle: null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: otherAdminId,
          email: 'other-admin@example.test',
          platformRole: 'SUPER_ADMIN',
          disabledAt: null,
          emailVerifiedAt: new Date(),
          createdAt: new Date(),
          profile,
          memberships: [],
        }),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    const service = new AdminService(
      prisma as never,
      audit as never,
      sessions as never,
      health as never,
      { NODE_ENV: 'test' } as never,
    );

    await expect(
      service.suspend(actorId, otherAdminId, { reason: 'Rotation' }, 'req-4'),
    ).resolves.toMatchObject({ id: otherAdminId });
    expect(sessions.revokeAll).toHaveBeenCalled();
  });

  it('reactivates a suspended account with audit trail', async () => {
    const { service, prisma, audit } = buildService({
      target: {
        id: targetId,
        email: 'user@example.test',
        platformRole: 'USER',
        disabledAt: new Date('2026-10-01T00:00:00.000Z'),
      },
    });

    await service.reactivate(actorId, targetId, { reason: 'Appeal accepted' }, 'req-5');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: targetId },
      data: { disabledAt: null },
    });
    expect(audit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'admin.user_reactivate',
        metadata: expect.objectContaining({ reason: 'Appeal accepted' }),
      }),
    );
  });
});
