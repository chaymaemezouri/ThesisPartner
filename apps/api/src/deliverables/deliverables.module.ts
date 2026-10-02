import { Module } from '@nestjs/common';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { DeliverableFilesService } from './deliverable-files.service';
import { DeliverableVersionsController } from './deliverable-versions.controller';
import { DeliverableVersionsService } from './deliverable-versions.service';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';
import { SingleFileUploadInterceptor } from '../storage/upload.interceptor';

@Module({
  imports: [ThesisAccessModule],
  controllers: [DeliverablesController, DeliverableVersionsController],
  providers: [
    DeliverablesService,
    DeliverableVersionsService,
    DeliverableFilesService,
    SingleFileUploadInterceptor,
  ],
})
export class DeliverablesModule {}

