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
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createObjectiveSchema,
  emptyBodySchema,
  objectiveListQuerySchema,
  requestChangesSchema,
  updateObjectiveSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { formatZodIssues } from '../common/validation/format-zod-issues';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { ObjectivesService } from './objectives.service';

@ApiTags('objectives')
@Controller({ path: 'theses/:thesisId/objectives', version: '1' })
export class ObjectivesController {
  constructor(private readonly objectives: ObjectivesService) {}

  @Get()
  @ApiOperation({ summary: 'List objectives of a thesis the caller belongs to' })
  list(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Query() query: Record<string, unknown>,
    @Req() request: Request,
  ) {
    const parsed = objectiveListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppException(
        400,
        'VALIDATION_ERROR',
        'Invalid request',
        formatZodIssues(parsed.error.issues),
      );
    }
    return this.objectives.list(actorId(request), thesisId, parsed.data);
  }

  @Post()
  @HttpCode(201)
  @ValidateBody(createObjectiveSchema)
  @ApiOperation({ summary: 'Create an objective as a supervisor of the thesis' })
  create(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.objectives.create(
      actorId(request),
      thesisId,
      createObjectiveSchema.parse(body),
      request.requestId,
    );
  }

  @Get(':objectiveId')
  @ApiOperation({ summary: 'Objective detail inside its thesis' })
  get(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Req() request: Request,
  ) {
    return this.objectives.get(actorId(request), thesisId, objectiveId);
  }

  @Patch(':objectiveId')
  @ValidateBody(updateObjectiveSchema)
  @ApiOperation({ summary: 'Update an objective as a supervisor of the thesis' })
  update(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.objectives.update(
      actorId(request),
      thesisId,
      objectiveId,
      updateObjectiveSchema.parse(body),
      request.requestId,
    );
  }

  @Delete(':objectiveId')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Delete an objective and its steps' })
  remove(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Req() request: Request,
  ) {
    return this.objectives.remove(actorId(request), thesisId, objectiveId, request.requestId);
  }

  @Post(':objectiveId/request-completion')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Ask a supervisor to validate a finished objective' })
  requestCompletion(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Req() request: Request,
  ) {
    return this.objectives.requestCompletion(
      actorId(request),
      thesisId,
      objectiveId,
      request.requestId,
    );
  }

  @Post(':objectiveId/approve-completion')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Approve an objective completion request' })
  approveCompletion(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Req() request: Request,
  ) {
    return this.objectives.approveCompletion(
      actorId(request),
      thesisId,
      objectiveId,
      request.requestId,
    );
  }

  @Post(':objectiveId/request-changes')
  @HttpCode(200)
  @ValidateBody(requestChangesSchema)
  @ApiOperation({ summary: 'Ask the doctoral student to continue the objective' })
  requestChanges(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('objectiveId', ParseUUIDPipe) objectiveId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.objectives.requestChanges(
      actorId(request),
      thesisId,
      objectiveId,
      requestChangesSchema.parse(body).message,
      request.requestId,
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
