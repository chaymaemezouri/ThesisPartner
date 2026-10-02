import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SESSION_COOKIE_NAME } from '@thesispartner/types';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { IS_PUBLIC } from './public.decorator';
import { SessionService } from './session.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    try {
      request.auth = (await this.sessions.authenticate(token)) ?? undefined;
    } catch (error) {
      if (!isPublic) throw error;
      request.auth = undefined;
    }

    if (!isPublic && !request.auth) {
      throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    }
    return true;
  }
}
