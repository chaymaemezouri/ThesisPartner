import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@thesispartner/types';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { S3ObjectStorage } from '../storage/s3-object-storage';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: S3ObjectStorage,
  ) {}

  async check(): Promise<HealthResponse> {
    const [database, redis, storage] = await Promise.all([
      this.prisma.ping(),
      this.redis.ping(),
      this.storage.ping(),
    ]);
    const allOk = database && redis && storage;
    return {
      status: allOk ? 'ok' : 'degraded',
      checks: {
        api: 'ok',
        database: database ? 'ok' : 'error',
        redis: redis ? 'ok' : 'error',
        storage: storage ? 'ok' : 'error',
      },
    };
  }
}
