import { AppException } from '../common/errors/app.exception';
import type { Env } from '../config/env';
import type {
  CreateCheckoutInput,
  PaymentEnvironment,
  PaymentProvider,
  PaymentProviderStatus,
  VerifiedPaymentEvent,
} from './payment-provider';

export class UnavailablePaymentProvider implements PaymentProvider {
  readonly id = 'none';
  readonly checkoutAvailable = false;
  readonly environment: PaymentEnvironment;

  constructor(env: Env) {
    this.environment = env.NODE_ENV === 'production' ? 'LIVE' : 'TEST';
  }

  async createCheckoutSession(_input: CreateCheckoutInput): Promise<never> {
    throw new AppException(409, 'CONFLICT', 'Online payment is not available yet');
  }

  async getPaymentStatus(_providerPaymentId: string): Promise<PaymentProviderStatus | null> {
    return null;
  }

  async verifyWebhook(): Promise<VerifiedPaymentEvent> {
    throw new AppException(401, 'UNAUTHORIZED', 'No payment provider is configured');
  }
}
