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
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createMessageGroupSchema,
  createMessageSchema,
  emptyBodySchema,
  updateMessageSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller({ path: 'messages/conversations', version: '1' })
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Mailbox of the signed-in user' })
  list(@Req() request: Request) {
    return this.messages.list(actorId(request));
  }

  @Post('groups')
  @HttpCode(201)
  @ValidateBody(createMessageGroupSchema)
  @ApiOperation({ summary: 'Create a group from the supervisor’s students' })
  createGroup(@Body() body: unknown, @Req() request: Request) {
    return this.messages.createGroup(
      actorId(request),
      createMessageGroupSchema.parse(body),
      request.requestId,
    );
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Read one conversation' })
  get(@Param('conversationId', ParseUUIDPipe) conversationId: string, @Req() request: Request) {
    return this.messages.get(actorId(request), conversationId);
  }

  @Post(':conversationId/messages')
  @HttpCode(201)
  @ValidateBody(createMessageSchema)
  @ApiOperation({ summary: 'Send a message in a conversation the caller belongs to' })
  post(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.messages.post(
      actorId(request),
      conversationId,
      createMessageSchema.parse(body),
      request.requestId,
    );
  }

  @Patch(':conversationId/messages/:messageId')
  @ValidateBody(updateMessageSchema)
  @ApiOperation({ summary: 'Edit a message the caller authored' })
  editMessage(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.messages.edit(
      actorId(request),
      conversationId,
      messageId,
      updateMessageSchema.parse(body),
      request.requestId,
    );
  }

  @Delete(':conversationId/messages/:messageId')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Delete a message the caller authored' })
  removeMessage(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Req() request: Request,
  ) {
    return this.messages.removeMessage(
      actorId(request),
      conversationId,
      messageId,
      request.requestId,
    );
  }

  @Post(':conversationId/clear')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Remove every message from a conversation the caller belongs to' })
  clear(@Param('conversationId', ParseUUIDPipe) conversationId: string, @Req() request: Request) {
    return this.messages.clear(actorId(request), conversationId, request.requestId);
  }

  @Post(':conversationId/leave')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Leave a group conversation' })
  leave(@Param('conversationId', ParseUUIDPipe) conversationId: string, @Req() request: Request) {
    return this.messages.leave(actorId(request), conversationId, request.requestId);
  }

  @Post(':conversationId/members')
  @HttpCode(200)
  @ValidateBody(createMessageGroupSchema)
  @ApiOperation({ summary: 'Change the students chosen for a group' })
  updateGroup(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.messages.updateGroup(
      actorId(request),
      conversationId,
      createMessageGroupSchema.parse(body),
      request.requestId,
    );
  }

  @Delete(':conversationId')
  @HttpCode(200)
  @ValidateBody(emptyBodySchema)
  @ApiOperation({ summary: 'Delete a group the caller created' })
  removeConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Req() request: Request,
  ) {
    return this.messages.removeConversation(actorId(request), conversationId, request.requestId);
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
