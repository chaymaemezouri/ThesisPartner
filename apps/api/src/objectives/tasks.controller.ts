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
  createTaskSchema,
  emptyBodySchema,
  reorderTasksSchema,
  updateTaskSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller({ path: 'theses/:thesisId/objectives/:objectiveId/tasks', version: '1' })
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks of an objective' })
  list(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Req() request: Request,
  ) {
    return this.tasks.list(actorId(request), thesisId, objectiveId);
  }

  @Post()
  @HttpCode(201)
  @ValidateBody(createTaskSchema)
  @ApiOperation({ summary: 'Create a task as a supervisor of the thesis' })
  create(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.tasks.create(
      actorId(request),
      thesisId,
      objectiveId,
      createTaskSchema.parse(body),
      request.requestId,
    );
  }

  @Patch('reorder')
  @ValidateBody(reorderTasksSchema)
  @ApiOperation({ summary: 'Reorder every task of an objective' })
  reorder(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.tasks.reorder(
      actorId(request),
      thesisId,
      objectiveId,
      reorderTasksSchema.parse(body),
      request.requestId,
    );
  }

  @Delete(':taskId')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Delete a step of an objective' })
  remove(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() request: Request,
  ) {
    return this.tasks.remove(actorId(request), thesisId, objectiveId, taskId, request.requestId);
  }

  @Patch(':taskId')
  @ValidateBody(updateTaskSchema)
  @ApiOperation({ summary: 'Update a task inside its objective' })
  update(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.tasks.update(
      actorId(request),
      thesisId,
      objectiveId,
      taskId,
      updateTaskSchema.parse(body),
      request.requestId,
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
