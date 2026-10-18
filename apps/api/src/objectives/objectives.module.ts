import { Module } from '@nestjs/common';
import { ThesisAccessModule } from '../common/thesis-access/thesis-access.module';
import { ObjectiveProgressService } from './objective-progress.service';
import { ObjectivesController } from './objectives.controller';
import { ObjectivesService } from './objectives.service';
import { StandardPathService } from './standard-path.service';
import { StepTasksController } from './step-tasks.controller';
import { StepTasksService } from './step-tasks.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [ThesisAccessModule],
  controllers: [ObjectivesController, TasksController, StepTasksController],
  providers: [
    ObjectivesService,
    TasksService,
    StepTasksService,
    ObjectiveProgressService,
    StandardPathService,
  ],
  exports: [ObjectiveProgressService, StandardPathService],
})
export class ObjectivesModule {}
