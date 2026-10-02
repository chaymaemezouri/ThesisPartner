import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ThrottlerException } from '@nestjs/throttler';
import type { ApiErrorBody, ApiErrorCode, ApiFieldError } from '@thesispartner/types';
import type { Request, Response } from 'express';
import { ENV, type Env } from '../../config/env';
import { StructuredLogger } from '../../infrastructure/logger/logger';
import { AppException } from '../errors/app.exception';
import { codeForStatus, messageForStatus } from '../errors/http-error';
import { durationMs, routeOf } from '../http/request-context';

type NormalizedError = {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  errors: ApiFieldError[];
};

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: StructuredLogger,
    @Inject(ENV) private readonly env: Pick<Env, 'NODE_ENV'>,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const normalized = this.normalize(exception);
    const requestId = request.requestId ?? 'unknown';

    const body: ApiErrorBody = {
      statusCode: normalized.statusCode,
      code: normalized.code,
      message: normalized.message,
      errors: normalized.errors,
      requestId,
    };

    this.logger.write({
      level: normalized.statusCode >= 500 ? 'error' : 'info',
      msg: 'request.failed',
      method: request.method,
      route: routeOf(request),
      status: normalized.statusCode,
      code: normalized.code,
      durationMs: durationMs(request.startedAt),
      requestId,
      errorName: exception instanceof Error ? exception.name : 'UnknownError',
      ...(this.env.NODE_ENV === 'development' &&
      normalized.statusCode >= 500 &&
      exception instanceof Error &&
      !(exception instanceof Prisma.PrismaClientKnownRequestError)
        ? { stack: exception.stack }
        : {}),
    });

    if (!response.headersSent) {
      response.status(normalized.statusCode).json(body);
    }
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.appCode,
        message: exception.message,
        errors: exception.errors,
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        errors: [],
      };
    }

    if (this.isPayloadError(exception)) {
      const status = exception.status === 413 ? 413 : 400;
      return {
        statusCode: status,
        code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
        message: status === 413 ? 'Payload too large' : 'Invalid JSON body',
        errors: [],
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002' || exception.code === 'P2003') {
        return { statusCode: 409, code: 'CONFLICT', message: 'Conflict', errors: [] };
      }
      if (exception.code === 'P2025') {
        return { statusCode: 404, code: 'NOT_FOUND', message: 'Resource not found', errors: [] };
      }
      return {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        errors: [],
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        code: codeForStatus(status),
        message: messageForStatus(status),
        errors: [],
      };
    }

    return {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      errors: [],
    };
  }

  private isPayloadError(exception: unknown): exception is SyntaxError & { status: number } {
    if (!(exception instanceof SyntaxError)) return false;
    if (!('status' in exception) || typeof exception.status !== 'number') return false;
    return exception.status === 400 || exception.status === 413;
  }
}
