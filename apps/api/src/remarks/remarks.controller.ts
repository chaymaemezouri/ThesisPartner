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
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createRemarkReplySchema,
  createRemarkSchema,
  emptyBodySchema,
  remarkListQuerySchema,
  resolveRemarkSchema,
} from '@thesispartner/validation';
import type { Request, Response } from 'express';
import { AppException } from '../common/errors/app.exception';
import { formatZodIssues } from '../common/validation/format-zod-issues';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { SingleFileUploadInterceptor } from '../storage/upload.interceptor';
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

  @Post('voice')
  @HttpCode(201)
  @UseInterceptors(SingleFileUploadInterceptor)
  @ApiOperation({ summary: 'Create a remark with a voice recording' })
  async createVoice(@Param('thesisId', ParseUUIDPipe) thesisId: string, @Req() request: Request) {
    const uploaded = request.file;
    try {
      return await this.remarks.createVoice(
        actorId(request),
        thesisId,
        uploadedFile(uploaded),
        formFields(request),
        request.requestId,
      );
    } finally {
      if (uploaded?.path) await unlink(uploaded.path).catch(() => undefined);
    }
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

  @Get(':remarkId/audio')
  @ApiOperation({ summary: 'Stream the voice recording of a remark' })
  async remarkAudio(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('remarkId', ParseUUIDPipe) remarkId: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const file = await this.remarks.openRemarkAudio(actorId(request), thesisId, remarkId);
    pipeAudio(response, file);
  }

  @Get(':remarkId/replies/:replyId/audio')
  @ApiOperation({ summary: 'Stream the voice recording of a remark reply' })
  async replyAudio(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('remarkId', ParseUUIDPipe) remarkId: string,
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const file = await this.remarks.openReplyAudio(actorId(request), thesisId, remarkId, replyId);
    pipeAudio(response, file);
  }

  @Post(':remarkId/replies/voice')
  @HttpCode(201)
  @UseInterceptors(SingleFileUploadInterceptor)
  @ApiOperation({ summary: 'Reply to a remark with a voice recording' })
  async replyVoice(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('remarkId', ParseUUIDPipe) remarkId: string,
    @Req() request: Request,
  ) {
    const uploaded = request.file;
    const fields = formFields(request);
    try {
      return await this.remarks.replyVoice(
        actorId(request),
        thesisId,
        remarkId,
        uploadedFile(uploaded),
        { message: fields.message, durationMs: fields.durationMs },
        request.requestId,
      );
    } finally {
      if (uploaded?.path) await unlink(uploaded.path).catch(() => undefined);
    }
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

function uploadedFile(file: Express.Multer.File | undefined) {
  return file
    ? { path: file.path, originalName: file.originalname, declaredMime: file.mimetype }
    : undefined;
}

function formFields(request: Request): {
  title: string;
  message: string;
  location?: string;
  objectiveId?: string | null;
  taskId?: string | null;
  deliverableId?: string | null;
  deliverableVersionId?: string | null;
  durationMs?: number;
} {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const read = (key: string) => {
    const value = (body as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : '';
  };
  const optionalId = (key: string) => {
    const value = read(key).trim();
    return value.length > 0 ? value : null;
  };
  const duration = Number(read('durationMs'));
  return {
    title: read('title'),
    message: read('message'),
    location: read('location') || undefined,
    objectiveId: optionalId('objectiveId'),
    taskId: optionalId('taskId'),
    deliverableId: optionalId('deliverableId'),
    deliverableVersionId: optionalId('deliverableVersionId'),
    durationMs: Number.isFinite(duration) ? duration : undefined,
  };
}

function pipeAudio(
  response: Response,
  file: { body: NodeJS.ReadableStream; contentType: string; contentLength?: number | null },
) {
  response.setHeader('Content-Type', file.contentType);
  response.setHeader('Cache-Control', 'private, no-store');
  if (file.contentLength != null) {
    response.setHeader('Content-Length', String(file.contentLength));
  }
  file.body.on('error', () => {
    if (!response.headersSent) response.status(503).end();
    else response.destroy();
  });
  file.body.pipe(response);
}
