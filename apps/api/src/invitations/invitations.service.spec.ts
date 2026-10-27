import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  const actorId = '11111111-1111-4111-8111-111111111111';
  const thesisId = '22222222-2222-4222-8222-222222222222';
  const inviteeId = '33333333-3333-4333-8333-333333333333';
  const invitationId = '44444444-4444-4444-8444-444444444444';
  const token = 'a'.repeat(43);

  function build() {
    const access = { assertCanAccess: jest.fn().mockResolvedValue(undefined) };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const mailer = { send: jest.fn().mockResolvedValue(undefined) };
    const logger = { write: jest.fn() };
    const env = { APP_URL: 'http://localhost:5173', NODE_ENV: 'test' as string };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma: any = {
      thesisMembership: {
        findUnique: jest.fn().mockResolvedValue({
          role: 'DOCTORAL_STUDENT',
          user: {
            email: 'student@example.test',
            profile: { displayName: 'Ada Student' },
          },
          thesis: { title: 'Coastal ecosystems' },
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'membership-1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      invitation: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn().mockResolvedValue({
          id: invitationId,
          email: 'supervisor@example.test',
          role: 'SUPERVISOR',
          status: 'PENDING',
          emailStatus: 'QUEUED',
          expiresAt: new Date(Date.now() + 86_400_000),
          replacesSupervisor: false,
        }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      supervisionHistory: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };

    const service = new InvitationsService(
      prisma as never,
      access as never,
      audit as never,
      mailer as never,
      logger as never,
      env as never,
    );
    return { service, prisma, access, audit, mailer, env };
  }

  it('creates a pending invitation without membership and sends email', async () => {
    const { service, prisma, mailer, audit } = build();

    const result = await service.create(
      actorId,
      thesisId,
      { email: 'supervisor@example.test', role: 'SUPERVISOR' },
      'req-1',
    );

    expect(result.status).toBe('PENDING');
    expect(result.emailStatus).toBe('SENT');
    expect(prisma.thesisMembership.create).not.toHaveBeenCalled();
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'supervisor@example.test',
        subject: expect.stringContaining('Coastal ecosystems'),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ action: 'invitation.created' }),
    );
  });

  it('rejects duplicate pending invitations for the same email', async () => {
    const { service, prisma } = build();
    prisma.invitation.findFirst = jest.fn().mockResolvedValue({ id: invitationId });

    await expect(
      service.create(actorId, thesisId, {
        email: 'supervisor@example.test',
        role: 'SUPERVISOR',
      }),
    ).rejects.toMatchObject({ appCode: 'CONFLICT' });
  });

  it('accepts only with matching email and creates membership once', async () => {
    const { service, prisma, audit } = build();
    const { hashOpaqueToken } = await import('../common/security/opaque-token');
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: inviteeId,
      email: 'supervisor@example.test',
      disabledAt: null,
    });
    prisma.invitation.findUnique = jest.fn().mockResolvedValue({
      id: invitationId,
      thesisId,
      email: 'supervisor@example.test',
      role: 'SUPERVISOR',
      status: 'PENDING',
      replacesSupervisor: false,
      changeReason: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      tokenHash: hashOpaqueToken(token),
      thesis: { id: thesisId, title: 'Coastal ecosystems' },
      invitedBy: { profile: { displayName: 'Ada' } },
    });
    prisma.invitation.findUniqueOrThrow = jest.fn().mockResolvedValue({
      id: invitationId,
      thesisId,
      email: 'supervisor@example.test',
      role: 'SUPERVISOR',
      status: 'ACCEPTED',
      emailStatus: 'SENT',
      replacesSupervisor: false,
      changeReason: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      respondedAt: new Date(),
      thesis: { id: thesisId, title: 'Coastal ecosystems' },
      invitedBy: { profile: { displayName: 'Ada' } },
    });
    prisma.thesisMembership.findUnique = jest.fn().mockResolvedValue(null);

    await service.accept(inviteeId, token, 'req-2');

    expect(prisma.thesisMembership.create).toHaveBeenCalledWith({
      data: { thesisId, userId: inviteeId, role: 'SUPERVISOR' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ action: 'invitation.accepted' }),
    );
  });

  it('refuses accept when authenticated email does not match', async () => {
    const { service, prisma } = build();
    const { hashOpaqueToken } = await import('../common/security/opaque-token');
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: inviteeId,
      email: 'other@example.test',
      disabledAt: null,
    });
    prisma.invitation.findUnique = jest.fn().mockResolvedValue({
      id: invitationId,
      thesisId,
      email: 'supervisor@example.test',
      role: 'SUPERVISOR',
      status: 'PENDING',
      replacesSupervisor: false,
      changeReason: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      tokenHash: hashOpaqueToken(token),
      thesis: { id: thesisId, title: 'Coastal ecosystems' },
      invitedBy: { profile: { displayName: 'Ada' } },
    });

    await expect(service.accept(inviteeId, token)).rejects.toMatchObject({
      appCode: 'FORBIDDEN',
    });
    expect(prisma.thesisMembership.create).not.toHaveBeenCalled();
  });

  it('refuses accept when the invitation token is expired', async () => {
    const { service, prisma } = build();
    const { hashOpaqueToken } = await import('../common/security/opaque-token');
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: inviteeId,
      email: 'supervisor@example.test',
      disabledAt: null,
    });
    prisma.invitation.findUnique = jest.fn().mockResolvedValue({
      id: invitationId,
      thesisId,
      email: 'supervisor@example.test',
      role: 'SUPERVISOR',
      status: 'PENDING',
      replacesSupervisor: false,
      changeReason: null,
      expiresAt: new Date(Date.now() - 60_000),
      tokenHash: hashOpaqueToken(token),
      thesis: { id: thesisId, title: 'Coastal ecosystems' },
      invitedBy: { profile: { displayName: 'Ada' } },
    });

    await expect(service.accept(inviteeId, token)).rejects.toMatchObject({
      appCode: 'BAD_REQUEST',
    });
    expect(prisma.thesisMembership.create).not.toHaveBeenCalled();
  });

  it('refuses accept when the invitation was already accepted', async () => {
    const { service, prisma } = build();
    const { hashOpaqueToken } = await import('../common/security/opaque-token');
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: inviteeId,
      email: 'supervisor@example.test',
      disabledAt: null,
    });
    prisma.invitation.findUnique = jest.fn().mockResolvedValue({
      id: invitationId,
      thesisId,
      email: 'supervisor@example.test',
      role: 'SUPERVISOR',
      status: 'ACCEPTED',
      replacesSupervisor: false,
      changeReason: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      tokenHash: hashOpaqueToken(token),
      thesis: { id: thesisId, title: 'Coastal ecosystems' },
      invitedBy: { profile: { displayName: 'Ada' } },
    });

    await expect(service.accept(inviteeId, token)).rejects.toMatchObject({
      appCode: 'CONFLICT',
    });
    expect(prisma.thesisMembership.create).not.toHaveBeenCalled();
  });

  it('archives previous supervisor when accepting a replacement invitation', async () => {
    const { service, prisma } = build();
    const { hashOpaqueToken } = await import('../common/security/opaque-token');
    const previousId = '55555555-5555-4555-8555-555555555555';
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: inviteeId,
      email: 'new-supervisor@example.test',
      disabledAt: null,
    });
    prisma.invitation.findUnique = jest.fn().mockResolvedValue({
      id: invitationId,
      thesisId,
      email: 'new-supervisor@example.test',
      role: 'SUPERVISOR',
      status: 'PENDING',
      replacesSupervisor: true,
      changeReason: 'Retirement',
      expiresAt: new Date(Date.now() + 86_400_000),
      tokenHash: hashOpaqueToken(token),
      thesis: { id: thesisId, title: 'Coastal ecosystems' },
      invitedBy: { profile: { displayName: 'Ada' } },
    });
    prisma.invitation.findUniqueOrThrow = jest.fn().mockResolvedValue({
      id: invitationId,
      thesisId,
      email: 'new-supervisor@example.test',
      role: 'SUPERVISOR',
      status: 'ACCEPTED',
      emailStatus: 'SENT',
      replacesSupervisor: true,
      changeReason: 'Retirement',
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      respondedAt: new Date(),
      thesis: { id: thesisId, title: 'Coastal ecosystems' },
      invitedBy: { profile: { displayName: 'Ada' } },
    });
    prisma.thesisMembership.findUnique = jest.fn().mockResolvedValue(null);
    prisma.thesisMembership.findFirst = jest.fn().mockResolvedValue({
      id: 'old-membership',
      userId: previousId,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.accept(inviteeId, token, 'req-3');

    expect(prisma.supervisionHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supervisorUserId: previousId,
        endedReason: 'REPLACED',
        changeReason: 'Retirement',
      }),
    });
    expect(prisma.thesisMembership.delete).toHaveBeenCalledWith({
      where: { id: 'old-membership' },
    });
  });

  it('keeps the invitation when SMTP delivery fails', async () => {
    const { service, prisma, mailer } = build();
    mailer.send = jest.fn().mockRejectedValue(new Error('smtp down'));

    const result = await service.create(actorId, thesisId, {
      email: 'supervisor@example.test',
      role: 'SUPERVISOR',
    });

    expect(result.status).toBe('PENDING');
    expect(result.emailStatus).toBe('FAILED');
    expect(prisma.invitation.create).toHaveBeenCalled();
    expect(prisma.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ emailStatus: 'FAILED' }),
      }),
    );
  });

  it('rate-limits invitation resend within a minute', async () => {
    const { service, prisma, env } = build();
    env.NODE_ENV = 'development';
    prisma.invitation.findFirst = jest.fn().mockResolvedValue({
      id: invitationId,
      thesisId,
      email: 'supervisor@example.test',
      role: 'SUPERVISOR',
      status: 'PENDING',
      emailAttemptedAt: new Date(),
      replacesSupervisor: false,
      thesis: { id: thesisId, title: 'Coastal ecosystems' },
      invitedBy: { profile: { displayName: 'Ada' } },
    });

    await expect(service.resend(actorId, thesisId, invitationId)).rejects.toMatchObject({
      appCode: 'RATE_LIMITED',
    });
  });
});
