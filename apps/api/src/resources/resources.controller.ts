import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { sharedResourceInputSchema } from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { ResourcesService } from './resources.service';

@ApiTags('resources')
@Controller({ path: 'resources', version: '1' })
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Courses, articles and documents shared by a supervisor' })
  list(@Req() request: Request) {
    return this.resources.list(actorId(request));
  }

  @Post()
  @HttpCode(200)
  @ValidateBody(sharedResourceInputSchema)
  @ApiOperation({ summary: 'Share a course, an article or a document' })
  create(@Body() body: unknown, @Req() request: Request) {
    return this.resources.create(
      actorId(request),
      sharedResourceInputSchema.parse(body),
      request.requestId,
    );
  }

  @Post(':resourceId')
  @HttpCode(200)
  @ValidateBody(sharedResourceInputSchema)
  @ApiOperation({ summary: 'Update a shared course, article or document' })
  update(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.resources.update(
      actorId(request),
      resourceId,
      sharedResourceInputSchema.parse(body),
      request.requestId,
    );
  }

  @Post(':resourceId/remove')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a shared course, article or document' })
  remove(@Param('resourceId', ParseUUIDPipe) resourceId: string, @Req() request: Request) {
    return this.resources.remove(actorId(request), resourceId, request.requestId);
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
