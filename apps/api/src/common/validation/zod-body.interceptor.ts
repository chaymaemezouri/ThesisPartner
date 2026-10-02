import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import type { ZodType } from 'zod';
import { AppException } from '../errors/app.exception';
import { formatZodIssues } from './format-zod-issues';
import { collectUnsafeJson } from './sanitize';

export const ZOD_BODY_SCHEMA = 'tp_zod_body_schema';

export const ValidateBody = (schema: ZodType) => SetMetadata(ZOD_BODY_SCHEMA, schema);

@Injectable()
export class ZodBodyInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    if (request.body !== undefined && request.body !== null) {
      const unsafe = collectUnsafeJson(request.body);
      if (unsafe.length > 0) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Invalid request', [
          { field: 'body', message: 'Payload contains unsupported keys or is too deep' },
        ]);
      }
    }

    const schema = this.reflector.get<ZodType | undefined>(ZOD_BODY_SCHEMA, context.getHandler());
    if (!schema) return next.handle();

    const parsed = schema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new AppException(
        400,
        'VALIDATION_ERROR',
        'Invalid request',
        formatZodIssues(parsed.error.issues),
      );
    }

    request.body = parsed.data;
    return next.handle();
  }
}
