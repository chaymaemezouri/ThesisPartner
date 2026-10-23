import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.auth;
    if (!auth) {
      throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    }
    if (auth.platformRole !== 'SUPER_ADMIN') {
      throw new AppException(403, 'FORBIDDEN', 'Super Admin access required');
    }
    return true;
  }
}
