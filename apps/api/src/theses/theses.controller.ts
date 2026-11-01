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
  createThesisSchema,
  emptyBodySchema,
  inviteMemberSchema,
  updateThesisSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { ThesesService } from './theses.service';

@ApiTags('theses')
@Controller({ path: 'theses', version: '1' })
export class ThesesController {
  constructor(private readonly theses: ThesesService) {}

  @Get()
  @ApiOperation({ summary: 'Theses visible to the current account' })
  list(@Req() request: Request) {
    return this.theses.list(actorId(request));
  }

  @Post()
  @HttpCode(201)
  @ValidateBody(createThesisSchema)
  @ApiOperation({ summary: 'Create a thesis as its doctoral student' })
  create(
    @Body() body: unknown,
    @Query('locale') locale: string | undefined,
    @Req() request: Request,
  ) {
    return this.theses.create(
      actorId(request),
      createThesisSchema.parse(body),
      request.requestId,
      locale,
    );
  }

  @Get(':thesisId')
  @ApiOperation({ summary: 'Thesis detail for a member' })
  get(@Param('thesisId', ParseUUIDPipe) thesisId: string, @Req() request: Request) {
    return this.theses.get(actorId(request), thesisId);
  }

  @Delete(':thesisId')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Delete a thesis owned by the doctoral student' })
  remove(@Param('thesisId', ParseUUIDPipe) thesisId: string, @Req() request: Request) {
    return this.theses.remove(actorId(request), thesisId, request.requestId);
  }

  @Patch(':thesisId')
  @ValidateBody(updateThesisSchema)
  @ApiOperation({ summary: 'Update thesis description fields' })
  update(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.theses.update(
      actorId(request),
      thesisId,
      updateThesisSchema.parse(body),
      request.requestId,
    );
  }

  @Get(':thesisId/standard-path')
  @ApiOperation({ summary: 'Whether the standard doctoral path is already on this thesis' })
  standardPathState(@Param('thesisId', ParseUUIDPipe) thesisId: string, @Req() request: Request) {
    return this.theses.standardPathState(actorId(request), thesisId);
  }

  @Post(':thesisId/standard-path')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Copy any missing standard objectives onto this thesis' })
  applyStandardPath(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Query('locale') locale: string | undefined,
    @Body() _body: unknown,
    @Req() request: Request,
  ) {
    return this.theses.applyStandardPath(actorId(request), thesisId, locale);
  }

  @Post(':thesisId/standard-path/localize')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Translate standard objectives to the UI language' })
  localizeStandardPath(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Query('locale') locale: string | undefined,
    @Body() _body: unknown,
    @Req() request: Request,
  ) {
    return this.theses.localizeStandardPath(actorId(request), thesisId, locale);
  }

  @Post(':thesisId/members')
  @HttpCode(201)
  @ValidateBody(inviteMemberSchema)
  @ApiOperation({
    summary: 'Create a pending invitation by email (membership only after accept)',
  })
  invite(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.theses.invite(
      actorId(request),
      thesisId,
      inviteMemberSchema.parse(body),
      request.requestId,
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) {
    throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return request.auth.userId;
}
