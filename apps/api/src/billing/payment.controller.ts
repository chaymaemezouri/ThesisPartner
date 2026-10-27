import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminInvoiceListSchema,
  adminPaymentEventListSchema,
  adminPaymentListSchema,
  adminRefundBodySchema,
  checkoutBodySchema,
  checkoutResponseSchema,
  invoiceDownloadSchema,
  invoiceListSchema,
  mockCheckoutCompleteBodySchema,
  mockCheckoutSessionSchema,
  paymentDtoSchema,
  paymentListSchema,
  webhookAckSchema,
} from '@thesispartner/validation';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { SuperAdminGuard } from '../admin/super-admin.guard';
import { Public } from '../auth/public.decorator';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { InvoiceService } from './invoice.service';
import { PaymentService } from './payment.service';

const pageQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

@ApiTags('billing-payments')
@Controller({ path: 'billing', version: '1' })
export class PaymentController {
  constructor(
    private readonly payments: PaymentService,
    private readonly invoices: InvoiceService,
  ) {}

  @Post('checkout')
  @HttpCode(200)
  @ValidateBody(checkoutBodySchema)
  @ApiOperation({ summary: 'Create a checkout session from server-side plan prices' })
  async checkout(@Body() body: unknown, @Req() request: Request) {
    const parsed = checkoutBodySchema.parse(body);
    return checkoutResponseSchema.parse(
      await this.payments.checkout(actorId(request), parsed.planCode, parsed.idempotencyKey, request.requestId),
    );
  }

  @Get('payments')
  async listPayments(@Req() request: Request, @Query() raw: Record<string, unknown>) {
    const query = pageQuery.parse(raw);
    return paymentListSchema.parse(
      await this.payments.listForUser(actorId(request), query.page, query.pageSize),
    );
  }

  @Get('payments/:paymentId')
  async getPayment(@Param('paymentId', ParseUUIDPipe) paymentId: string, @Req() request: Request) {
    return paymentDtoSchema.parse(await this.payments.getOwnedPayment(actorId(request), paymentId));
  }

  @Get('invoices')
  async listInvoices(@Req() request: Request, @Query() raw: Record<string, unknown>) {
    const query = pageQuery.parse(raw);
    return invoiceListSchema.parse(
      await this.invoices.listForUser(actorId(request), query.page, query.pageSize),
    );
  }

  @Get('invoices/:invoiceId/download')
  async downloadInvoice(@Param('invoiceId', ParseUUIDPipe) invoiceId: string, @Req() request: Request) {
    return invoiceDownloadSchema.parse(
      await this.invoices.signedDownload(invoiceId, actorId(request), false),
    );
  }

  @Public()
  @SkipThrottle()
  @Post('webhooks/:provider')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verified payment provider notifications' })
  async webhook(
    @Param('provider') provider: string,
    @Req() request: Request,
  ) {
    const raw = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    return webhookAckSchema.parse(
      await this.payments.handleWebhook(provider, request.headers as Record<string, string | string[] | undefined>, raw),
    );
  }
}

@ApiTags('billing-mock')
@Controller({ path: 'billing/mock', version: '1' })
export class MockBillingController {
  constructor(private readonly payments: PaymentService) {}

  @Get('sessions/:sessionId')
  async session(@Param('sessionId') sessionId: string, @Req() request: Request) {
    return mockCheckoutSessionSchema.parse(await this.payments.mockSession(actorId(request), sessionId));
  }

  @Post('sessions/:sessionId/complete')
  @HttpCode(200)
  @ValidateBody(mockCheckoutCompleteBodySchema)
  async complete(
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    mockCheckoutCompleteBodySchema.parse(body);
    return webhookAckSchema.parse(
      await this.payments.mockComplete(actorId(request), sessionId, request.requestId),
    );
  }
}

@ApiTags('admin-payments')
@Controller({ path: 'admin', version: '1' })
@UseGuards(SuperAdminGuard)
export class AdminPaymentController {
  constructor(
    private readonly payments: PaymentService,
    private readonly invoices: InvoiceService,
  ) {}

  @Get('payments/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(@Query() raw: Record<string, unknown>, @Res() response: Response) {
    const query = paymentAdminQuery.parse(raw);
    const csv = await this.payments.exportCsv({
      search: query.search,
      status: query.status,
      environment: query.environment,
    });
    response.send(csv);
  }

  @Get('payments')
  async paymentsList(@Query() raw: Record<string, unknown>) {
    const query = paymentAdminQuery.parse(raw);
    return adminPaymentListSchema.parse(
      await this.payments.adminList({
        search: query.search,
        status: query.status,
        environment: query.environment,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
  }

  @Get('invoices')
  async invoicesList(@Query() raw: Record<string, unknown>) {
    const query = invoiceAdminQuery.parse(raw);
    return adminInvoiceListSchema.parse(
      await this.invoices.adminList({
        search: query.search,
        environment: query.environment,
        kind: query.kind,
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
  }

  @Get('invoices/:invoiceId/download')
  async download(@Param('invoiceId', ParseUUIDPipe) invoiceId: string, @Req() request: Request) {
    return invoiceDownloadSchema.parse(
      await this.invoices.signedDownload(invoiceId, actorId(request), true),
    );
  }

  @Get('payment-events')
  async events(@Query() raw: Record<string, unknown>) {
    const query = eventAdminQuery.parse(raw);
    return adminPaymentEventListSchema.parse(
      await this.payments.adminEvents({
        processingStatus: query.processingStatus,
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
  }

  @Post('payment-events/:eventId/retry')
  @HttpCode(200)
  async retry(@Param('eventId', ParseUUIDPipe) eventId: string, @Req() request: Request) {
    return webhookAckSchema.parse(
      await this.payments.retryEvent(actorId(request), eventId, request.requestId),
    );
  }

  @Post('payments/:paymentId/refund')
  @HttpCode(200)
  @ValidateBody(adminRefundBodySchema)
  async refund(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = adminRefundBodySchema.parse(body);
    return webhookAckSchema.parse(
      await this.payments.refund(
        actorId(request),
        paymentId,
        parsed.reason,
        parsed.amountMinor,
        request.requestId,
      ),
    );
  }
}

function actorId(request: Request): string {
  const id = request.auth?.userId;
  if (!id) throw new Error('Missing auth context');
  return id;
}

const paymentAdminQuery = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z
      .enum([
        'PENDING',
        'PROCESSING',
        'SUCCEEDED',
        'FAILED',
        'CANCELLED',
        'REFUNDED',
        'PARTIALLY_REFUNDED',
      ])
      .optional(),
    environment: z.enum(['TEST', 'LIVE']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const invoiceAdminQuery = z
  .object({
    search: z.string().trim().max(200).optional(),
    environment: z.enum(['TEST', 'LIVE']).optional(),
    kind: z.enum(['INVOICE', 'CREDIT_NOTE']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const eventAdminQuery = z
  .object({
    processingStatus: z.enum(['RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
