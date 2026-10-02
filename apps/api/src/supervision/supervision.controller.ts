import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { SupervisionService } from './supervision.service';

@ApiTags('supervision')
@Controller({ path: 'supervision/theses', version: '1' })
export class SupervisionController {
  constructor(private readonly supervision: SupervisionService) {}

  @Get()
  @ApiOperation({ summary: 'Theses the current user supervises' })
  list(@Req() request: Request) {
    if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    return this.supervision.list(request.auth.userId);
  }
}
