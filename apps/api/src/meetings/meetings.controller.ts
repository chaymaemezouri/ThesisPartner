import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  cancelMeetingSchema,
  createMeetingSchema,
  holdMeetingSchema,
  requestMeetingSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { MeetingsService } from './meetings.service';

@ApiTags('meetings')
@Controller({ path: 'theses/:thesisId/meetings', version: '1' })
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get()
  @ApiOperation({ summary: 'Upcoming meetings and the history that stays' })
  list(@Param('thesisId', ParseUUIDPipe) thesisId: string, @Req() request: Request) {
    return this.meetings.list(actorId(request), thesisId);
  }

  @Post()
  @HttpCode(201)
  @ValidateBody(createMeetingSchema)
  @ApiOperation({ summary: 'Plan a meeting as the thesis supervisor' })
  create(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.meetings.create(
      actorId(request),
      thesisId,
      createMeetingSchema.parse(body),
      request.requestId,
    );
  }

  @Post('requests')
  @HttpCode(201)
  @ValidateBody(requestMeetingSchema)
  @ApiOperation({ summary: 'Request a meeting as the doctoral student' })
  request(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.meetings.request(
      actorId(request),
      thesisId,
      requestMeetingSchema.parse(body),
      request.requestId,
    );
  }

  @Get(':meetingId')
  @ApiOperation({ summary: 'Meeting detail inside its thesis' })
  get(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Req() request: Request,
  ) {
    return this.meetings.get(actorId(request), thesisId, meetingId);
  }

  @Post(':meetingId')
  @HttpCode(200)
  @ValidateBody(createMeetingSchema)
  @ApiOperation({ summary: 'Update a planned meeting' })
  update(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.meetings.update(
      actorId(request),
      thesisId,
      meetingId,
      createMeetingSchema.parse(body),
      request.requestId,
    );
  }

  @Post(':meetingId/request')
  @HttpCode(200)
  @ValidateBody(requestMeetingSchema)
  @ApiOperation({ summary: 'Update a meeting request while it is still waiting' })
  reviseRequest(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.meetings.reviseRequest(
      actorId(request),
      thesisId,
      meetingId,
      requestMeetingSchema.parse(body),
      request.requestId,
    );
  }

  @Post(':meetingId/confirm')
  @HttpCode(200)
  @ValidateBody(createMeetingSchema)
  @ApiOperation({ summary: 'Confirm a student request by setting the link or the place' })
  confirm(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.meetings.confirm(
      actorId(request),
      thesisId,
      meetingId,
      createMeetingSchema.parse(body),
      request.requestId,
    );
  }

  @Post(':meetingId/hold')
  @HttpCode(200)
  @ValidateBody(holdMeetingSchema)
  @ApiOperation({ summary: 'Record the minutes and keep the meeting in the history' })
  hold(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.meetings.hold(
      actorId(request),
      thesisId,
      meetingId,
      holdMeetingSchema.parse(body),
      request.requestId,
    );
  }

  @Post(':meetingId/cancel')
  @HttpCode(200)
  @ValidateBody(cancelMeetingSchema)
  @ApiOperation({ summary: 'Cancel a planned meeting or refuse a request without removing it' })
  cancel(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.meetings.cancel(
      actorId(request),
      thesisId,
      meetingId,
      cancelMeetingSchema.parse(body),
      request.requestId,
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
