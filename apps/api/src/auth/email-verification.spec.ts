import { AppException } from '../common/errors/app.exception';
import { AuthService } from './auth.service';

describe('AuthService email verification', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  function build(opts?: { verified?: boolean; recentTokenAt?: Date | null }) {
    const prisma: {
      user: { findUnique: jest.Mock; update: jest.Mock };
      authToken: {
        findFirst: jest.Mock;
        deleteMany: jest.Mock;
        create: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
      };
      $transaction: jest.Mock;
    } = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          email: 'doc@example.test',
          emailVerifiedAt: opts?.verified ? new Date() : null,
          disabledAt: null,
        }),
        update: jest.fn(),
      },
      authToken: {
        findFirst: jest
          .fn()
          .mockResolvedValue(opts?.recentTokenAt ? { createdAt: opts.recentTokenAt } : null),
        deleteMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma),
    );
    const mailer = { send: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthService(
      prisma as never,
      { hash: jest.fn().mockResolvedValue('hash'), verify: jest.fn() } as never,
      { issue: jest.fn(), revokeAll: jest.fn() } as never,
      mailer as never,
      { assertAllowed: jest.fn(), recordFailure: jest.fn(), clear: jest.fn() } as never,
      { record: jest.fn() } as never,
      { write: jest.fn() } as never,
      { autoStartTrialIfEligible: jest.fn().mockResolvedValue(false) } as never,
      { NODE_ENV: 'development', APP_URL: 'http://localhost:5173' } as never,
    );
    return { service, prisma, mailer };
  }

  it('rate-limits verification resend within 60 seconds', async () => {
    const { service } = build({ recentTokenAt: new Date() });
    await expect(service.requestVerification({ userId } as never)).rejects.toMatchObject({
      appCode: 'RATE_LIMITED',
    });
  });

  it('skips resend when the email is already verified', async () => {
    const { service, mailer, prisma } = build({ verified: true });
    await service.requestVerification({ userId } as never);
    expect(mailer.send).not.toHaveBeenCalled();
    expect(prisma.authToken.create).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired verification tokens', async () => {
    const { service, prisma } = build();
    prisma.authToken.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.verifyEmail('not-a-real-token')).rejects.toBeInstanceOf(AppException);
  });
});
