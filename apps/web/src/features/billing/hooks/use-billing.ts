import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  billingEventListSchema,
  billingStatusSchema,
  billingSubscriptionSchema,
  billingTrialSchema,
  checkoutResponseSchema,
  invoiceDownloadSchema,
  invoiceListSchema,
  paymentDtoSchema,
  paymentListSchema,
} from '@thesispartner/validation';
import { apiGet, apiSend } from '../../../api/client';

export function useBillingStatus() {
  return useQuery({
    queryKey: ['billing', 'status'],
    queryFn: () => apiGet('/api/v1/billing/status', billingStatusSchema),
  });
}

export function useBillingEvents() {
  return useQuery({
    queryKey: ['billing', 'events'],
    queryFn: () => apiGet('/api/v1/billing/events?page=1&pageSize=20', billingEventListSchema),
  });
}

export function useBillingPayments() {
  return useQuery({
    queryKey: ['billing', 'payments'],
    queryFn: () => apiGet('/api/v1/billing/payments?page=1&pageSize=20', paymentListSchema),
  });
}

export function useBillingInvoices() {
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: () => apiGet('/api/v1/billing/invoices?page=1&pageSize=20', invoiceListSchema),
  });
}

export function usePayment(paymentId: string | null) {
  return useQuery({
    queryKey: ['billing', 'payments', paymentId],
    enabled: Boolean(paymentId),
    queryFn: () => apiGet(`/api/v1/billing/payments/${paymentId}`, paymentDtoSchema),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING' || status === 'PROCESSING') return 2000;
      return false;
    },
  });
}

export function useStartTrial() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend('/api/v1/billing/trial/start', billingTrialSchema, {}),
    onSuccess: () => client.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useSelectPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (planCode: 'THESISPARTNER_PRO_MONTHLY' | 'THESISPARTNER_PRO_YEARLY') =>
      apiSend('/api/v1/billing/subscription/select', billingSubscriptionSchema, { planCode }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useCheckout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (planCode: 'THESISPARTNER_PRO_MONTHLY' | 'THESISPARTNER_PRO_YEARLY') =>
      apiSend('/api/v1/billing/checkout', checkoutResponseSchema, {
        planCode,
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useCancelSubscription() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiSend('/api/v1/billing/subscription/cancel', billingSubscriptionSchema, { confirm: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export async function downloadInvoice(invoiceId: string) {
  const signed = await apiGet(`/api/v1/billing/invoices/${invoiceId}/download`, invoiceDownloadSchema);
  window.open(signed.url, '_blank', 'noopener,noreferrer');
}
