import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { evaluationInputSchema, publicationStatusInputSchema } from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { SupervisionDeskService } from './supervision-desk.service';

@ApiTags('supervision')
@Controller({ path: 'supervision/desk', version: '1' })
export class SupervisionDeskController {
  constructor(private readonly desk: SupervisionDeskService) {}

  @Get()
  @ApiOperation({ summary: 'Alerts, dates, reports, evaluations and decisions for supervised theses' })
  get(@Req() request: Request) {
    return this.desk.desk(actorId(request));
  }

  @Post('theses/:thesisId/evaluations')
  @HttpCode(201)
  @ValidateBody(evaluationInputSchema)
  @ApiOperation({ summary: 'Record a periodic evaluation that stays on the thesis' })
  evaluate(
    @Param('thesisId', ParseUUIDPipe) thesisId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.desk.addEvaluation(
      actorId(request),
      thesisId,
      evaluationInputSchema.parse(body),
      request.requestId,
    );
  }

  @Post('publications/:publicationId/status')
  @HttpCode(200)
  @ValidateBody(publicationStatusInputSchema)
  @ApiOperation({ summary: 'Set the publication status of a supervised doctoral student' })
  status(
    @Param('publicationId', ParseUUIDPipe) publicationId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.desk.setPublicationStatus(
      actorId(request),
      publicationId,
      publicationStatusInputSchema.parse(body).status,
      request.requestId,
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth.userId;
}
