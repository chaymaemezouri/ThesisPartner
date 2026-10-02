import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Doctoral workspace overview' })
  get(@Req() request: Request) {
    if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    return this.dashboard.get(request.auth.userId);
  }
}
