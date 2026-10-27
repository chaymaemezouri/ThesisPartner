import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { InvoiceKind, PaymentEnvironment, PlanCode } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage';
import { renderInvoicePdf } from './invoice-pdf';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async issueForPayment(paymentId: string, kind: InvoiceKind = 'INVOICE') {
    const existing = await this.prisma.invoice.findFirst({
      where: { paymentId, kind, status: 'ISSUED' },
    });
    if (existing) return existing;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { include: { profile: true } },
        plan: true,
        subscription: true,
      },
    });
    if (!payment) throw new AppException(404, 'NOT_FOUND', 'Payment not found');

    const settings = await this.prisma.billingSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', trialDays: 30, graceDays: 7 },
    });
    const legalConfigured = Boolean(settings.issuerName?.trim() && settings.issuerLegalId?.trim());
    const specimen = !legalConfigured;
    const taxBps = settings.taxBps;
    const base =
      kind === 'CREDIT_NOTE'
        ? payment.refundedAmountMinor || payment.amountMinor
        : payment.amountMinor;
    const taxAmountMinor = Math.round((base * taxBps) / 10_000);
    const totalMinor = base + taxAmountMinor;
    const now = new Date();
    const year = now.getUTCFullYear();
    const recipientName = payment.user.profile?.displayName ?? payment.user.email;
    const description =
      kind === 'CREDIT_NOTE'
        ? `Avoir ThesisPartner Pro (${payment.plan.code})`
        : `Abonnement ThesisPartner Pro (${payment.plan.interval === 'YEAR' ? 'annuel' : 'mensuel'})`;

    const created = await this.prisma.$transaction(async (tx) => {
      const sequence = await tx.invoiceSequence.upsert({
        where: { environment_year: { environment: payment.environment, year } },
        create: { environment: payment.environment, year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const invoiceNumber = `${settings.invoicePrefix}-${payment.environment}-${year}-${String(sequence.lastValue).padStart(6, '0')}`;
      return tx.invoice.create({
        data: {
          userId: payment.userId,
          subscriptionId: payment.subscriptionId,
          paymentId: payment.id,
          invoiceNumber,
          kind,
          status: 'ISSUED',
          specimen,
          issueDate: now,
          periodStart: payment.subscription.currentPeriodStart,
          periodEnd: payment.subscription.currentPeriodEnd,
          description,
          planCode: payment.plan.code,
          amountMinor: base,
          taxBps,
          taxAmountMinor,
          totalMinor,
          currency: payment.currency,
          environment: payment.environment,
          issuerName: settings.issuerName,
          issuerAddress: settings.issuerAddress,
          issuerLegalId: settings.issuerLegalId,
          recipientName,
          recipientEmail: payment.user.email,
          paymentReference: payment.providerPaymentId,
        },
      });
    });

    const pdf = renderInvoicePdf({
      invoiceNumber: created.invoiceNumber,
      issueDateIso: created.issueDate.toISOString().slice(0, 10),
      specimen,
      kind,
      status: created.status,
      issuerName: created.issuerName?.trim() || 'Identite legale non configuree',
      issuerAddress: created.issuerAddress?.trim() || '—',
      issuerLegalId: created.issuerLegalId?.trim() || '—',
      recipientName,
      recipientEmail: payment.user.email,
      description,
      planCode: payment.plan.code,
      periodLabel: periodLabel(created.periodStart, created.periodEnd),
      amountMad: formatMad(base),
      taxLabel: taxBps > 0 ? `Taxes (${(taxBps / 100).toFixed(2)} %)` : 'Taxes (non configurees)',
      taxMad: formatMad(taxAmountMinor),
      totalMad: formatMad(totalMinor),
      currency: 'MAD',
      paymentReference: payment.providerPaymentId ?? payment.id,
      environment: payment.environment,
    });
    const key = `invoices/${payment.environment.toLowerCase()}/${payment.userId}/${created.id}.pdf`;
    try {
      await this.storage.putObject({
        key,
        body: Readable.from(pdf),
        contentType: 'application/pdf',
        contentLength: pdf.length,
        downloadName: `${created.invoiceNumber}.pdf`,
      });
      return this.prisma.invoice.update({
        where: { id: created.id },
        data: { documentPath: key },
      });
    } catch {
      return created;
    }
  }

  async listForUser(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [total, rows] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      invoices: rows.map((row) => this.toDto(row, true)),
      page,
      pageSize,
      total,
    };
  }

  async adminList(query: {
    search?: string;
    environment?: PaymentEnvironment;
    kind?: InvoiceKind;
    page: number;
    pageSize: number;
  }) {
    const search = query.search?.trim();
    const where = {
      ...(query.environment ? { environment: query.environment } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
              { user: { email: { contains: search.toLowerCase(), mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: { user: true },
        orderBy: { issueDate: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      invoices: rows.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        email: row.user.email,
        kind: row.kind,
        status: row.status,
        specimen: row.specimen,
        totalMinor: row.totalMinor,
        currency: 'MAD' as const,
        environment: row.environment,
        issueDate: row.issueDate.toISOString(),
        downloadable: Boolean(row.documentPath),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async signedDownload(invoiceId: string, actorId: string, asAdmin: boolean) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new AppException(404, 'NOT_FOUND', 'Invoice not found');
    if (!asAdmin && invoice.userId !== actorId) {
      throw new AppException(403, 'FORBIDDEN', 'You cannot download this invoice');
    }
    if (!invoice.documentPath) {
      throw new AppException(404, 'NOT_FOUND', 'Invoice file is not available');
    }
    const signed = await this.storage.createSignedDownloadUrl({
      key: invoice.documentPath,
      downloadName: `${invoice.invoiceNumber}.pdf`,
      contentType: 'application/pdf',
      ttlSeconds: this.env.SIGNED_URL_TTL_SECONDS,
    });
    return {
      url: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
      fileName: `${invoice.invoiceNumber}.pdf`,
    };
  }

  toDto(
    row: {
      id: string;
      invoiceNumber: string;
      kind: InvoiceKind;
      status: string;
      specimen: boolean;
      issueDate: Date;
      description: string;
      planCode: string;
      amountMinor: number;
      taxAmountMinor: number;
      totalMinor: number;
      environment: PaymentEnvironment;
      documentPath: string | null;
    },
    downloadableKnown?: boolean,
  ) {
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      kind: row.kind,
      status: row.status,
      specimen: row.specimen,
      issueDate: row.issueDate.toISOString(),
      description: row.description,
      planCode: row.planCode as PlanCode,
      amountMinor: row.amountMinor,
      taxAmountMinor: row.taxAmountMinor,
      totalMinor: row.totalMinor,
      currency: 'MAD' as const,
      environment: row.environment,
      downloadable: downloadableKnown ?? Boolean(row.documentPath),
    };
  }
}

function formatMad(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function periodLabel(start: Date | null, end: Date | null): string {
  if (!start || !end) return '—';
  return `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`;
}
