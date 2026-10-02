import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StructuredLogger } from '../logger/logger';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: StructuredLogger) {
    super({ log: [] });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch {
      this.logger.write({ level: 'error', msg: 'database.connection_failed' });
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
