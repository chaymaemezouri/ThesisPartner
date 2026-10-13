import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { MeetingNotice } from './meeting-notice';
import { MeetingReminder } from './meeting-reminder';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [ThesisAccessModule, AuthModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingNotice, MeetingReminder],
})
export class MeetingsModule {}
