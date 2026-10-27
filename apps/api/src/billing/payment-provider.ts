export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export type PaymentEnvironment = 'TEST' | 'LIVE';

export type CreateCheckoutInput = {
  paymentId: string;
  userId: string;
  amountMinor: number;
  currency: string;
  planCode: string;
  returnUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  provider: string;
  providerPaymentId: string;
  checkoutSessionId: string;
  checkoutUrl: string;
  environment: PaymentEnvironment;
  expiresAt: Date;
};

export type VerifiedPaymentEvent = {
  provider: string;
  externalEventId: string;
  eventType: string;
  providerPaymentId: string;
  checkoutSessionId?: string;
  amountMinor: number;
  currency: string;
  environment: PaymentEnvironment;
  occurredAt: Date;
  refundedAmountMinor?: number;
};

export type PaymentProviderStatus = {
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  amountMinor: number;
  currency: string;
};

export interface PaymentProvider {
  readonly id: string;
  readonly environment: PaymentEnvironment;
  readonly checkoutAvailable: boolean;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentProviderStatus | null>;
  verifyWebhook(input: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer;
  }): Promise<VerifiedPaymentEvent>;
  refund?(input: {
    providerPaymentId: string;
    amountMinor?: number;
  }): Promise<{ refundId: string; amountMinor: number }>;
  cancelRenewal?(input: { providerPaymentId: string }): Promise<void>;
}
