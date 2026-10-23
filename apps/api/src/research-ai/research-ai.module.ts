import { Module } from '@nestjs/common';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { ResearchAiController } from './research-ai.controller';
import { ResearchAiService } from './research-ai.service';

@Module({
  imports: [ThesisAccessModule],
  controllers: [ResearchAiController],
  providers: [ResearchAiService],
})
export class ResearchAiModule {}
