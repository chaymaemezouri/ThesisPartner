import { useState } from 'react';
import { Button, Input, Select } from '@thesispartner/ui';
import {
  adminPaymentEventListSchema,
  adminPaymentListSchema,
  adminRefundBodySchema,
  webhookAckSchema,
} from '@thesispartner/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { AdminPageHeader, AdminPanel, AdminState } from './AdminUi';

export function AdminPaymentsPage() {
  const t = useT();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [environment, setEnvironment] = useState('');
  const [reason, setReason] = useState('Remboursement admin');

  const payments = useQuery({
    queryKey: ['admin', 'payments', search, status, environment],
    queryFn: () =>
      apiGet(
        `/api/v1/admin/payments?page=1&pageSize=50${qs({ search, status, environment })}`,
        adminPaymentListSchema,
      ),
  });
  const events = useQuery({
    queryKey: ['admin', 'payment-events'],
    queryFn: () => apiGet('/api/v1/admin/payment-events?page=1&pageSize=50', adminPaymentEventListSchema),
  });
  const retry = useMutation({
    mutationFn: (eventId: string) =>
      apiSend(`/api/v1/admin/payment-events/${eventId}/retry`, webhookAckSchema, {}),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
  const refund = useMutation({
    mutationFn: (paymentId: string) =>
      apiSend(`/api/v1/admin/payments/${paymentId}/refund`, webhookAckSchema, adminRefundBodySchema.parse({ reason })),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.payments.title')} subtitle={t('admin.payments.subtitle')} />
      <div className="flex flex-wrap gap-3">
        <Input id="pay-search" label={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select id="pay-status" label={t('admin.payments.status')} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('common.all')}</option>
          {['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].map(
            (item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ),
          )}
        </Select>
        <Select
          id="pay-env"
          label={t('admin.payments.environment')}
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
        >
          <option value="">{t('common.all')}</option>
          <option value="TEST">TEST</option>
          <option value="LIVE">LIVE</option>
        </Select>
        <a className="self-end text-sm text-brand hover:underline" href="/api/v1/admin/payments/export">
          {t('admin.payments.export')}
        </a>
      </div>
      <AdminState loading={payments.isLoading} error={payments.error}>
        <AdminPanel title={t('admin.payments.history')}>
          <ul className="space-y-2 text-sm">
            {payments.data?.payments.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
                <span>
                  {row.email} · {(row.amountMinor / 100).toFixed(2)} MAD · {row.status} · {row.environment}
                </span>
                {row.status === 'SUCCEEDED' ? (
                  <Button variant="ghost" disabled={refund.isPending} onClick={() => refund.mutate(row.id)}>
                    {t('admin.payments.refund')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </AdminPanel>
      </AdminState>
      <AdminPanel title={t('admin.payments.events')}>
        <Input id="refund-reason" label={t('admin.payments.reason')} value={reason} onChange={(e) => setReason(e.target.value)} />
        <ul className="mt-3 space-y-2 text-sm">
          {events.data?.events.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
              <span>
                {row.eventType} · {row.processingStatus}
                {row.errorCode ? ` · ${row.errorCode}` : ''}
              </span>
              {row.processingStatus === 'FAILED' || row.processingStatus === 'RECEIVED' ? (
                <Button variant="ghost" disabled={retry.isPending} onClick={() => retry.mutate(row.id)}>
                  {t('admin.payments.retry')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  );
}

function qs(input: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `&${text}` : '';
}
