import { Module } from '@nestjs/common';
import { SupervisionController } from './supervision.controller';
import { SupervisionDeskController } from './supervision-desk.controller';
import { SupervisionDeskService } from './supervision-desk.service';
import { SupervisionService } from './supervision.service';

@Module({
  controllers: [SupervisionDeskController, SupervisionController],
  providers: [SupervisionService, SupervisionDeskService],
})
export class SupervisionModule {}
