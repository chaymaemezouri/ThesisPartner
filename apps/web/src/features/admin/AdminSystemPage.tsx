import {
  Archive,
  CheckCircle,
  Database,
  HardDrives,
  Pulse,
  SignIn,
  UsersThree,
  Warning,
} from '@phosphor-icons/react';
import { useT } from '../../i18n/LocaleContext';
import { AdminBadge, AdminKpi, AdminPageHeader, AdminPanel, AdminState, shareOf } from './AdminUi';
import { useAdminSystem } from './hooks/use-admin';

export function AdminSystemPage() {
  const t = useT();
  const system = useAdminSystem();
  const healthy = system.data?.health.status === 'ok';

  return (
    <div className="space-y-8">
      <AdminPageHeader title={t('admin.system.title')} subtitle={t('admin.system.subtitle')} />
      <AdminState loading={system.isLoading} error={system.error}>
        {system.data ? (
          <>
            <AdminPanel>
              <div
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-5 ${healthy ? 'bg-ok-soft' : 'bg-danger-soft'}`}
              >
                <div className="flex items-center gap-4">
                  {healthy ? (
                    <CheckCircle size={36} className="text-ok" />
                  ) : (
                    <Warning size={36} className="text-danger" />
                  )}
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      {healthy
                        ? t('admin.dashboard.healthOk')
                        : t('admin.dashboard.healthDegraded')}
                    </p>
                    <p className="text-sm text-muted">
                      {t('admin.system.checkedAt')} ·{' '}
                      {new Date(system.data.checkedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <AdminBadge tone={healthy ? 'ok' : 'danger'}>{system.data.nodeEnv}</AdminBadge>
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ['healthApi', system.data.health.checks.api, Pulse],
                    ['healthDatabase', system.data.health.checks.database, Database],
                    ['healthRedis', system.data.health.checks.redis, HardDrives],
                    ['healthStorage', system.data.health.checks.storage, Archive],
                  ] as const
                ).map(([key, value, Icon]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-line px-3 py-3"
                  >
                    <span className="flex items-center gap-2 text-sm text-ink">
                      <Icon size={16} className="text-muted" />
                      {t(`admin.dashboard.${key}`)}
                    </span>
                    <AdminBadge tone={value === 'ok' ? 'ok' : 'danger'}>{value}</AdminBadge>
                  </li>
                ))}
              </ul>
            </AdminPanel>

            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AdminKpi
                label={t('admin.system.activeSessions')}
                value={system.data.activeSessions}
                tone="teal"
                icon={<UsersThree size={16} />}
              />
              <AdminKpi
                label={t('admin.system.auditEventsLast24Hours')}
                value={system.data.auditEventsLast24Hours}
                tone="brand"
                icon={<Pulse size={16} />}
              />
              <AdminKpi
                label={t('admin.system.failedLoginsLast24Hours')}
                value={system.data.failedLoginsLast24Hours}
                tone={system.data.failedLoginsLast24Hours > 0 ? 'danger' : 'ok'}
                icon={<SignIn size={16} />}
                share={shareOf(
                  system.data.failedLoginsLast24Hours,
                  system.data.auditEventsLast24Hours,
                  t('admin.kpi.ofAudit'),
                )}
              />
              <AdminKpi
                label={t('admin.system.invitationsPending')}
                value={system.data.invitationsPending}
                tone={system.data.invitationsPending > 0 ? 'warn' : 'muted'}
              />
            </dl>
            <p className="text-xs text-muted">{t('admin.system.privacyNote')}</p>
          </>
        ) : null}
      </AdminState>
    </div>
  );
}
