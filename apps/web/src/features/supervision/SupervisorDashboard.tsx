import { Link } from 'react-router-dom';
import { Avatar, Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { formatShortDay } from '../dashboard/labels';
import { QueryError } from '../objectives/components/QueryError';
import { useSupervisedTheses } from './hooks/use-supervised-theses';

export function SupervisorDashboard() {
  const t = useT();
  const supervised = useSupervisedTheses();
  const theses = supervised.data?.theses ?? [];

  if (supervised.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-16" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (supervised.isError) return <QueryError error={supervised.error} />;

  const subtitle =
    theses.length === 1
      ? t('supervision.dashboardSubtitleOne')
      : t('supervision.dashboardSubtitleMany', { count: theses.length });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{t('supervision.dashboardTitle')}</h1>
        <p className="text-sm text-muted">{subtitle}</p>
      </header>
      <ul className="grid gap-3">
        {theses.map((thesis) => {
          const student = thesis.doctoralStudent;
          const name = student
            ? `${student.givenName} ${student.familyName}`
            : t('supervision.studentUnset');
          const deliverableLabel =
            thesis.deliverableCount === 1
              ? t('supervision.deliverableCountOne')
              : t('supervision.deliverableCountMany', { count: thesis.deliverableCount });
          return (
            <li className="rounded-2xl border border-line bg-gradient-to-r from-brand-soft/80 via-surface to-surface p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-150 hover:border-[#d5deea] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]" key={thesis.thesisId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link
                  to={`/encadrement/${thesis.thesisId}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar label={name} imageUrl={student?.avatarUrl} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{name}</span>
                    <span className="block truncate text-sm text-muted">
                      {thesis.institution ?? student?.institution ?? t('supervision.universityUnset')}
                    </span>
                  </span>
                </Link>
                <Link
                  to={`/encadrement/${thesis.thesisId}`}
                  className="text-2xl font-semibold tabular-nums text-brand"
                >
                  {thesis.progressPercentage} %
                </Link>
              </div>
              <p className="mt-2 text-sm text-muted">
                {t('supervision.objectivesDone', {
                  done: thesis.objectiveSummary.completed,
                  total: thesis.objectiveSummary.total,
                })}
                {thesis.objectiveSummary.overdue > 0
                  ? ` ${t('supervision.overdueExtra', { count: thesis.objectiveSummary.overdue })}`
                  : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-ink">
                  {thesis.meetings[0]
                    ? t('supervision.meetingLine', {
                        title: thesis.meetings[0].title,
                        date: formatShortDay(thesis.meetings[0].scheduledOn),
                      })
                    : t('supervision.noMeeting')}
                </p>
                <Link
                  to={`/encadrement/${thesis.thesisId}/livrables`}
                  className="text-sm font-medium text-brand"
                >
                  {deliverableLabel}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
