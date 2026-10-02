import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { HealthResponse } from '@thesispartner/types';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { HealthService } from './health.service';

class HealthChecksDto {
  api!: 'ok';
  database!: 'ok' | 'error';
  redis!: 'ok' | 'error';
}

class HealthResponseDto {
  status!: 'ok' | 'degraded';
  checks!: HealthChecksDto;
}

@ApiTags('health')
@Public()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Service health' })
  @ApiOkResponse({ type: HealthResponseDto })
  async get(@Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    const body = await this.health.check();
    response.status(body.status === 'ok' ? 200 : 503);
    return body;
  }
}
