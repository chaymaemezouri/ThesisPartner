import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { durationMs, routeOf } from '../http/request-context';
import { StructuredLogger } from '../../infrastructure/logger/logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        this.logger.write({
          level: 'info',
          msg: 'request.completed',
          method: request.method,
          route: routeOf(request),
          status: response.statusCode,
          durationMs: durationMs(request.startedAt),
          requestId: request.requestId ?? 'unknown',
        });
      }),
    );
  }
}
