import { useState } from 'react';
import { Button, Input } from '@thesispartner/ui';
import {
  adminBillingSettingsSchema,
  billingPlanSchema,
  billingPlansSchema,
} from '@thesispartner/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { AdminPageHeader, AdminPanel, AdminState } from './AdminUi';

export function AdminPlansPage() {
  const t = useT();
  const client = useQueryClient();
  const [trialDays, setTrialDays] = useState('30');
  const [graceDays, setGraceDays] = useState('7');
  const [prices, setPrices] = useState<Record<string, string>>({});

  const settings = useQuery({
    queryKey: ['admin', 'billing', 'settings'],
    queryFn: async () => {
      const row = await apiGet('/api/v1/admin/billing/settings', adminBillingSettingsSchema);
      setTrialDays(String(row.trialDays));
      setGraceDays(String(row.graceDays));
      return row;
    },
  });
  const plans = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: async () => {
      const row = await apiGet('/api/v1/admin/plans', billingPlansSchema);
      setPrices(Object.fromEntries(row.plans.map((plan) => [plan.id, String(plan.priceMad)])));
      return row;
    },
  });
  const saveSettings = useMutation({
    mutationFn: () =>
      apiSend('/api/v1/admin/billing/settings', adminBillingSettingsSchema, {
        trialDays: Number(trialDays),
        graceDays: Number(graceDays),
      }, 'PATCH'),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'billing'] }),
  });
  const savePlan = useMutation({
    mutationFn: (planId: string) =>
      apiSend(`/api/v1/admin/plans/${planId}`, billingPlanSchema, {
        priceMad: Number(prices[planId] ?? 0),
      }, 'PATCH'),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'plans'] }),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.plans.title')} subtitle={t('admin.plans.subtitle')} />
      <AdminState loading={settings.isLoading} error={settings.error}>
        <AdminPanel title={t('admin.plans.windows')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="trial-days"
              label={t('admin.plans.trialDays')}
              value={trialDays}
              onChange={(event) => setTrialDays(event.target.value)}
            />
            <Input
              id="grace-days"
              label={t('admin.plans.graceDays')}
              value={graceDays}
              onChange={(event) => setGraceDays(event.target.value)}
            />
          </div>
          <Button className="mt-3" disabled={saveSettings.isPending} onClick={() => saveSettings.mutate()}>
            {t('common.save')}
          </Button>
        </AdminPanel>
      </AdminState>
      <AdminPanel title={t('admin.plans.catalog')}>
        <ul className="space-y-4">
          {plans.data?.plans.map((plan) => (
            <li key={plan.id} className="flex flex-wrap items-end gap-3 border-b border-line pb-3">
              <div className="min-w-40 flex-1">
                <p className="text-sm font-semibold">{plan.name}</p>
                <p className="text-xs text-muted">{plan.code}</p>
              </div>
              <Input
                id={`price-${plan.id}`}
                label={t('admin.plans.priceMad')}
                value={prices[plan.id] ?? String(plan.priceMad)}
                onChange={(event) =>
                  setPrices((current) => ({ ...current, [plan.id]: event.target.value }))
                }
              />
              <Button
                variant="secondary"
                disabled={savePlan.isPending}
                onClick={() => savePlan.mutate(plan.id)}
              >
                {t('common.save')}
              </Button>
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  );
}
