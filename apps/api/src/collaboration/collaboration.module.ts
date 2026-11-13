import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CollaborationNotice } from './collaboration-notice.service';

@Module({
  imports: [AuthModule],
  providers: [CollaborationNotice],
  exports: [CollaborationNotice],
})
export class CollaborationModule {}
