import { Module } from '@nestjs/common';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ThesisDocumentsController } from './thesis-documents.controller';
import { ThesisDocumentsService } from './thesis-documents.service';

@Module({
  imports: [ThesisAccessModule],
  controllers: [ResourcesController, ThesisDocumentsController],
  providers: [ResourcesService, ThesisDocumentsService],
})
export class ResourcesModule {}
