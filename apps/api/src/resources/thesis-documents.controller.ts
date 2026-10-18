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
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  documentReviewSchema,
  documentSynthesisSchema,
  thesisDocumentInputSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { SingleFileUploadInterceptor } from '../storage/upload.interceptor';
import { ThesisDocumentsService } from './thesis-documents.service';

@ApiTags('documents')
@Controller({ path: 'theses/:thesisId/documents', version: '1' })
export class ThesisDocumentsController {
  constructor(private readonly documents: ThesisDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Documents recommended for a thesis, with reading and synthesis' })
  list(@Param('thesisId', ParseUUIDPipe) thesisId: string, @Req() request: Request) {
    return this.documents.list(actorId(request), thesisId);
  }

  @Post()
  @HttpCode(200)
  @ValidateBody(thesisDocumentInputSchema)
  @ApiOperation({ summary: 'Recommend a document for a thesis' })
  create(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.documents.create(
      actorId(request),
      thesisId,
      thesisDocumentInputSchema.parse(body),
      request.requestId,
    );
  }

  @Patch(':documentId')
  @ValidateBody(thesisDocumentInputSchema)
  @ApiOperation({ summary: 'Update a recommended document' })
  update(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.documents.update(
      actorId(request),
      thesisId,
      documentId,
      thesisDocumentInputSchema.parse(body),
      request.requestId,
    );
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Remove a recommended document' })
  remove(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() request: Request,
  ) {
    return this.documents.remove(actorId(request), thesisId, documentId, request.requestId);
  }

  @Post(':documentId/file')
  @HttpCode(200)
  @UseInterceptors(SingleFileUploadInterceptor)
  @ApiOperation({ summary: 'Attach or replace the file of a recommended document' })
  upload(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() request: Request,
  ) {
    const uploaded = request.file;
    return this.documents.attachFile(
      actorId(request),
      thesisId,
      documentId,
      uploaded
        ? { path: uploaded.path, originalName: uploaded.originalname, declaredMime: uploaded.mimetype }
        : undefined,
      request.requestId,
    );
  }

  @Delete(':documentId/file')
  @ApiOperation({ summary: 'Remove the file of a recommended document' })
  removeFile(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() request: Request,
  ) {
    return this.documents.removeFile(actorId(request), thesisId, documentId, request.requestId);
  }

  @Get(':documentId/file')
  @ApiOperation({ summary: 'Open or download a recommended document when access allows it' })
  download(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query('inline') inline: string | undefined,
    @Req() request: Request,
  ) {
    return this.documents.download(actorId(request), thesisId, documentId, inline === '1');
  }

  @Post(':documentId/consult')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record that the doctoral student opened the document' })
  consult(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() request: Request,
  ) {
    return this.documents.consult(actorId(request), thesisId, documentId);
  }

  @Post(':documentId/synthesis')
  @HttpCode(200)
  @ValidateBody(documentSynthesisSchema)
  @ApiOperation({ summary: 'Save or submit the doctoral student synthesis' })
  synthesis(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.documents.saveSynthesis(
      actorId(request),
      thesisId,
      documentId,
      documentSynthesisSchema.parse(body),
      request.requestId,
    );
  }

  @Post(':documentId/review')
  @HttpCode(200)
  @ValidateBody(documentReviewSchema)
  @ApiOperation({ summary: 'Validate a synthesis or request complements' })
  review(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.documents.review(
      actorId(request),
      thesisId,
      documentId,
      documentReviewSchema.parse(body),
      request.requestId,
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
