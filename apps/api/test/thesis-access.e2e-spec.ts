import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.factory';
import { ThesisAccessService } from '../src/common/thesis-access/thesis-access.service';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { AppException } from '../src/common/errors/app.exception';

describe('thesis isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let access: ThesisAccessService;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    prisma = app.get(PrismaService);
    access = app.get(ThesisAccessService);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.authToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.thesisMembership.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.thesis.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('allows a member and hides the thesis from everyone else', async () => {
    const owner = await prisma.user.create({
      data: {
        email: `owner-${Date.now()}@example.test`,
        passwordHash: 'not-used-for-login',
        profile: {
          create: { givenName: 'Owner', familyName: 'Test', displayName: 'Owner Test' },
        },
      },
    });
    const outsider = await prisma.user.create({
      data: {
        email: `outsider-${Date.now()}@example.test`,
        passwordHash: 'not-used-for-login',
      },
    });
    const thesis = await prisma.thesis.create({
      data: {
        title: 'Isolation test',
        memberships: { create: { userId: owner.id, role: 'DOCTORAL_STUDENT' } },
      },
    });

    await expect(
      access.assertCanAccess({
        actorId: owner.id,
        thesisId: thesis.id,
        allowedRoles: ['DOCTORAL_STUDENT'],
      }),
    ).resolves.toBeUndefined();

    await expect(
      access.assertCanAccess({
        actorId: outsider.id,
        thesisId: thesis.id,
        allowedRoles: ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'],
      }),
    ).rejects.toBeInstanceOf(AppException);

    await expect(
      access.assertCanAccess({
        actorId: owner.id,
        thesisId: thesis.id,
        allowedRoles: ['SUPERVISOR'],
      }),
    ).rejects.toMatchObject({ appCode: 'FORBIDDEN' });
  });
});
