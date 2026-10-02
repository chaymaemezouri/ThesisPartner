import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createRemarkReplySchema,
  createRemarkSchema,
  emptyBodySchema,
  remarkListQuerySchema,
  resolveRemarkSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { formatZodIssues } from '../common/validation/format-zod-issues';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { RemarksService } from './remarks.service';

@ApiTags('remarks')
@Controller({ path: 'theses/:thesisId/remarks', version: '1' })
export class RemarksController {
  constructor(private readonly remarks: RemarksService) {}

  @Get()
  @ApiOperation({ summary: 'List remarks of a thesis the caller belongs to' })
  list(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Query() query: Record<string, unknown>,
    @Req() request: Request,
  ) {
    const parsed = remarkListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppException(
        400,
        'VALIDATION_ERROR',
        'Invalid request',
        formatZodIssues(parsed.error.issues),
      );
    }
    return this.remarks.list(actorId(request), thesisId, parsed.data);
  }

  @Post()
  @HttpCode(201)
  @ValidateBody(createRemarkSchema)
  @ApiOperation({ summary: 'Create a remark as the thesis supervisor' })
  create(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.remarks.create(
      actorId(request),
      thesisId,
      createRemarkSchema.parse(body),
      request.requestId,
    );
  }

  @Get(':remarkId')
  @ApiOperation({ summary: 'Remark detail inside its thesis' })
  get(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('remarkId', ParseUUIDPipe) remarkId: string,
    @Req() request: Request,
  ) {
    return this.remarks.get(actorId(request), thesisId, remarkId);
  }

  @Post(':remarkId/replies')
  @HttpCode(201)
  @ValidateBody(createRemarkReplySchema)
  @ApiOperation({ summary: 'Add a reply to a remark' })
  reply(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('remarkId', ParseUUIDPipe) remarkId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.remarks.reply(
      actorId(request),
      thesisId,
      remarkId,
      createRemarkReplySchema.parse(body),
      request.requestId,
    );
  }

  @Post(':remarkId/resolve')
  @HttpCode(200)
  @ValidateBody(resolveRemarkSchema)
  @ApiOperation({ summary: 'Mark a remark as corrected by the doctoral student' })
  resolve(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('remarkId', ParseUUIDPipe) remarkId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.remarks.resolve(
      actorId(request),
      thesisId,
      remarkId,
      resolveRemarkSchema.parse(body),
      request.requestId,
    );
  }

  @Post(':remarkId/close')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Close a resolved remark as the supervisor' })
  close(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('remarkId', ParseUUIDPipe) remarkId: string,
    @Req() request: Request,
  ) {
    return this.remarks.close(actorId(request), thesisId, remarkId, request.requestId);
  }

  @Post(':remarkId/reopen')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Reopen a resolved or closed remark as the supervisor' })
  reopen(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('remarkId', ParseUUIDPipe) remarkId: string,
    @Req() request: Request,
  ) {
    return this.remarks.reopen(actorId(request), thesisId, remarkId, request.requestId);
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
