import type { INestApplication } from '@nestjs/common';
import {
  adminAnalyticsSchema,
  adminAuditListSchema,
  adminStatsSchema,
  adminSystemSchema,
} from '@thesispartner/validation';
import request from 'supertest';
import { createApp } from '../src/app.factory';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

const password = 'phrase-secrete-12';

function csrfFrom(response: request.Response): string {
  const header = response.headers['set-cookie'];
  const lines = Array.isArray(header) ? header : header ? [header] : [];
  const line = lines.find((item) => item.startsWith('tp_csrf='));
  const pair = line?.split(';')[0];
  if (!pair) throw new Error('missing csrf cookie');
  return decodeURIComponent(pair.slice('tp_csrf='.length));
}

describe('admin phase 3', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const emails: string[] = [];

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (!prisma) return;
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] },
    });
    await prisma.authToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('allows Super Admin pilotage endpoints and forbids regular users', async () => {
    const stamp = Date.now();
    const adminEmail = `admin-p3-${stamp}@example.test`;
    const userEmail = `user-p3-${stamp}@example.test`;
    emails.push(adminEmail, userEmail);

    const adminAgent = request.agent(app.getHttpServer());
    const adminReg = await adminAgent.post('/api/v1/auth/register').send({
      email: adminEmail,
      password,
      givenName: 'Super',
      familyName: 'Admin',
    });
    expect(adminReg.status).toBe(201);

    await prisma.user.update({
      where: { email: adminEmail },
      data: { platformRole: 'SUPER_ADMIN' },
    });

    // Re-login so session carries SUPER_ADMIN
    await adminAgent.post('/api/v1/auth/logout').set('x-csrf-token', csrfFrom(adminReg));
    const adminLogin = await adminAgent.post('/api/v1/auth/login').send({
      email: adminEmail,
      password,
    });
    expect(adminLogin.status).toBe(200);

    const userAgent = request.agent(app.getHttpServer());
    const userReg = await userAgent.post('/api/v1/auth/register').send({
      email: userEmail,
      password,
      givenName: 'Regular',
      familyName: 'User',
    });
    expect(userReg.status).toBe(201);

    const stats = await adminAgent.get('/api/v1/admin/stats');
    expect(stats.status).toBe(200);
    const statsBody = adminStatsSchema.parse(stats.body);
    expect(statsBody.totalUsers).toBeGreaterThanOrEqual(2);
    expect(statsBody.health.checks.api).toBe('ok');
    expect(Array.isArray(statsBody.registrationsByDay)).toBe(true);

    const analytics = await adminAgent.get('/api/v1/admin/analytics');
    expect(analytics.status).toBe(200);
    const analyticsBody = adminAnalyticsSchema.parse(analytics.body);
    expect(analyticsBody.thesesWithoutSupervisor).toBeGreaterThanOrEqual(0);
    expect(analyticsBody.registrationsByMonth.length).toBeGreaterThan(0);

    const audit = await adminAgent.get('/api/v1/admin/audit?page=1&pageSize=10');
    expect(audit.status).toBe(200);
    const auditBody = adminAuditListSchema.parse(audit.body);
    expect(auditBody.page).toBe(1);
    for (const entry of auditBody.entries) {
      expect(JSON.stringify(entry.metadata ?? {})).not.toMatch(/passwordHash|tokenHash/i);
    }

    const system = await adminAgent.get('/api/v1/admin/system');
    expect(system.status).toBe(200);
    const systemBody = adminSystemSchema.parse(system.body);
    expect(systemBody.health.checks.api).toBe('ok');
    expect(systemBody).not.toHaveProperty('DATABASE_URL');
    expect(['development', 'test', 'production']).toContain(systemBody.nodeEnv);

    for (const path of ['/stats', '/analytics', '/audit', '/system'] as const) {
      const denied = await userAgent.get(`/api/v1/admin${path}`);
      expect(denied.status).toBe(403);
      expect(denied.body.code).toBe('FORBIDDEN');
    }
  });
});
