import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@thesispartner/types';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([this.prisma.ping(), this.redis.ping()]);
    return {
      status: database && redis ? 'ok' : 'degraded',
      checks: {
        api: 'ok',
        database: database ? 'ok' : 'error',
        redis: redis ? 'ok' : 'error',
      },
    };
  }
}
