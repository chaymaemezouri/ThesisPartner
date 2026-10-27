import { MockPaymentProvider } from './mock-payment.provider';
import type { Env } from '../config/env';

const baseEnv = {
  NODE_ENV: 'test',
  APP_URL: 'http://localhost:5173',
  MOCK_WEBHOOK_SECRET: 'dev-mock-webhook-secret',
  MOCK_PAYMENT_SCENARIO: 'success',
} as Env;

describe('MockPaymentProvider', () => {
  it('refuses to construct in production', () => {
    expect(
      () =>
        new MockPaymentProvider({
          ...baseEnv,
          NODE_ENV: 'production',
        }),
    ).toThrow(/forbidden in production/);
  });

  it('signs and verifies a webhook payload', async () => {
    const provider = new MockPaymentProvider(baseEnv);
    const raw = Buffer.from(
      JSON.stringify({
        externalEventId: 'evt_1',
        eventType: 'payment.succeeded',
        providerPaymentId: 'mock_pay_1',
        amountMinor: 19900,
        currency: 'MAD',
        environment: 'TEST',
      }),
    );
    const verified = await provider.verifyWebhook({
      headers: { 'x-mock-signature': provider.signatureHeader(raw) },
      rawBody: raw,
    });
    expect(verified.eventType).toBe('payment.succeeded');
    expect(verified.environment).toBe('TEST');
  });

  it('rejects an invalid signature', async () => {
    const provider = new MockPaymentProvider(baseEnv);
    await expect(
      provider.verifyWebhook({
        headers: { 'x-mock-signature': 't=1,v1=deadbeef' },
        rawBody: Buffer.from('{}'),
      }),
    ).rejects.toThrow(/Invalid webhook signature|Webhook signature expired/);
  });
});
