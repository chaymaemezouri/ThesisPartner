import {
  Body,
  Controller,
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
  createDeliverableSchema,
  deliverableListQuerySchema,
  emptyBodySchema,
  requestChangesSchema,
  updateDeliverableSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { formatZodIssues } from '../common/validation/format-zod-issues';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { DeliverablesService } from './deliverables.service';

@ApiTags('deliverables')
@Controller({ path: 'theses/:thesisId/deliverables', version: '1' })
export class DeliverablesController {
  constructor(private readonly deliverables: DeliverablesService) {}

  @Get()
  @ApiOperation({ summary: 'List deliverables of a thesis the caller belongs to' })
  list(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Query() query: Record<string, unknown>,
    @Req() request: Request,
  ) {
    const parsed = deliverableListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppException(
        400,
        'VALIDATION_ERROR',
        'Invalid request',
        formatZodIssues(parsed.error.issues),
      );
    }
    return this.deliverables.list(actorId(request), thesisId, parsed.data);
  }

  @Post()
  @HttpCode(201)
  @ValidateBody(createDeliverableSchema)
  @ApiOperation({ summary: 'Create a draft deliverable as a doctoral student of the thesis' })
  create(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.deliverables.create(
      actorId(request),
      thesisId,
      createDeliverableSchema.parse(body),
      request.requestId,
    );
  }

  @Get(':deliverableId')
  @ApiOperation({ summary: 'Deliverable detail inside its thesis' })
  get(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Req() request: Request,
  ) {
    return this.deliverables.get(actorId(request), thesisId, deliverableId);
  }

  @Patch(':deliverableId')
  @ValidateBody(updateDeliverableSchema)
  @ApiOperation({ summary: 'Update or cancel a draft deliverable' })
  update(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.deliverables.update(
      actorId(request),
      thesisId,
      deliverableId,
      updateDeliverableSchema.parse(body),
      request.requestId,
    );
  }

  @Post(':deliverableId/submit')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Submit a draft or corrected deliverable for supervisor review' })
  submit(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Req() request: Request,
  ) {
    return this.deliverables.submit(
      actorId(request),
      thesisId,
      deliverableId,
      request.requestId,
    );
  }

  @Post(':deliverableId/request-changes')
  @HttpCode(200)
  @ValidateBody(requestChangesSchema)
  @ApiOperation({ summary: 'Ask the doctoral student to revise a submitted deliverable' })
  requestChanges(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.deliverables.requestChanges(
      actorId(request),
      thesisId,
      deliverableId,
      requestChangesSchema.parse(body).message,
      request.requestId,
    );
  }

  @Post(':deliverableId/approve')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Validate a submitted deliverable' })
  approve(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Req() request: Request,
  ) {
    return this.deliverables.approve(
      actorId(request),
      thesisId,
      deliverableId,
      request.requestId,
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
