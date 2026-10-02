import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV, type Env } from '../../config/env';
import { StructuredLogger } from '../logger/logger';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor(
    @Inject(ENV) env: Env,
    private readonly logger: StructuredLogger,
  ) {
    this.client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1500,
      retryStrategy: () => null,
    });
    this.client.on('error', () => {
      // Connection failures are reported by the health check.
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      if (this.client.status === 'wait') {
        await this.withTimeout(this.client.connect(), 2000);
      }
    } catch {
      this.logger.write({ level: 'error', msg: 'redis.connection_failed' });
      this.client.disconnect();
    }
  }

  async incrementWindow(key: string, ttlMs: number): Promise<number | null> {
    try {
      const count = await this.withTimeout(this.client.incr(key), 1500);
      if (count === 1) await this.withTimeout(this.client.pexpire(key, ttlMs), 1500);
      return count;
    } catch {
      return null;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.withTimeout(this.client.ping(), 1500);
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  private withTimeout<T>(action: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), ms);
      action.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
