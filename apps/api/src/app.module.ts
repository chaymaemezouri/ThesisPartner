import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SecurityModule } from './common/security/security.module';
import { ThesisAccessModule } from './common/thesis-access/thesis-access.module';
import { ZodBodyInterceptor } from './common/validation/zod-body.interceptor';
import { AppConfigModule } from './config/config.module';
import { ENV, type Env } from './config/env';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './auth/csrf.guard';
import { FallbackModule } from './auth/fallback.module';
import { SessionAuthGuard } from './auth/session-auth.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { ObjectivesModule } from './objectives/objectives.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { MeetingsModule } from './meetings/meetings.module';
import { MessagesModule } from './messages/messages.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { RemarksModule } from './remarks/remarks.module';
import { ResourcesModule } from './resources/resources.module';
import { SupervisionModule } from './supervision/supervision.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { ThesesModule } from './theses/theses.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    PrismaModule,
    RedisModule,
    StorageModule,
    SecurityModule,
    AuditModule,
    AuthModule,
    ThesisAccessModule,
    ThesesModule,
    ProfileModule,
    DashboardModule,
    ObjectivesModule,
    DeliverablesModule,
    RemarksModule,
    ResourcesModule,
    MeetingsModule,
    MessagesModule,
    PortfolioModule,
    SupervisionModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => [
        {
          ttl: env.RATE_LIMIT_TTL_MS,
          limit: env.RATE_LIMIT_MAX,
        },
      ],
    }),
    HealthModule,
    FallbackModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ZodBodyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
