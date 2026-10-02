import type { INestApplication } from '@nestjs/common';
import { academicProfileSchema, dashboardSchema } from '@thesispartner/validation';
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

describe('dashboard and academic profile', () => {
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
    const memberships = await prisma.thesisMembership.findMany({
      where: { userId: { in: ids } },
      select: { thesisId: true },
    });
    const thesisIds = memberships.map((item) => item.thesisId);
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { thesisId: { in: thesisIds } }] },
    });
    await prisma.authToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.thesisMembership.deleteMany({ where: { thesisId: { in: thesisIds } } });
    await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.thesis.deleteMany({ where: { id: { in: thesisIds } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('protects the dashboard and serves an empty thesis without failing', async () => {
    const anonymous = await request(app.getHttpServer()).get('/api/v1/dashboard');
    expect(anonymous.status).toBe(401);

    const email = `dash-${Date.now()}@example.test`;
    emails.push(email);
    const owner = request.agent(app.getHttpServer());
    const registered = await owner.post('/api/v1/auth/register').send({
      email,
      password,
      givenName: 'Camille',
      familyName: 'Martin',
    });
    expect(registered.status).toBe(201);
    const csrf = csrfFrom(registered);

    const empty = await owner.get('/api/v1/dashboard');
    expect(empty.status).toBe(200);
    const before = dashboardSchema.parse(empty.body);
    expect(before.thesis).toBeNull();
    expect(before.progress).toEqual({ percentage: 0, status: 'NOT_STARTED' });
    expect(before.upcomingDeadlines).toEqual([]);
    expect(before.profileCompletion.missingFields).toContain('orcid');

    const invalid = await owner
      .patch('/api/v1/profile')
      .set('x-csrf-token', csrf)
      .send({ googleScholarUrl: 'not-a-url', extra: true });
    expect(invalid.status).toBe(400);

    const updated = await owner
      .patch('/api/v1/profile')
      .set('x-csrf-token', csrf)
      .send({ institution: 'Université de Lille', orcid: '0000-0001-2345-6789' });
    expect(updated.status).toBe(200);
    expect(academicProfileSchema.parse(updated.body).institution).toBe('Université de Lille');

    const created = await owner
      .post('/api/v1/theses')
      .set('x-csrf-token', csrf)
      .send({ title: 'Dynamique des ecosystemes cotiers' });
    expect(created.status).toBe(201);

    const filled = dashboardSchema.parse((await owner.get('/api/v1/dashboard')).body);
    expect(filled.thesis?.title).toBe('Dynamique des ecosystemes cotiers');
    expect(filled.profile.institution).toBe('Université de Lille');
    expect(filled.recentActivity.some((item) => item.type === 'THESIS_CREATED')).toBe(true);
    expect(filled.recentActivity.some((item) => item.type === 'PROFILE_UPDATED')).toBe(true);
    expect(JSON.stringify(filled.recentActivity)).not.toContain('requestId');

    const outsiderEmail = `dash-out-${Date.now()}@example.test`;
    emails.push(outsiderEmail);
    const outsider = request.agent(app.getHttpServer());
    await outsider.post('/api/v1/auth/register').send({
      email: outsiderEmail,
      password,
      givenName: 'Noah',
      familyName: 'Bernard',
    });
    const hidden = dashboardSchema.parse((await outsider.get('/api/v1/dashboard')).body);
    expect(hidden.thesis).toBeNull();
  });
});
