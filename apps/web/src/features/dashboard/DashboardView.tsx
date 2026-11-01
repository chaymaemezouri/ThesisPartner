import { Skeleton } from '@thesispartner/ui';
import { Link } from 'react-router-dom';
import { formErrorMessage } from '../../forms/api-errors';
import { useT } from '../../i18n/LocaleContext';
import { useBillingStatus } from '../billing/hooks/use-billing';
import { AcademicProfileHeader } from './components/AcademicProfileHeader';
import { ThesisProgressSummary } from './components/ThesisProgressSummary';
import { UpcomingDeadlines } from './components/UpcomingDeadlines';
import { useDashboard } from './hooks/use-dashboard';

export function DashboardView() {
  const t = useT();
  const dashboard = useDashboard();
  const billing = useBillingStatus();

  if (dashboard.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <p className="text-sm text-danger" role="alert">
        {formErrorMessage(dashboard.error, t)}
      </p>
    );
  }

  const data = dashboard.data;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:gap-5">
      <header>
        <h1 className="text-xl font-semibold leading-tight tracking-tight text-ink">
          {t('dashboard.greeting', { name: data.profile.givenName })}
        </h1>
      </header>
      {billing.data?.trial.status === 'EXPIRED' && !billing.data.coverage.writable ? (
        <p className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-sm">
          {t('billing.trialEnded')}{' '}
          <Link to="/abonnement" className="font-semibold text-brand hover:underline">
            {t('billing.plansTitle')}
          </Link>
        </p>
      ) : billing.data?.trial.reminders.length ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm">
          {billing.data.trial.reminders.includes('J-1')
            ? t('billing.reminder.J-1')
            : billing.data.trial.reminders.includes('J-3')
              ? t('billing.reminder.J-3')
              : t('billing.reminder.J-7')}{' '}
          <Link to="/abonnement" className="font-semibold text-brand hover:underline">
            {t('nav.billing')}
          </Link>
        </p>
      ) : null}
      <AcademicProfileHeader profile={data.profile} />
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-5">
        <div className="min-h-0 lg:h-full">
          <ThesisProgressSummary
            thesis={data.thesis}
            progress={data.progress}
            workProgress={data.workProgress}
            objectives={data.objectives}
            deliverables={data.deliverables}
          />
        </div>
        <div className="min-h-0 lg:h-full">
          <UpcomingDeadlines deadlines={data.upcomingDeadlines} />
        </div>
      </div>
    </div>
  );
}
