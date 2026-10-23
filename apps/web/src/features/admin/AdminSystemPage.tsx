import { ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { useAdminSystem } from './hooks/use-admin';

export function AdminSystemPage() {
  const t = useT();
  const system = useAdminSystem();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('admin.system.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('admin.system.subtitle')}</p>
      </header>

      {system.isLoading ? (
        <p role="status" className="text-sm text-muted">
          {t('common.loading')}
        </p>
      ) : system.isError ? (
        <p role="alert" className="text-sm text-danger">
          {system.error instanceof ApiClientError ? system.error.body.message : t('errors.generic')}
        </p>
      ) : system.data ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi
              label={t('admin.dashboard.healthStatus')}
              value={
                system.data.health.status === 'ok'
                  ? t('admin.dashboard.healthOk')
                  : t('admin.dashboard.healthDegraded')
              }
            />
            <Kpi label={t('admin.dashboard.healthApi')} value={system.data.health.checks.api} />
            <Kpi
              label={t('admin.dashboard.healthDatabase')}
              value={system.data.health.checks.database}
            />
            <Kpi label={t('admin.dashboard.healthRedis')} value={system.data.health.checks.redis} />
            <Kpi label={t('admin.system.nodeEnv')} value={system.data.nodeEnv} />
            <Kpi
              label={t('admin.system.checkedAt')}
              value={new Date(system.data.checkedAt).toLocaleString()}
            />
            <Kpi label={t('admin.system.activeSessions')} value={system.data.activeSessions} />
            <Kpi
              label={t('admin.system.auditEventsLast24Hours')}
              value={system.data.auditEventsLast24Hours}
            />
            <Kpi
              label={t('admin.system.failedLoginsLast24Hours')}
              value={system.data.failedLoginsLast24Hours}
            />
            <Kpi
              label={t('admin.system.invitationsPending')}
              value={system.data.invitationsPending}
            />
          </dl>
          <p className="text-xs text-muted">{t('admin.system.privacyNote')}</p>
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
