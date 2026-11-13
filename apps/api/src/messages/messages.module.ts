import { Module } from '@nestjs/common';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { SingleFileUploadInterceptor } from '../storage/upload.interceptor';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [CollaborationModule],
  controllers: [MessagesController],
  providers: [MessagesService, SingleFileUploadInterceptor],
})
export class MessagesModule {}
