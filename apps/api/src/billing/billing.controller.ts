import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  billingEventListSchema,
  billingPlansSchema,
  billingStatusSchema,
  billingSubscriptionSchema,
  billingTrialSchema,
  cancelSubscriptionBodySchema,
  selectPlanBodySchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { z } from 'zod';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { BillingService } from './billing.service';

const pageQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

@ApiTags('billing')
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('status')
  @ApiOperation({ summary: 'Trial, subscription and coverage for the current account' })
  async status(@Req() request: Request) {
    return billingStatusSchema.parse(await this.billing.status(actorId(request)));
  }

  @Get('plans')
  @ApiOperation({ summary: 'Published Thesis Flow Pro plans (MAD)' })
  async plans() {
    return billingPlansSchema.parse(await this.billing.listPlans(true));
  }

  @Post('trial/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start the unique 30-day trial after email verification' })
  async startTrial(@Req() request: Request) {
    return billingTrialSchema.parse(
      await this.billing.startTrial(actorId(request), request.requestId),
    );
  }

  @Post('subscription/select')
  @HttpCode(200)
  @ValidateBody(selectPlanBodySchema)
  @ApiOperation({ summary: 'Select a plan without capturing payment' })
  async select(@Body() body: unknown, @Req() request: Request) {
    const parsed = selectPlanBodySchema.parse(body);
    return billingSubscriptionSchema.parse(
      await this.billing.selectPlan(actorId(request), parsed.planCode, request.requestId),
    );
  }

  @Post('subscription/cancel')
  @HttpCode(200)
  @ValidateBody(cancelSubscriptionBodySchema)
  @ApiOperation({ summary: 'Request cancellation at the end of the current period' })
  async cancel(@Body() body: unknown, @Req() request: Request) {
    cancelSubscriptionBodySchema.parse(body);
    return billingSubscriptionSchema.parse(
      await this.billing.cancelAtPeriodEnd(actorId(request), request.requestId),
    );
  }

  @Get('events')
  @ApiOperation({ summary: 'Billing history for the current account' })
  async events(@Req() request: Request, @Query() raw: Record<string, unknown>) {
    const query = pageQuery.parse(raw);
    return billingEventListSchema.parse(
      await this.billing.events(actorId(request), query.page, query.pageSize),
    );
  }
}

function actorId(request: Request): string {
  const id = request.auth?.userId;
  if (!id) throw new Error('Missing auth context');
  return id;
}
