import { Module } from '@nestjs/common';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { SupervisionController } from './supervision.controller';
import { SupervisionDeskController } from './supervision-desk.controller';
import { SupervisionDeskService } from './supervision-desk.service';
import { SupervisionService } from './supervision.service';

@Module({
  imports: [ThesisAccessModule],
  controllers: [SupervisionDeskController, SupervisionController],
  providers: [SupervisionService, SupervisionDeskService],
})
export class SupervisionModule {}
