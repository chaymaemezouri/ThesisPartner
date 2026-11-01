import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  function build(overrides: {
    emailVerifiedAt?: Date | null;
    memberships?: { role: 'DOCTORAL_STUDENT' | 'SUPERVISOR'; thesisId: string }[];
    trial?: { status: 'ACTIVE' | 'NOT_STARTED'; startedAt: Date | null; expiresAt: Date | null };
    supervisor?: boolean;
    pendingInvite?: boolean;
    objectives?: number;
    welcomeDismissed?: boolean;
  }) {
    const thesisId = '22222222-2222-4222-8222-222222222222';
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          email: 'doc@example.test',
          disabledAt: null,
          emailVerifiedAt: overrides.emailVerifiedAt ?? new Date(),
          profile: {
            onboardingWelcomeDismissedAt: overrides.welcomeDismissed ? new Date() : null,
            onboardingGuideCompletedAt: null,
          },
          trial: overrides.trial ?? {
            status: 'ACTIVE',
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 86_400_000),
          },
          memberships: overrides.memberships ?? [{ role: 'DOCTORAL_STUDENT', thesisId }],
        }),
      },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
      thesisMembership: {
        findFirst: jest
          .fn()
          .mockResolvedValue(overrides.supervisor ? { id: 'membership' } : null),
      },
      objective: { count: jest.fn().mockResolvedValue(overrides.objectives ?? 0) },
      deliverable: { count: jest.fn().mockResolvedValue(0) },
      meeting: { count: jest.fn().mockResolvedValue(0) },
      remark: { count: jest.fn().mockResolvedValue(0) },
      invitation: {
        findFirst: jest
          .fn()
          .mockResolvedValue(overrides.pendingInvite ? { id: 'invite' } : null),
        count: jest.fn().mockResolvedValue(0),
      },
      profile: {
        findUnique: jest.fn().mockResolvedValue({ userId }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    return { service: new OnboardingService(prisma as never), prisma, thesisId };
  }

  it('marks doctoral invite as pending until a supervisor is linked', async () => {
    const { service } = build({ pendingInvite: true, supervisor: false });
    const status = await service.status(userId);
    expect(status.persona).toBe('DOCTORAL_STUDENT');
    expect(status.steps.find((step) => step.id === 'invite')?.status).toBe('pending');
  });

  it('blocks thesis creation until trial is active', async () => {
    const { service } = build({
      memberships: [],
      trial: { status: 'NOT_STARTED', startedAt: null, expiresAt: null },
    });
    const status = await service.status(userId);
    expect(status.steps.find((step) => step.id === 'thesis')?.status).toBe('blocked');
    expect(status.steps.find((step) => step.id === 'trial')?.status).toBe('todo');
  });

  it('computes supervisor steps from supervised theses without requiring a trial', async () => {
    const thesisId = '33333333-3333-4333-8333-333333333333';
    const { service, prisma } = build({
      memberships: [{ role: 'SUPERVISOR', thesisId }],
      trial: { status: 'NOT_STARTED', startedAt: null, expiresAt: null },
      objectives: 2,
    });
    prisma.deliverable.count = jest.fn().mockResolvedValue(1);
    prisma.meeting.count = jest.fn().mockResolvedValue(0);
    prisma.remark.count = jest.fn().mockResolvedValue(1);
    const status = await service.status(userId);
    expect(status.persona).toBe('SUPERVISOR');
    expect(status.steps.find((step) => step.id === 'trial')).toBeUndefined();
    expect(status.steps.find((step) => step.id === 'supervisor_students')?.status).toBe('done');
    expect(status.steps.find((step) => step.id === 'supervisor_objectives')?.status).toBe('done');
    expect(status.steps.find((step) => step.id === 'supervisor_meetings')?.status).toBe('done');
  });

  it('persists welcome dismissal on the profile', async () => {
    const { service, prisma } = build({ welcomeDismissed: false });
    await service.applyAction(userId, 'dismiss_welcome');
    expect(prisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
        data: expect.objectContaining({ onboardingWelcomeDismissedAt: expect.any(Date) }),
      }),
    );
  });
});
