import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { AppException } from '../common/errors/app.exception';
import type { Env } from '../config/env';
import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentEnvironment,
  PaymentProvider,
  PaymentProviderStatus,
  VerifiedPaymentEvent,
} from './payment-provider';

export const MOCK_SIGNATURE_HEADER = 'x-mock-signature';

type MockSession = {
  checkoutSessionId: string;
  providerPaymentId: string;
  paymentId: string;
  userId: string;
  amountMinor: number;
  currency: string;
  planCode: string;
  status: PaymentProviderStatus['status'];
  createdAt: Date;
  expiresAt: Date;
};

export class MockPaymentProvider implements PaymentProvider {
  readonly id = 'mock';
  readonly environment: PaymentEnvironment = 'TEST';
  readonly checkoutAvailable = true;
  private readonly sessions = new Map<string, MockSession>();
  private readonly byProviderId = new Map<string, MockSession>();

  constructor(private readonly env: Env) {
    if (env.NODE_ENV === 'production') {
      throw new Error('Mock payment provider is forbidden in production');
    }
    if (!env.MOCK_WEBHOOK_SECRET) {
      throw new Error('MOCK_WEBHOOK_SECRET is required for the mock provider');
    }
  }

  get scenario() {
    return this.env.MOCK_PAYMENT_SCENARIO;
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const checkoutSessionId = `mock_cs_${randomUUID()}`;
    const providerPaymentId = `mock_pay_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const session: MockSession = {
      checkoutSessionId,
      providerPaymentId,
      paymentId: input.paymentId,
      userId: input.userId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      planCode: input.planCode,
      status: 'PENDING',
      createdAt: new Date(),
      expiresAt,
    };
    this.sessions.set(checkoutSessionId, session);
    this.byProviderId.set(providerPaymentId, session);
    const checkoutUrl = `${this.env.APP_URL}/paiement/simulation/${checkoutSessionId}`;
    return {
      provider: this.id,
      providerPaymentId,
      checkoutSessionId,
      checkoutUrl,
      environment: this.environment,
      expiresAt,
    };
  }

  getSession(checkoutSessionId: string): MockSession | undefined {
    return this.sessions.get(checkoutSessionId);
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentProviderStatus | null> {
    const session = this.byProviderId.get(providerPaymentId);
    if (!session) return null;
    return {
      status: session.status,
      amountMinor: session.amountMinor,
      currency: session.currency,
    };
  }

  async verifyWebhook(input: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer;
  }): Promise<VerifiedPaymentEvent> {
    const header = headerValue(input.headers[MOCK_SIGNATURE_HEADER]);
    if (!header) throw new AppException(401, 'UNAUTHORIZED', 'Missing webhook signature');
    const parsed = parseSignature(header);
    if (!parsed) throw new AppException(401, 'UNAUTHORIZED', 'Invalid webhook signature');
    const ageMs = Math.abs(Date.now() - parsed.timestamp * 1000);
    if (ageMs > 5 * 60 * 1000) {
      throw new AppException(401, 'UNAUTHORIZED', 'Webhook signature expired');
    }
    const expected = this.sign(input.rawBody, parsed.timestamp);
    if (!safeHexEqual(parsed.digest, expected)) {
      throw new AppException(401, 'UNAUTHORIZED', 'Invalid webhook signature');
    }
    let body: unknown;
    try {
      body = JSON.parse(input.rawBody.toString('utf8'));
    } catch {
      throw new AppException(400, 'BAD_REQUEST', 'Invalid webhook payload');
    }
    return parseEvent(body);
  }

  sign(rawBody: Buffer, timestamp = Math.floor(Date.now() / 1000)): string {
    const secret = this.env.MOCK_WEBHOOK_SECRET;
    if (!secret) throw new Error('MOCK_WEBHOOK_SECRET missing');
    return createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
  }

  signatureHeader(rawBody: Buffer, timestamp = Math.floor(Date.now() / 1000)): string {
    return `t=${timestamp},v1=${this.sign(rawBody, timestamp)}`;
  }

  buildEvent(
    session: MockSession,
    eventType: string,
    extra?: { refundedAmountMinor?: number; externalEventId?: string },
  ): VerifiedPaymentEvent {
    return {
      provider: this.id,
      externalEventId: extra?.externalEventId ?? `mock_evt_${randomUUID()}`,
      eventType,
      providerPaymentId: session.providerPaymentId,
      checkoutSessionId: session.checkoutSessionId,
      amountMinor: session.amountMinor,
      currency: session.currency,
      environment: this.environment,
      occurredAt: new Date(),
      refundedAmountMinor: extra?.refundedAmountMinor,
    };
  }

  markStatus(checkoutSessionId: string, status: PaymentProviderStatus['status']): MockSession {
    const session = this.sessions.get(checkoutSessionId);
    if (!session) throw new AppException(404, 'NOT_FOUND', 'Checkout session not found');
    session.status = status;
    return session;
  }

  async refund(input: { providerPaymentId: string; amountMinor?: number }) {
    const session = this.byProviderId.get(input.providerPaymentId);
    if (!session) throw new AppException(404, 'NOT_FOUND', 'Payment not found');
    const amount = input.amountMinor ?? session.amountMinor;
    session.status = amount >= session.amountMinor ? 'REFUNDED' : 'SUCCEEDED';
    return { refundId: `mock_rf_${randomUUID()}`, amountMinor: amount };
  }

  async cancelRenewal(): Promise<void> {
    return;
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseSignature(header: string): { timestamp: number; digest: string } | null {
  const parts = Object.fromEntries(
    header.split(',').map((item) => {
      const [key, ...rest] = item.trim().split('=');
      return [key, rest.join('=')];
    }),
  );
  const timestamp = Number(parts.t);
  const digest = parts.v1;
  if (!Number.isFinite(timestamp) || !digest) return null;
  return { timestamp, digest };
}

function safeHexEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parseEvent(body: unknown): VerifiedPaymentEvent {
  if (!body || typeof body !== 'object') {
    throw new AppException(400, 'BAD_REQUEST', 'Invalid webhook payload');
  }
  const row = body as Record<string, unknown>;
  if (
    typeof row.externalEventId !== 'string' ||
    typeof row.eventType !== 'string' ||
    typeof row.providerPaymentId !== 'string' ||
    typeof row.amountMinor !== 'number' ||
    typeof row.currency !== 'string' ||
    row.environment !== 'TEST'
  ) {
    throw new AppException(400, 'BAD_REQUEST', 'Invalid webhook payload');
  }
  return {
    provider: 'mock',
    externalEventId: row.externalEventId,
    eventType: row.eventType,
    providerPaymentId: row.providerPaymentId,
    checkoutSessionId: typeof row.checkoutSessionId === 'string' ? row.checkoutSessionId : undefined,
    amountMinor: row.amountMinor,
    currency: row.currency,
    environment: 'TEST',
    occurredAt: new Date(typeof row.occurredAt === 'string' ? row.occurredAt : Date.now()),
    refundedAmountMinor: typeof row.refundedAmountMinor === 'number' ? row.refundedAmountMinor : undefined,
  };
}
