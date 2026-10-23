import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [AuthModule, ThesisAccessModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
