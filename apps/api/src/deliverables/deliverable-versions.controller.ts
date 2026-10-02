import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createDeliverableVersionSchema } from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { DeliverableFilesService } from './deliverable-files.service';
import { DeliverableVersionsService } from './deliverable-versions.service';
import { SingleFileUploadInterceptor } from '../storage/upload.interceptor';

@ApiTags('deliverables')
@Controller({
  path: 'theses/:thesisId/deliverables/:deliverableId/versions',
  version: '1',
})
export class DeliverableVersionsController {
  constructor(
    private readonly versions: DeliverableVersionsService,
    private readonly files: DeliverableFilesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List deliverable versions, newest number first' })
  list(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Req() request: Request,
  ) {
    return this.versions.list(actorId(request), thesisId, deliverableId);
  }

  @Post()
  @HttpCode(201)
  @ValidateBody(createDeliverableVersionSchema)
  @ApiOperation({ summary: 'Append a version. The server assigns the version number.' })
  create(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.versions.create(
      actorId(request),
      thesisId,
      deliverableId,
      createDeliverableVersionSchema.parse(body),
      request.requestId,
    );
  }

  @Get(':versionId')
  @ApiOperation({ summary: 'One version inside its deliverable and thesis' })
  get(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Req() request: Request,
  ) {
    return this.versions.get(actorId(request), thesisId, deliverableId, versionId);
  }

  @Post(':versionId/file')
  @HttpCode(201)
  @UseInterceptors(SingleFileUploadInterceptor)
  @ApiOperation({ summary: 'Attach the single principal file of a version' })
  async upload(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Req() request: Request,
  ) {
    const uploaded = request.file;
    try {
      return await this.files.upload(
        actorId(request),
        thesisId,
        deliverableId,
        versionId,
        uploaded
          ? {
              path: uploaded.path,
              originalName: uploaded.originalname,
              declaredMime: uploaded.mimetype,
            }
          : undefined,
        request.requestId,
      );
    } finally {
      if (uploaded?.path) await unlink(uploaded.path).catch(() => undefined);
    }
  }

  @Get(':versionId/file/download')
  @ApiOperation({ summary: 'Issue a short-lived download URL for a version file' })
  download(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Req() request: Request,
  ) {
    return this.files.download(actorId(request), thesisId, deliverableId, versionId);
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
