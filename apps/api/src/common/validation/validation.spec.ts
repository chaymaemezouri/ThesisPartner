import { Body, Controller, Module, Post } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { apiErrorBodySchema } from '@thesispartner/validation';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';
import { requestIdMiddleware } from '../http/request-context';
import { StructuredLogger } from '../../infrastructure/logger/logger';
import { ENV } from '../../config/env';
import { ValidateBody, ZodBodyInterceptor } from './zod-body.interceptor';

const probeSchema = z
  .object({
    title: z.string().trim().min(1).max(20),
  })
  .strict();

@Controller('probe')
class ProbeController {
  @Post()
  @ValidateBody(probeSchema)
  create(@Body() body: { title: string }) {
    return { title: body.title };
  }
}

@Module({
  controllers: [ProbeController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ZodBodyInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: StructuredLogger, useValue: new StructuredLogger('silent') },
    { provide: ENV, useValue: { NODE_ENV: 'test' } },
  ],
})
class ProbeModule {}

describe('request validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: true });
    app.use(requestIdMiddleware);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid body and rejects unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/probe')
      .send({ title: '  État de l’art  ' })
      .expect(201);

    const invalid = await request(app.getHttpServer())
      .post('/probe')
      .set('x-request-id', 'req-valid-1')
      .send({ title: 'Ok', extra: true });

    expect(invalid.status).toBe(400);
    expect(apiErrorBodySchema.parse(invalid.body)).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      requestId: 'req-valid-1',
    });
    expect(invalid.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects a missing route with the shared error contract', async () => {
    const response = await request(app.getHttpServer())
      .get('/missing')
      .set('x-request-id', 'req-missing');
    expect(response.status).toBe(404);
    expect(response.headers['x-request-id']).toBe('req-missing');
    expect(apiErrorBodySchema.parse(response.body).code).toBe('NOT_FOUND');
  });

  it('rejects unsafe object keys', async () => {
    const response = await request(app.getHttpServer())
      .post('/probe')
      .send({ title: 'Ok', constructor: { prototype: {} } });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });
});
