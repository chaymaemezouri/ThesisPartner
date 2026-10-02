import { Module } from '@nestjs/common';
import { SingleFileUploadInterceptor } from '../storage/upload.interceptor';
import { ProfileController, UserAvatarController } from './profile.controller';
import { ProfileFilesService } from './profile-files.service';
import { ProfileService } from './profile.service';

@Module({
  controllers: [ProfileController, UserAvatarController],
  providers: [ProfileService, ProfileFilesService, SingleFileUploadInterceptor],
  exports: [ProfileService],
})
export class ProfileModule {}
