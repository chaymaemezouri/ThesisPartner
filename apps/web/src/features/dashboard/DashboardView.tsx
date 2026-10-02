import { Skeleton } from '@thesispartner/ui';
import { formErrorMessage } from '../../forms/api-errors';
import { useT } from '../../i18n/LocaleContext';
import { AcademicProfileHeader } from './components/AcademicProfileHeader';
import { ThesisProgressSummary } from './components/ThesisProgressSummary';
import { UpcomingDeadlines } from './components/UpcomingDeadlines';
import { useDashboard } from './hooks/use-dashboard';

export function DashboardView() {
  const t = useT();
  const dashboard = useDashboard();

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
        <p className="text-sm text-muted">{t('dashboard.greetingSubtitle')}</p>
      </header>
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
