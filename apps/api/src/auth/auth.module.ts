import { Module } from '@nestjs/common';
import { SecurityModule } from '../common/security/security.module';
import { AuthMailer } from './auth-mailer';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginAttemptTracker } from './login-attempts';
import { SessionService } from './session.service';

@Module({
  imports: [SecurityModule],
  controllers: [AuthController],
  providers: [AuthService, SessionService, AuthMailer, LoginAttemptTracker],
  exports: [SessionService, AuthMailer],
})
export class AuthModule {}
