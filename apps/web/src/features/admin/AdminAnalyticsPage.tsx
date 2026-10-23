import { ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { AdminSparkline } from './AdminSparkline';
import { useAdminAnalytics } from './hooks/use-admin';

export function AdminAnalyticsPage() {
  const t = useT();
  const analytics = useAdminAnalytics();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          {t('admin.analytics.title')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('admin.analytics.subtitle')}</p>
      </header>

      {analytics.isLoading ? (
        <p role="status" className="text-sm text-muted">
          {t('common.loading')}
        </p>
      ) : analytics.isError ? (
        <p role="alert" className="text-sm text-danger">
          {analytics.error instanceof ApiClientError
            ? analytics.error.body.message
            : t('errors.generic')}
        </p>
      ) : analytics.data ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['thesesWithoutSupervisor', analytics.data.thesesWithoutSupervisor],
                [
                  'pendingInvitationsOlderThan7Days',
                  analytics.data.pendingInvitationsOlderThan7Days,
                ],
                ['expiredInvitations', analytics.data.expiredInvitations],
                ['activeSessions', analytics.data.activeSessions],
                ['loginsLast30Days', analytics.data.loginsLast30Days],
                ['supervisorChangesLast30Days', analytics.data.supervisorChangesLast30Days],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="rounded-md border border-line bg-surface px-4 py-4">
                <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                  {t(`admin.analytics.${key}`)}
                </dt>
                <dd className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-line bg-surface px-4 py-4">
              <AdminSparkline
                points={analytics.data.registrationsByDay}
                label={t('admin.analytics.registrationsByDay')}
                emptyLabel={t('admin.dashboard.chartEmpty')}
              />
            </div>
            <div className="rounded-md border border-line bg-surface px-4 py-4">
              <AdminSparkline
                points={analytics.data.activityByDay}
                label={t('admin.analytics.activityByDay')}
                emptyLabel={t('admin.dashboard.chartEmpty')}
              />
            </div>
          </div>

          <div className="rounded-md border border-line bg-surface px-4 py-4">
            <AdminSparkline
              points={analytics.data.registrationsByMonth}
              label={t('admin.analytics.registrationsByMonth')}
              emptyLabel={t('admin.dashboard.chartEmpty')}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
