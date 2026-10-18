import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createStepTaskSchema,
  emptyBodySchema,
  reviewStepTaskSchema,
  stepTaskRemarkSchema,
  updateStepTaskSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { StepTasksService } from './step-tasks.service';

@ApiTags('step-tasks')
@Controller({
  path: 'theses/:thesisId/objectives/:objectiveId/tasks/:taskId',
  version: '1',
})
export class StepTasksController {
  constructor(private readonly work: StepTasksService) {}

  @Get('work')
  @ApiOperation({ summary: 'Tasks recorded under one objective step' })
  list(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() request: Request,
  ) {
    return this.work.list(actorId(request), thesisId, objectiveId, taskId);
  }

  @Post('work')
  @HttpCode(201)
  @ValidateBody(createStepTaskSchema)
  @ApiOperation({ summary: 'Add a task under an objective step' })
  create(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.work.create(
      actorId(request),
      thesisId,
      objectiveId,
      taskId,
      createStepTaskSchema.parse(body),
      request.requestId,
    );
  }

  @Patch('work/:stepTaskId')
  @ValidateBody(updateStepTaskSchema)
  @ApiOperation({ summary: 'Update a task that is still editable' })
  update(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepTaskId', ParseUUIDPipe) stepTaskId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.work.update(
      actorId(request),
      thesisId,
      objectiveId,
      taskId,
      stepTaskId,
      updateStepTaskSchema.parse(body),
      request.requestId,
    );
  }

  @Delete('work/:stepTaskId')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Delete a task that has not been submitted' })
  remove(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepTaskId', ParseUUIDPipe) stepTaskId: string,
    @Req() request: Request,
  ) {
    return this.work.remove(
      actorId(request),
      thesisId,
      objectiveId,
      taskId,
      stepTaskId,
      request.requestId,
    );
  }

  @Post('work/:stepTaskId/submit')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Submit a task and its deliverable for validation' })
  submit(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepTaskId', ParseUUIDPipe) stepTaskId: string,
    @Req() request: Request,
  ) {
    return this.work.submit(
      actorId(request),
      thesisId,
      objectiveId,
      taskId,
      stepTaskId,
      request.requestId,
    );
  }

  @Post('work/:stepTaskId/review')
  @HttpCode(200)
  @ValidateBody(reviewStepTaskSchema)
  @ApiOperation({ summary: 'Review a submitted task' })
  review(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepTaskId', ParseUUIDPipe) stepTaskId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.work.review(
      actorId(request),
      thesisId,
      objectiveId,
      taskId,
      stepTaskId,
      reviewStepTaskSchema.parse(body),
      request.requestId,
    );
  }

  @Post('work/:stepTaskId/remarks')
  @HttpCode(201)
  @ValidateBody(stepTaskRemarkSchema)
  @ApiOperation({ summary: 'Add a supervisor remark on a task' })
  remark(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepTaskId', ParseUUIDPipe) stepTaskId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.work.addRemark(
      actorId(request),
      thesisId,
      objectiveId,
      taskId,
      stepTaskId,
      stepTaskRemarkSchema.parse(body),
      request.requestId,
    );
  }

  @Delete('work/:stepTaskId/files/:versionId')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Remove one file from an editable task' })
  removeWorkFile(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepTaskId', ParseUUIDPipe) stepTaskId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Req() request: Request,
  ) {
    return this.work.deleteFile(
      actorId(request),
      thesisId,
      objectiveId,
      taskId,
      versionId,
      stepTaskId,
      request.requestId,
    );
  }

  @Delete('files/:versionId')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Remove one file attached to the step' })
  removeStepFile(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Req() request: Request,
  ) {
    return this.work.deleteFile(
      actorId(request),
      thesisId,
      objectiveId,
      taskId,
      versionId,
      null,
      request.requestId,
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
