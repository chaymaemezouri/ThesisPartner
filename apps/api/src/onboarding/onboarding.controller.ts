import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { onboardingActionBodySchema, onboardingStatusSchema } from '@thesispartner/validation';
import type { Request } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@Controller({ path: 'onboarding', version: '1' })
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  @ApiOperation({ summary: 'Interactive onboarding status computed from live account data' })
  async status(@Req() request: Request) {
    return onboardingStatusSchema.parse(await this.onboarding.status(actorId(request)));
  }

  @Post('actions')
  @HttpCode(200)
  @ValidateBody(onboardingActionBodySchema)
  @ApiOperation({ summary: 'Dismiss welcome or complete/reopen the startup guide' })
  async action(@Body() body: unknown, @Req() request: Request) {
    const parsed = onboardingActionBodySchema.parse(body);
    return onboardingStatusSchema.parse(
      await this.onboarding.applyAction(actorId(request), parsed.action),
    );
  }
}

function actorId(request: Request): string {
  if (!request.auth) {
    throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return request.auth.userId;
}
