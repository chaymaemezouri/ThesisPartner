import { Button } from '@thesispartner/ui';
import {
  Check,
  CreditCard,
  DownloadSimple,
  Receipt,
  Sparkle,
  ClockCountdown,
} from '@phosphor-icons/react';
import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n/LocaleContext';
import { useMeQuery, useRequestEmailVerification } from '../../hooks/use-session';
import { QueryError } from '../objectives/components/QueryError';
import {
  downloadInvoice,
  useBillingEvents,
  useBillingInvoices,
  useBillingPayments,
  useBillingStatus,
  useCancelSubscription,
  useCheckout,
  usePayment,
  useStartTrial,
} from './hooks/use-billing';

export function BillingPage() {
  const t = useT();
  const [params] = useSearchParams();
  const paymentId = params.get('payment');
  const status = useBillingStatus();
  const me = useMeQuery();
  const resendVerification = useRequestEmailVerification();
  const events = useBillingEvents();
  const payments = useBillingPayments();
  const invoices = useBillingInvoices();
  const polled = usePayment(paymentId);
  const start = useStartTrial();
  const checkout = useCheckout();
  const cancel = useCancelSubscription();
  const needsEmailVerify = me.isSuccess && me.data.user.emailVerified === false;

  const data = status.data;
  const supervisorOnly = data?.roleHint === 'SUPERVISOR';
  const trial = data?.trial;
  const sub = data?.subscription;
  const expired = trial?.status === 'EXPIRED' && !data?.coverage.writable;
  const checkoutReady = Boolean(sub?.paymentProviderReady);
  const plans = data?.plans.filter((plan) => plan.active) ?? [];
  const monthly = plans.find((plan) => plan.interval === 'MONTH');
  const yearlySave =
    monthly && plans.find((plan) => plan.interval === 'YEAR')
      ? Math.max(
          0,
          Math.round(
            (1 -
              plans.find((plan) => plan.interval === 'YEAR')!.priceMad / (monthly.priceMad * 12)) *
              100,
          ),
        )
      : 0;

  const confirmation = useMemo(() => {
    if (!paymentId || !polled.data) return null;
    if (polled.data.status === 'SUCCEEDED') return 'succeeded';
    if (polled.data.status === 'FAILED' || polled.data.status === 'CANCELLED') return 'failed';
    if (polled.data.status === 'PENDING' || polled.data.status === 'PROCESSING') return 'pending';
    return null;
  }, [paymentId, polled.data]);

  if (status.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-28 animate-pulse rounded-2xl bg-brand-soft/60" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl bg-surface" />
          <div className="h-72 animate-pulse rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }
  if (status.isError) return <QueryError error={status.error} />;
  if (!data || !trial || !sub) return null;

  const features = [
    t('billing.featureWorkspace'),
    t('billing.featureSupervisor'),
    t('billing.featureInvoice'),
    t('billing.featureThesis'),
  ];

  return (
    <div className="space-y-8 pb-8">
      <header className="relative overflow-hidden rounded-2xl border border-brand/15 bg-gradient-to-br from-brand-soft via-surface to-violet-soft px-6 py-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-2xl" />
        <p className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-surface/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          <Sparkle size={12} weight="fill" />
          Thesis Flow Pro
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {t('billing.title')}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{t('billing.subtitle')}</p>
      </header>

      {supervisorOnly ? (
        <section className="rounded-2xl border border-line bg-surface px-5 py-5 shadow-card">
          <p className="text-sm leading-6 text-muted">{t('billing.supervisorNote')}</p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                  {t('billing.trialTitle')}
                </p>
                <p className="mt-2 text-sm text-muted">{t('billing.trialHelp')}</p>
                {trial.status === 'NOT_STARTED' && needsEmailVerify ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-sm text-warn">{t('billing.verifyEmailFirst')}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={resendVerification.isPending}
                      onClick={() => resendVerification.mutate()}
                    >
                      {t('billing.resendVerification')}
                    </Button>
                    {resendVerification.isSuccess ? (
                      <p className="text-sm text-ok" role="status">
                        {t('settings.resendVerificationSent')}
                      </p>
                    ) : null}
                    {resendVerification.isError ? (
                      <p className="text-sm text-danger" role="alert">
                        {t('settings.resendVerificationFailed')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {trial.status === 'NOT_STARTED' && !needsEmailVerify ? (
                  <Button
                    className="mt-5"
                    disabled={!trial.canStart || start.isPending || me.isLoading}
                    onClick={() => start.mutate()}
                  >
                    {t('billing.startTrial')}
                  </Button>
                ) : null}
                {trial.status === 'ACTIVE' ? (
                  <p className="mt-4 text-sm text-muted">
                    {t('billing.expiresOn', { date: formatStamp(trial.expiresAt) })}
                  </p>
                ) : null}
                {expired ? (
                  <div className="mt-4 rounded-xl border border-warn/20 bg-warn-soft px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{t('billing.trialEnded')}</p>
                    <p className="mt-1 text-sm text-muted">{t('billing.readonlyHelp')}</p>
                  </div>
                ) : null}
                {start.isError ? (
                  <p className="mt-3 text-sm text-danger">{start.error.message}</p>
                ) : null}
              </div>
              {trial.status === 'ACTIVE' ? (
                <TrialRing
                  days={trial.daysRemaining ?? 0}
                  percent={trial.progressPercent ?? 0}
                  unit={t('billing.dayUnit')}
                />
              ) : (
                <span className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <ClockCountdown size={32} weight="duotone" />
                </span>
              )}
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-ink">
                  {t('billing.plansTitle')}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-muted">{t('billing.plansIntro')}</p>
              </div>
              {!checkoutReady ? (
                <p className="rounded-full bg-warn-soft px-3 py-1 text-xs font-medium text-warn">
                  {t('billing.noProvider')}
                </p>
              ) : null}
            </div>
            <ul className="grid gap-4 lg:grid-cols-2">
              {plans.map((plan) => {
                const yearly = plan.interval === 'YEAR';
                const current = sub.planCode === plan.code;
                const monthlyEquiv = yearly ? Math.round(plan.priceMad / 12) : null;
                return (
                  <li
                    key={plan.id}
                    className={
                      yearly
                        ? 'relative flex flex-col rounded-2xl border-2 border-brand bg-surface p-6 shadow-[0_12px_40px_rgb(36_99_197_/_0.12)]'
                        : 'relative flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-card'
                    }
                  >
                    {yearly ? (
                      <span className="absolute -top-3 right-5 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                        {t('billing.popular')}
                      </span>
                    ) : null}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{plan.name}</p>
                      {current ? (
                        <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok">
                          {t('billing.currentPlan')}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-4 flex items-end gap-1.5">
                      <span className="text-4xl font-semibold tabular-nums tracking-tight text-ink">
                        {plan.priceMad}
                      </span>
                      <span className="mb-1 text-sm font-medium text-muted">MAD</span>
                    </p>
                    <p className="text-sm text-muted">
                      {yearly ? t('billing.billedYearly') : t('billing.perMonth')}
                      {monthlyEquiv
                        ? ` · ${t('billing.equivMonth', { amount: String(monthlyEquiv) })}`
                        : ''}
                    </p>
                    {yearly && yearlySave > 0 ? (
                      <p className="mt-2 inline-flex w-fit rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">
                        {t('billing.saveYear', { percent: String(yearlySave) })}
                      </p>
                    ) : null}
                    <ul className="mt-5 space-y-2.5 text-sm text-ink">
                      {features.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <Check className="mt-0.5 shrink-0 text-brand" size={16} weight="bold" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-6 w-full"
                      variant={yearly ? 'primary' : 'secondary'}
                      disabled={checkout.isPending || !checkoutReady || sub.status === 'PENDING'}
                      onClick={async () => {
                        const result = await checkout.mutateAsync(plan.code);
                        if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
                      }}
                    >
                      <CreditCard size={16} weight="bold" />
                      {sub.status === 'ACTIVE' ? t('billing.renew') : t('billing.payCard')}
                    </Button>
                  </li>
                );
              })}
            </ul>

            {(sub.status || confirmation) && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-sm shadow-card">
                {sub.status ? (
                  <StatusPill tone={subTone(sub.status)}>
                    {t('billing.subscriptionState', { status: sub.status })}
                    {sub.cancelAtPeriodEnd ? ` · ${t('billing.cancelsAtEnd')}` : ''}
                  </StatusPill>
                ) : null}
                {sub.currentPeriodEnd ? (
                  <span className="text-muted">
                    {t('billing.nextRenewal', { date: formatStamp(sub.currentPeriodEnd) })}
                  </span>
                ) : null}
                {confirmation === 'pending' ? (
                  <span className="text-muted">{t('billing.paymentPending')}</span>
                ) : null}
                {confirmation === 'failed' ? (
                  <span className="text-danger">{t('billing.paymentFailed')}</span>
                ) : null}
                {confirmation === 'succeeded' ? (
                  <span className="text-ok">{t('billing.paymentSucceeded')}</span>
                ) : null}
                {sub.status === 'ACTIVE' && !sub.cancelAtPeriodEnd ? (
                  <Button
                    className="ml-auto"
                    variant="ghost"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate()}
                  >
                    {t('billing.cancelAtEnd')}
                  </Button>
                ) : null}
              </div>
            )}
            {checkout.isError ? (
              <p className="mt-3 text-sm text-danger">{checkout.error.message}</p>
            ) : null}
          </section>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <LedgerCard
          icon={<CreditCard size={18} weight="duotone" />}
          title={t('billing.payments')}
          empty={t('billing.paymentsEmpty')}
        >
          {payments.data?.payments.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium tabular-nums text-ink">
                  {formatMad(item.amountMinor)} MAD
                </p>
                <p className="mt-0.5 text-xs text-muted">{formatStamp(item.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                {item.environment === 'TEST' ? (
                  <span className="rounded-full bg-violet-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet">
                    {t('billing.testMode')}
                  </span>
                ) : null}
                <StatusPill tone={payTone(item.status)}>{item.status}</StatusPill>
              </div>
            </li>
          ))}
        </LedgerCard>

        <LedgerCard
          icon={<Receipt size={18} weight="duotone" />}
          title={t('billing.invoices')}
          empty={t('billing.invoicesEmpty')}
        >
          {invoices.data?.invoices.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-ink">{item.invoiceNumber}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatMad(item.totalMinor)} MAD
                  {item.specimen ? ` · ${t('billing.specimen')}` : ''}
                </p>
              </div>
              {item.downloadable ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand hover:bg-brand-soft"
                  onClick={() => void downloadInvoice(item.id)}
                >
                  <DownloadSimple size={16} />
                  {t('billing.download')}
                </button>
              ) : null}
            </li>
          ))}
        </LedgerCard>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">{t('billing.history')}</h2>
        {events.data?.events.length ? (
          <ol className="mt-4 space-y-0">
            {events.data.events.map((item, index) => (
              <li key={item.id} className="flex gap-3">
                <span className="flex w-4 flex-col items-center">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-brand" />
                  {index < events.data.events.length - 1 ? (
                    <span className="w-px flex-1 bg-line" />
                  ) : null}
                </span>
                <div className="flex flex-1 justify-between gap-3 pb-4 text-sm">
                  <span className="text-ink">{item.type}</span>
                  <span className="shrink-0 text-muted">{formatStamp(item.createdAt)}</span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted">{t('billing.historyEmpty')}</p>
        )}
      </section>
    </div>
  );
}

function TrialRing({ days, percent, unit }: { days: number; percent: number; unit: string }) {
  const remaining = Math.max(0, Math.min(100, 100 - percent));
  return (
    <div
      className="grid h-[6.5rem] w-[6.5rem] shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--color-brand) ${remaining}%, var(--color-line) 0)`,
      }}
      aria-hidden="true"
    >
      <div className="grid h-[5.15rem] w-[5.15rem] place-items-center rounded-full bg-surface text-center">
        <span className="text-2xl font-semibold tabular-nums leading-none text-ink">{days}</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          {unit}
        </span>
      </div>
    </div>
  );
}

function LedgerCard({
  icon,
  title,
  empty,
  children,
}: {
  icon: ReactNode;
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : children ? [children] : [];
  const hasItems = items.filter(Boolean).length > 0;
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      {hasItems ? (
        <ul className="mt-2 divide-y divide-line">{children}</ul>
      ) : (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'ok' | 'warn' | 'danger' | 'muted';
}) {
  const styles = {
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    muted: 'bg-canvas text-muted',
  }[tone];
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles}`}
    >
      {children}
    </span>
  );
}

function subTone(status: string): 'ok' | 'warn' | 'danger' | 'muted' {
  if (status === 'ACTIVE') return 'ok';
  if (status === 'PENDING' || status === 'GRACE_PERIOD' || status === 'PAST_DUE') return 'warn';
  if (status === 'EXPIRED' || status === 'CANCELLED') return 'danger';
  return 'muted';
}

function payTone(status: string): 'ok' | 'warn' | 'danger' | 'muted' {
  if (status === 'SUCCEEDED') return 'ok';
  if (status === 'PENDING' || status === 'PROCESSING') return 'warn';
  if (status === 'FAILED' || status === 'CANCELLED') return 'danger';
  return 'muted';
}

function formatStamp(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatMad(amountMinor: number) {
  return (amountMinor / 100).toFixed(2);
}
