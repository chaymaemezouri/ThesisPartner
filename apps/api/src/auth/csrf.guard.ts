import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@thesispartner/types';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { safeEqual, tokenMatchesHash } from '../common/security/opaque-token';
import { IS_PUBLIC } from './public.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || !request.auth) return true;

    const header = request.header(CSRF_HEADER_NAME);
    const cookie = request.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    if (
      !header ||
      !cookie ||
      !safeEqual(header, cookie) ||
      !tokenMatchesHash(header, request.auth.csrfSecretHash)
    ) {
      throw new AppException(403, 'FORBIDDEN', 'CSRF token missing or invalid');
    }
    return true;
  }
}
