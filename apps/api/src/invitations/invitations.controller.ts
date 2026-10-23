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
  emptyBodySchema,
  invitationListSchema,
  invitationPreviewSchema,
  invitationSummarySchema,
  invitationTokenBodySchema,
  inviteMemberSchema,
  inviteResponseSchema,
  supervisorChangeBodySchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { Public } from '../auth/public.decorator';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@Controller({ version: '1' })
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get('invitations/inbox')
  @ApiOperation({ summary: 'Invitations addressed to the current account email' })
  async inbox(@Req() request: Request) {
    return invitationListSchema.parse(await this.invitations.inbox(actorId(request)));
  }

  @Public()
  @Get('invitations/preview')
  @ApiOperation({ summary: 'Public preview of an invitation by opaque token' })
  async preview(@Query('token') token: string | undefined) {
    return invitationPreviewSchema.parse(await this.invitations.previewByToken(token ?? ''));
  }

  @Post('invitations/accept')
  @HttpCode(200)
  @ValidateBody(invitationTokenBodySchema)
  @ApiOperation({ summary: 'Accept an invitation (authenticated invitee email)' })
  async accept(@Body() body: unknown, @Req() request: Request) {
    const parsed = invitationTokenBodySchema.parse(body);
    return invitationSummarySchema.parse(
      await this.invitations.accept(actorId(request), parsed.token, request.requestId),
    );
  }

  @Post('invitations/reject')
  @HttpCode(200)
  @ValidateBody(invitationTokenBodySchema)
  @ApiOperation({ summary: 'Reject an invitation (authenticated invitee email)' })
  async reject(@Body() body: unknown, @Req() request: Request) {
    const parsed = invitationTokenBodySchema.parse(body);
    return invitationSummarySchema.parse(
      await this.invitations.reject(actorId(request), parsed.token, request.requestId),
    );
  }

  @Post('invitations/:invitationId/accept')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Accept a pending invitation from the inbox' })
  async acceptById(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() request: Request,
  ) {
    return invitationSummarySchema.parse(
      await this.invitations.acceptById(actorId(request), invitationId, request.requestId),
    );
  }

  @Post('invitations/:invitationId/reject')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Reject a pending invitation from the inbox' })
  async rejectById(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() request: Request,
  ) {
    return invitationSummarySchema.parse(
      await this.invitations.rejectById(actorId(request), invitationId, request.requestId),
    );
  }

  @Get('theses/:thesisId/invitations')
  @ApiOperation({ summary: 'List invitations for a thesis' })
  async listForThesis(@Param('thesisId', ParseUUIDPipe) thesisId: string, @Req() request: Request) {
    return invitationListSchema.parse(
      await this.invitations.listForThesis(actorId(request), thesisId),
    );
  }

  @Post('theses/:thesisId/invitations')
  @HttpCode(201)
  @ValidateBody(inviteMemberSchema)
  @ApiOperation({ summary: 'Create a pending invitation (membership only after accept)' })
  async create(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return inviteResponseSchema.parse(
      await this.invitations.create(
        actorId(request),
        thesisId,
        inviteMemberSchema.parse(body),
        request.requestId,
      ),
    );
  }

  @Post('theses/:thesisId/supervisor-change')
  @HttpCode(201)
  @ValidateBody(supervisorChangeBodySchema)
  @ApiOperation({
    summary: 'Invite a replacement supervisor; history kept after accept',
  })
  async supervisorChange(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return inviteResponseSchema.parse(
      await this.invitations.requestSupervisorChange(
        actorId(request),
        thesisId,
        supervisorChangeBodySchema.parse(body),
        request.requestId,
      ),
    );
  }

  @Post('theses/:thesisId/invitations/:invitationId/resend')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Rotate token and resend a pending invitation email' })
  async resend(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() request: Request,
  ) {
    return invitationSummarySchema.parse(
      await this.invitations.resend(actorId(request), thesisId, invitationId, request.requestId),
    );
  }

  @Post('theses/:thesisId/invitations/:invitationId/cancel')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  async cancel(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() request: Request,
  ) {
    return invitationSummarySchema.parse(
      await this.invitations.cancel(actorId(request), thesisId, invitationId, request.requestId),
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) {
    throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return request.auth.userId;
}
