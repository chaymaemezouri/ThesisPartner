import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { academicProfileSchema, fileDownloadSchema, updateProfileSchema } from '@thesispartner/validation';
import { unlink } from 'node:fs/promises';
import type { Request, Response } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { SingleFileUploadInterceptor } from '../storage/upload.interceptor';
import { ProfileFilesService } from './profile-files.service';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@Controller({ path: 'profile', version: '1' })
export class ProfileController {
  constructor(
    private readonly profiles: ProfileService,
    private readonly files: ProfileFilesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Academic profile of the current account' })
  async get(@Req() request: Request) {
    return academicProfileSchema.parse(await this.profiles.get(actorId(request)));
  }

  @Patch()
  @ValidateBody(updateProfileSchema)
  @ApiOperation({ summary: 'Update the current academic profile' })
  async update(@Body() body: unknown, @Req() request: Request) {
    return academicProfileSchema.parse(
      await this.profiles.update(
        actorId(request),
        updateProfileSchema.parse(body),
        request.requestId,
      ),
    );
  }

  @Post('avatar')
  @HttpCode(201)
  @UseInterceptors(SingleFileUploadInterceptor)
  @ApiOperation({ summary: 'Upload profile photo (JPG, PNG, WebP)' })
  async uploadAvatar(@Req() request: Request) {
    const uploaded = request.file;
    try {
      return academicProfileSchema.parse(
        await this.files.uploadAvatar(
          actorId(request),
          uploaded
            ? {
                path: uploaded.path,
                originalName: uploaded.originalname,
                declaredMime: uploaded.mimetype,
              }
            : undefined,
          request.requestId,
        ),
      );
    } finally {
      if (uploaded?.path) await unlink(uploaded.path).catch(() => undefined);
    }
  }

  @Post('cv')
  @HttpCode(201)
  @UseInterceptors(SingleFileUploadInterceptor)
  @ApiOperation({ summary: 'Upload CV (PDF)' })
  async uploadCv(@Req() request: Request) {
    const uploaded = request.file;
    try {
      return academicProfileSchema.parse(
        await this.files.uploadCv(
          actorId(request),
          uploaded
            ? {
                path: uploaded.path,
                originalName: uploaded.originalname,
                declaredMime: uploaded.mimetype,
              }
            : undefined,
          request.requestId,
        ),
      );
    } finally {
      if (uploaded?.path) await unlink(uploaded.path).catch(() => undefined);
    }
  }

  @Get('avatar')
  @ApiOperation({ summary: 'Redirect to a signed URL for the current avatar' })
  async avatar(@Req() request: Request, @Res() response: Response) {
    const signed = await this.files.avatarDownload(actorId(request), actorId(request));
    response.redirect(302, signed.url);
  }

  @Get('cv/download')
  @ApiOperation({ summary: 'Issue a short-lived download URL for the CV' })
  async cvDownload(@Req() request: Request) {
    const signed = await this.files.cvDownload(actorId(request));
    return fileDownloadSchema.parse({
      url: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
    });
  }
}

@ApiTags('profile')
@Controller({ path: 'users', version: '1' })
export class UserAvatarController {
  constructor(private readonly files: ProfileFilesService) {}

  @Get(':userId/avatar')
  @ApiOperation({ summary: 'Redirect to a signed URL for a user avatar' })
  async avatar(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    actorId(request);
    const signed = await this.files.avatarDownload(actorId(request), userId);
    response.redirect(302, signed.url);
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
