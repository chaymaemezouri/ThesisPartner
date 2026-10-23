import { Module, forwardRef } from '@nestjs/common';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { ObjectivesModule } from '../objectives/objectives.module';
import { ThesesController } from './theses.controller';
import { ThesesService } from './theses.service';

@Module({
  imports: [ThesisAccessModule, ObjectivesModule, forwardRef(() => InvitationsModule)],
  controllers: [ThesesController],
  providers: [ThesesService],
})
export class ThesesModule {}
