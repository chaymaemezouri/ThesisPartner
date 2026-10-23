import { ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { AdminSparkline } from './AdminSparkline';
import { useAdminStats } from './hooks/use-admin';

export function AdminDashboardPage() {
  const t = useT();
  const stats = useAdminStats();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          {t('admin.dashboard.title')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('admin.dashboard.subtitle')}</p>
      </header>

      {stats.isLoading ? (
        <p role="status" className="text-sm text-muted">
          {t('common.loading')}
        </p>
      ) : stats.isError ? (
        <p role="alert" className="text-sm text-danger">
          {stats.error instanceof ApiClientError ? stats.error.body.message : t('errors.generic')}
        </p>
      ) : stats.data ? (
        <>
          <section aria-labelledby="admin-accounts-heading" className="space-y-3">
            <h2 id="admin-accounts-heading" className="text-sm font-semibold text-ink">
              {t('admin.dashboard.accountsHeading')}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ['totalUsers', stats.data.totalUsers],
                  ['activeAccounts', stats.data.activeAccounts],
                  ['suspendedAccounts', stats.data.suspendedAccounts],
                  ['doctoralStudents', stats.data.doctoralStudents],
                  ['supervisors', stats.data.supervisors],
                  ['activeTheses', stats.data.activeTheses],
                  ['theses', stats.data.theses],
                ] as const
              ).map(([key, value]) => (
                <Kpi key={key} label={t(`admin.dashboard.${key}`)} value={value} />
              ))}
            </dl>
          </section>

          <section aria-labelledby="admin-invitations-heading" className="space-y-3">
            <h2 id="admin-invitations-heading" className="text-sm font-semibold text-ink">
              {t('admin.dashboard.invitationsHeading')}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['invitationsPending', stats.data.invitationsPending],
                  ['invitationsAccepted', stats.data.invitationsAccepted],
                  ['invitationsRejected', stats.data.invitationsRejected],
                  ['invitationsExpired', stats.data.invitationsExpired],
                ] as const
              ).map(([key, value]) => (
                <Kpi key={key} label={t(`admin.dashboard.${key}`)} value={value} />
              ))}
            </dl>
          </section>

          <section aria-labelledby="admin-registrations-heading" className="space-y-3">
            <h2 id="admin-registrations-heading" className="text-sm font-semibold text-ink">
              {t('admin.dashboard.registrationsHeading')}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ['registrationsLast7Days', stats.data.registrationsLast7Days],
                  ['registrationsLast30Days', stats.data.registrationsLast30Days],
                  ['registrationsLast12Months', stats.data.registrationsLast12Months],
                ] as const
              ).map(([key, value]) => (
                <Kpi key={key} label={t(`admin.dashboard.${key}`)} value={value} />
              ))}
            </dl>
            <div className="rounded-md border border-line bg-surface px-4 py-4">
              <AdminSparkline
                points={stats.data.registrationsByDay}
                label={t('admin.dashboard.registrationsChart')}
                emptyLabel={t('admin.dashboard.chartEmpty')}
              />
            </div>
          </section>

          <section aria-labelledby="admin-health-heading" className="space-y-3">
            <h2 id="admin-health-heading" className="text-sm font-semibold text-ink">
              {t('admin.dashboard.healthHeading')}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                label={t('admin.dashboard.healthStatus')}
                value={
                  stats.data.health.status === 'ok'
                    ? t('admin.dashboard.healthOk')
                    : t('admin.dashboard.healthDegraded')
                }
              />
              <Kpi label={t('admin.dashboard.healthApi')} value={stats.data.health.checks.api} />
              <Kpi
                label={t('admin.dashboard.healthDatabase')}
                value={stats.data.health.checks.database}
              />
              <Kpi
                label={t('admin.dashboard.healthRedis')}
                value={stats.data.health.checks.redis}
              />
            </dl>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-4">
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
