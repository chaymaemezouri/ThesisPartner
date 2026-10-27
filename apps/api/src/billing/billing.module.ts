import { Module } from '@nestjs/common';
import { SuperAdminGuard } from '../admin/super-admin.guard';
import { AuthModule } from '../auth/auth.module';
import { ENV, type Env } from '../config/env';
import { AdminBillingController } from './admin-billing.controller';
import { BillingController } from './billing.controller';
import { BillingMailer } from './billing-mailer';
import { BillingService } from './billing.service';
import { InvoiceService } from './invoice.service';
import { MockPaymentProvider } from './mock-payment.provider';
import {
  AdminPaymentController,
  MockBillingController,
  PaymentController,
} from './payment.controller';
import { PAYMENT_PROVIDER } from './payment-provider';
import { PaymentService } from './payment.service';
import { SubscriptionAccessService } from './subscription-access.service';
import { UnavailablePaymentProvider } from './unavailable-payment.provider';

const mockControllers = process.env.NODE_ENV === 'production' ? [] : [MockBillingController];

@Module({
  imports: [AuthModule],
  controllers: [
    BillingController,
    AdminBillingController,
    PaymentController,
    AdminPaymentController,
    ...mockControllers,
  ],
  providers: [
    BillingService,
    SubscriptionAccessService,
    SuperAdminGuard,
    InvoiceService,
    BillingMailer,
    PaymentService,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) => {
        if (env.PAYMENT_PROVIDER === 'mock') {
          if (env.NODE_ENV === 'production') {
            throw new Error('Mock payment provider is forbidden in production');
          }
          return new MockPaymentProvider(env);
        }
        return new UnavailablePaymentProvider(env);
      },
    },
  ],
  exports: [BillingService, SubscriptionAccessService, PaymentService, PAYMENT_PROVIDER],
})
export class BillingModule {}
