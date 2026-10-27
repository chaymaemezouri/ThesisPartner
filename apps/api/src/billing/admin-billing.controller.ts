import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SubscriptionStatus, TrialStatus } from '@prisma/client';
import {
  adminActivateSubscriptionBodySchema,
  adminBillingSettingsBodySchema,
  adminBillingSettingsSchema,
  adminBillingStatsSchema,
  adminExtendAccessBodySchema,
  adminSubscriptionListSchema,
  adminTrialListSchema,
  adminUpdatePlanBodySchema,
  billingEventListSchema,
  billingPlanSchema,
  billingPlansSchema,
  billingTrialSchema,
  billingSubscriptionSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { z } from 'zod';
import { SuperAdminGuard } from '../admin/super-admin.guard';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { BillingService } from './billing.service';

const trialQuery = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(['NOT_STARTED', 'ACTIVE', 'EXPIRED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const subscriptionQuery = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z
      .enum(['PENDING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED'])
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const eventQuery = z
  .object({
    userId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

@ApiTags('admin-billing')
@Controller({ path: 'admin', version: '1' })
@UseGuards(SuperAdminGuard)
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('billing/stats')
  @ApiOperation({ summary: 'Trial and subscription counters (no invented revenue)' })
  async stats() {
    return adminBillingStatsSchema.parse(await this.billing.stats());
  }

  @Get('billing/settings')
  async getSettings() {
    return adminBillingSettingsSchema.parse(this.billing.toSettingsDto(await this.billing.settings()));
  }

  @Patch('billing/settings')
  @ValidateBody(adminBillingSettingsBodySchema)
  async patchSettings(@Body() body: unknown, @Req() request: Request) {
    const parsed = adminBillingSettingsBodySchema.parse(body);
    return adminBillingSettingsSchema.parse(
      await this.billing.updateSettings(actorId(request), parsed, request.requestId),
    );
  }

  @Get('plans')
  async plans() {
    return billingPlansSchema.parse(await this.billing.listPlans(false));
  }

  @Patch('plans/:planId')
  @ValidateBody(adminUpdatePlanBodySchema)
  async updatePlan(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return billingPlanSchema.parse(
      await this.billing.updatePlan(
        actorId(request),
        planId,
        adminUpdatePlanBodySchema.parse(body),
        request.requestId,
      ),
    );
  }

  @Get('trials')
  async trials(@Query() raw: Record<string, unknown>) {
    const query = trialQuery.parse(raw);
    return adminTrialListSchema.parse(
      await this.billing.listTrials({
        search: query.search,
        status: query.status as TrialStatus | undefined,
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
  }

  @Get('subscriptions')
  async subscriptions(@Query() raw: Record<string, unknown>) {
    const query = subscriptionQuery.parse(raw);
    return adminSubscriptionListSchema.parse(
      await this.billing.listSubscriptions({
        search: query.search,
        status: query.status as SubscriptionStatus | undefined,
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
  }

  @Post('subscriptions/:subscriptionId/activate')
  @HttpCode(200)
  @ValidateBody(adminActivateSubscriptionBodySchema)
  async activate(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = adminActivateSubscriptionBodySchema.parse(body);
    return billingSubscriptionSchema.parse(
      await this.billing.activateSubscription(
        actorId(request),
        subscriptionId,
        parsed.reason,
        request.requestId,
      ),
    );
  }

  @Post('subscriptions/:subscriptionId/grace')
  @HttpCode(200)
  @ValidateBody(adminActivateSubscriptionBodySchema)
  async grace(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = adminActivateSubscriptionBodySchema.parse(body);
    return billingSubscriptionSchema.parse(
      await this.billing.markPastDue(actorId(request), subscriptionId, parsed.reason, request.requestId),
    );
  }

  @Post('users/:userId/extend-access')
  @HttpCode(200)
  @ValidateBody(adminExtendAccessBodySchema)
  async extend(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = adminExtendAccessBodySchema.parse(body);
    return billingTrialSchema.parse(
      await this.billing.extendAccess(
        actorId(request),
        userId,
        parsed.days,
        parsed.reason,
        request.requestId,
      ),
    );
  }

  @Get('billing/events')
  async events(@Query() raw: Record<string, unknown>) {
    const query = eventQuery.parse(raw);
    return billingEventListSchema.parse(await this.billing.adminEvents(query));
  }
}

function actorId(request: Request): string {
  const id = request.auth?.userId;
  if (!id) throw new Error('Missing auth context');
  return id;
}
