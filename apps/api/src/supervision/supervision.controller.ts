import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
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

  @Get(':thesisId')
  @ApiOperation({ summary: 'Doctoral workspace for a thesis this user supervises' })
  space(@Param('thesisId', ParseUUIDPipe) thesisId: string, @Req() request: Request) {
    if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    return this.supervision.space(request.auth.userId, thesisId);
  }
}
