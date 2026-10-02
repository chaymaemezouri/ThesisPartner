import { Module } from '@nestjs/common';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { RemarksController } from './remarks.controller';
import { RemarksService } from './remarks.service';

@Module({
  imports: [ThesisAccessModule],
  controllers: [RemarksController],
  providers: [RemarksService],
})
export class RemarksModule {}
