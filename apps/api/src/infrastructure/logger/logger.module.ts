import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env';
import { StructuredLogger } from './logger';

@Global()
@Module({
  providers: [
    {
      provide: StructuredLogger,
      inject: [ENV],
      useFactory: (env: Env) => new StructuredLogger(env.LOG_LEVEL),
    },
  ],
  exports: [StructuredLogger],
})
export class LoggerModule {}
