import { HttpException, type ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { StructuredLogger } from '../../infrastructure/logger/logger';
import { AppException } from '../errors/app.exception';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(request: Partial<Request>, response: Response): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  const sink = jest.fn();
  const logger = new StructuredLogger('info', sink);
  const filter = new AllExceptionsFilter(logger, { NODE_ENV: 'production' });

  beforeEach(() => {
    sink.mockClear();
  });

  it('formats an unknown route without a stack trace', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status, headersSent: false, statusCode: 200 } as unknown as Response;

    filter.catch(
      new HttpException('Cannot GET /missing', 404),
      createHost(
        {
          method: 'GET',
          originalUrl: '/api/v1/missing',
          requestId: 'req-12345678',
          startedAt: process.hrtime.bigint(),
        },
        response,
      ),
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
      errors: [],
      requestId: 'req-12345678',
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('stack');
  });

  it('hides internal details in production', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status, headersSent: false } as unknown as Response;
    const exception = new Error('password=secret postgresql://user:secret@db/app');

    filter.catch(
      exception,
      createHost(
        { method: 'GET', originalUrl: '/api/v1/health', requestId: 'req-87654321' },
        response,
      ),
    );

    const body = json.mock.calls[0][0] as { message: string };
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(sink.mock.calls)).not.toContain('postgresql://');
  });

  it('maps unique constraint failures to a conflict without database details', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status, headersSent: false } as unknown as Response;
    const exception = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['email'] },
    });

    filter.catch(
      exception,
      createHost(
        { method: 'POST', originalUrl: '/api/v1/users', requestId: 'req-abcdef12' },
        response,
      ),
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, code: 'CONFLICT', errors: [] }),
    );
    expect(JSON.stringify(json.mock.calls)).not.toContain('email');
  });

  it('keeps field errors raised by application validation', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status, headersSent: false } as unknown as Response;

    filter.catch(
      new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
        { field: 'title', message: 'Required' },
      ]),
      createHost({ method: 'POST', originalUrl: '/probe', requestId: 'req-title-01' }, response),
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'title', message: 'Required' }],
      }),
    );
  });
});
