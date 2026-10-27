import { useState } from 'react';
import { Button, Input, Select } from '@thesispartner/ui';
import {
  adminBillingStatsSchema,
  adminSubscriptionListSchema,
  adminTrialListSchema,
  billingEventListSchema,
  billingSubscriptionSchema,
  billingTrialSchema,
} from '@thesispartner/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { AdminKpi, AdminPageHeader, AdminPanel, AdminState } from './AdminUi';

export function AdminBillingPage() {
  const t = useT();
  const client = useQueryClient();
  const [trialStatus, setTrialStatus] = useState('');
  const [subStatus, setSubStatus] = useState('');
  const [search, setSearch] = useState('');
  const [extendUserId, setExtendUserId] = useState('');
  const [extendDays, setExtendDays] = useState('7');
  const [extendReason, setExtendReason] = useState('');

  const stats = useQuery({
    queryKey: ['admin', 'billing', 'stats'],
    queryFn: () => apiGet('/api/v1/admin/billing/stats', adminBillingStatsSchema),
  });
  const trials = useQuery({
    queryKey: ['admin', 'trials', trialStatus, search],
    queryFn: () =>
      apiGet(
        `/api/v1/admin/trials?page=1&pageSize=20${trialStatus ? `&status=${trialStatus}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        adminTrialListSchema,
      ),
  });
  const subscriptions = useQuery({
    queryKey: ['admin', 'subscriptions', subStatus, search],
    queryFn: () =>
      apiGet(
        `/api/v1/admin/subscriptions?page=1&pageSize=20${subStatus ? `&status=${subStatus}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        adminSubscriptionListSchema,
      ),
  });
  const events = useQuery({
    queryKey: ['admin', 'billing', 'events'],
    queryFn: () =>
      apiGet('/api/v1/admin/billing/events?page=1&pageSize=20', billingEventListSchema),
  });
  const extend = useMutation({
    mutationFn: () =>
      apiSend(`/api/v1/admin/users/${extendUserId}/extend-access`, billingTrialSchema, {
        days: Number(extendDays),
        reason: extendReason,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
  const activate = useMutation({
    mutationFn: (id: string) =>
      apiSend(`/api/v1/admin/subscriptions/${id}/activate`, billingSubscriptionSchema, {
        reason: 'Admin activation without payment capture',
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.billing.title')} subtitle={t('admin.billing.subtitle')} />
      <AdminState loading={stats.isLoading} error={stats.error}>
        {stats.data ? (
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminKpi
              label={t('admin.billing.trialsActive')}
              value={stats.data.trialsActive}
              tone="ok"
            />
            <AdminKpi
              label={t('admin.billing.trialsExpired')}
              value={stats.data.trialsExpired}
              tone="warn"
            />
            <AdminKpi
              label={t('admin.billing.subscriptionsActive')}
              value={stats.data.subscriptionsActive}
              tone="brand"
            />
            <AdminKpi
              label={t('admin.billing.conversion')}
              value={`${stats.data.conversionStartedToPaid}%`}
              tone="violet"
            />
            <AdminKpi
              label={t('admin.payments.title')}
              value={`${(stats.data.liveNetMinor / 100).toFixed(0)} MAD`}
              tone="teal"
            />
          </dl>
        ) : null}
      </AdminState>

      <div className="flex flex-wrap gap-3">
        <Input
          id="billing-search"
          label={t('common.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          id="trial-status"
          label={t('admin.billing.trialStatus')}
          value={trialStatus}
          onChange={(event) => setTrialStatus(event.target.value)}
        >
          <option value="">{t('common.all')}</option>
          <option value="NOT_STARTED">NOT_STARTED</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="EXPIRED">EXPIRED</option>
        </Select>
        <Select
          id="sub-status"
          label={t('admin.billing.subscriptionStatus')}
          value={subStatus}
          onChange={(event) => setSubStatus(event.target.value)}
        >
          <option value="">{t('common.all')}</option>
          {['PENDING', 'ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED'].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      <AdminPanel title={t('admin.billing.trials')}>
        <ul className="space-y-2 text-sm">
          {trials.data?.trials.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap justify-between gap-2 border-b border-line py-2"
            >
              <span>
                {row.displayName} · {row.email}
              </span>
              <span className="tabular-nums text-muted">
                {row.status}
                {row.expiresAt ? ` · ${new Date(row.expiresAt).toLocaleDateString()}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel title={t('admin.billing.subscriptions')}>
        <ul className="space-y-2 text-sm">
          {subscriptions.data?.subscriptions.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2"
            >
              <span>
                {row.displayName} · {row.planCode} · {row.status}
              </span>
              {row.status === 'PENDING' ? (
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  disabled={activate.isPending}
                  onClick={() => activate.mutate(row.id)}
                >
                  {t('admin.billing.activate')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel title={t('admin.billing.extend')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            id="extend-user"
            label={t('admin.billing.userId')}
            value={extendUserId}
            onChange={(event) => setExtendUserId(event.target.value)}
          />
          <Input
            id="extend-days"
            label={t('admin.billing.days')}
            value={extendDays}
            onChange={(event) => setExtendDays(event.target.value)}
          />
          <Input
            id="extend-reason"
            label={t('admin.billing.reason')}
            value={extendReason}
            onChange={(event) => setExtendReason(event.target.value)}
          />
        </div>
        <Button
          className="mt-3"
          disabled={extend.isPending || extendUserId.length < 8 || extendReason.length < 3}
          onClick={() => extend.mutate()}
        >
          {t('admin.billing.extendAction')}
        </Button>
      </AdminPanel>

      <AdminPanel title={t('admin.billing.history')}>
        <ul className="space-y-1 text-sm">
          {events.data?.events.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>{item.type}</span>
              <span className="text-muted">{new Date(item.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  );
}
