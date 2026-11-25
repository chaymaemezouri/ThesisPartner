import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { SecurityModule } from '../common/security/security.module';
import { MasterProjectsService } from '../master/master-projects.service';
import { AuthMailer } from './auth-mailer';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginAttemptTracker } from './login-attempts';
import { SessionService } from './session.service';

@Module({
  imports: [SecurityModule, forwardRef(() => BillingModule)],
  controllers: [AuthController],
  providers: [AuthService, SessionService, AuthMailer, LoginAttemptTracker, MasterProjectsService],
  exports: [SessionService, AuthMailer, MasterProjectsService],
})
export class AuthModule {}
