import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { ObjectivesModule } from '../objectives/objectives.module';
import { ThesesController } from './theses.controller';
import { ThesesService } from './theses.service';

@Module({
  imports: [ThesisAccessModule, ObjectivesModule, AuthModule, forwardRef(() => InvitationsModule)],
  controllers: [ThesesController],
  providers: [ThesesService],
})
export class ThesesModule {}
