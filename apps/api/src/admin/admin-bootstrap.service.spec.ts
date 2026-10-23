import { AdminBootstrapService } from './admin-bootstrap.service';

describe('AdminBootstrapService', () => {
  const email = 'owner@example.test';
  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  function build(opts: {
    bootstrapEmail?: string;
    existingAdmins?: number;
    user?: { id: string; email: string; platformRole: string } | null;
  }) {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const logger = { write: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma: any = {
      user: {
        count: jest.fn().mockResolvedValue(opts.existingAdmins ?? 0),
        findUnique: jest
          .fn()
          .mockResolvedValue(
            opts.user === undefined ? { id: userId, email, platformRole: 'USER' } : opts.user,
          ),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    const env = { SUPER_ADMIN_BOOTSTRAP_EMAIL: opts.bootstrapEmail };
    const service = new AdminBootstrapService(
      prisma as never,
      audit as never,
      logger as never,
      env as never,
    );
    return { service, prisma, audit, logger };
  }

  it('does nothing when bootstrap email is unset', async () => {
    const { service, prisma } = build({});
    await expect(service.bootstrapIfConfigured()).resolves.toEqual({ promoted: false });
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('refuses to bootstrap when a Super Admin already exists', async () => {
    const { service, prisma, audit } = build({
      bootstrapEmail: email,
      existingAdmins: 1,
    });
    await expect(service.bootstrapIfConfigured()).resolves.toEqual({ promoted: false });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('promotes the configured account when none exists', async () => {
    const { service, prisma, audit } = build({
      bootstrapEmail: email,
      existingAdmins: 0,
    });
    await expect(service.bootstrapIfConfigured()).resolves.toEqual({
      promoted: true,
      email,
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { platformRole: 'SUPER_ADMIN' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'admin.bootstrap_super_admin',
        entityId: userId,
      }),
    );
  });

  it('skips quietly when the email has no account', async () => {
    const { service, prisma } = build({
      bootstrapEmail: email,
      existingAdmins: 0,
      user: null,
    });
    await expect(service.bootstrapIfConfigured()).resolves.toEqual({ promoted: false });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
