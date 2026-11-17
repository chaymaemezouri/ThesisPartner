import { Module } from '@nestjs/common';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { SingleFileUploadInterceptor } from '../storage/upload.interceptor';
import { RemarksController } from './remarks.controller';
import { RemarksService } from './remarks.service';

@Module({
  imports: [ThesisAccessModule, CollaborationModule],
  controllers: [RemarksController],
  providers: [RemarksService, SingleFileUploadInterceptor],
})
export class RemarksModule {}
