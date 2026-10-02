import type { INestApplication } from '@nestjs/common';
import { apiErrorBodySchema, healthResponseSchema } from '@thesispartner/validation';
import request from 'supertest';
import { createApp } from '../src/app.factory';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('API foundation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns health when postgres and redis are reachable', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', 'health-check-01');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('health-check-01');
    expect(healthResponseSchema.parse(response.body)).toEqual({
      status: 'ok',
      checks: { api: 'ok', database: 'ok', redis: 'ok' },
    });
    expect(JSON.stringify(response.body)).not.toContain('postgresql://');
  });

  it('queries the test database', async () => {
    const prisma = app.get(PrismaService);
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    expect(Number(rows[0]?.ok)).toBe(1);
  });

  it('returns the error contract for an unknown route', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
    expect(response.status).toBe(404);
    const body = apiErrorBodySchema.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
      errors: [],
    });
    expect(response.headers['x-request-id']).toBe(body.requestId);
  });

  it('requires a session for accounts and keeps unknown routes as not found', async () => {
    const me = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(me.status).toBe(401);
    expect(me.body.code).toBe('UNAUTHORIZED');

    const missing = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('NOT_FOUND');
  });

  it('exposes OpenAPI outside production', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json');
    expect(response.status).toBe(200);
    const paths = Object.keys(response.body.paths as Record<string, unknown>);
    expect(paths.some((path) => path.includes('health'))).toBe(true);
  });
});
