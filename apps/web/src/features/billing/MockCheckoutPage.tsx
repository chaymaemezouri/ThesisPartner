import { Button } from '@thesispartner/ui';
import { CreditCard, LockSimple, ShieldCheck } from '@phosphor-icons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { mockCheckoutSessionSchema, webhookAckSchema } from '@thesispartner/validation';
import { apiGet, apiSend } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { QueryError } from '../objectives/components/QueryError';

export function MockCheckoutPage() {
  const t = useT();
  const navigate = useNavigate();
  const { sessionId = '' } = useParams();
  const session = useQuery({
    queryKey: ['billing', 'mock', sessionId],
    queryFn: () => apiGet(`/api/v1/billing/mock/sessions/${sessionId}`, mockCheckoutSessionSchema),
  });
  const complete = useMutation({
    mutationFn: () =>
      apiSend(`/api/v1/billing/mock/sessions/${sessionId}/complete`, webhookAckSchema, { confirm: true }),
    onSuccess: () => {
      const id = session.data?.paymentId;
      navigate(id ? `/abonnement?payment=${id}` : '/abonnement');
    },
  });

  if (session.isLoading) {
    return <div className="mx-auto h-80 max-w-md animate-pulse rounded-2xl bg-surface" />;
  }
  if (session.isError) return <QueryError error={session.error} />;
  const data = session.data;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-md py-8">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_50px_rgb(20_20_30_/_0.08)]">
        <div className="bg-gradient-to-br from-brand to-brand-strong px-6 py-5 text-white">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
            <LockSimple size={12} weight="fill" />
            {t('billing.mockBanner')}
          </p>
          <p className="mt-5 text-sm text-white/80">{t('billing.mockAmount')}</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
            {(data.amountMinor / 100).toFixed(2)} <span className="text-lg font-medium">{data.currency}</span>
          </p>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div>
            <h1 className="text-lg font-semibold text-ink">{t('billing.mockTitle')}</h1>
            <p className="mt-1 text-sm leading-6 text-muted">{t('billing.mockHelp')}</p>
          </div>
          <div className="rounded-xl border border-dashed border-line bg-canvas px-4 py-3 text-sm">
            <p className="font-medium text-ink">
              {t('billing.mockPlan')}: {data.planCode.replaceAll('_', ' ')}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-muted">
              <CreditCard size={14} />
              {t('billing.mockNoCard')}
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-ok">
            <ShieldCheck size={14} weight="fill" />
            {t('billing.mockSecure')}
          </p>
          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={complete.isPending} onClick={() => complete.mutate()}>
              {t('billing.mockConfirm')}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/abonnement')}>
              {t('common.cancel')}
            </Button>
          </div>
          {complete.isError ? <p className="text-sm text-danger">{complete.error.message}</p> : null}
        </div>
      </section>
    </div>
  );
}
