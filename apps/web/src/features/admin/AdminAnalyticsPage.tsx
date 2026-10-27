import {
  Clock,
  EnvelopeSimple,
  SignIn,
  UsersThree,
  Warning,
  ArrowsLeftRight,
  ChartLine,
  Pulse,
} from '@phosphor-icons/react';
import { useT } from '../../i18n/LocaleContext';
import { AdminSparkline } from './AdminSparkline';
import {
  AdminKpi,
  AdminPageHeader,
  AdminPanel,
  AdminState,
  comparePeriod,
  lastNSum,
  shareOf,
} from './AdminUi';
import { useAdminAnalytics, useAdminStats } from './hooks/use-admin';

export function AdminAnalyticsPage() {
  const t = useT();
  const analytics = useAdminAnalytics();
  const stats = useAdminStats();
  const data = analytics.data;
  const platform = stats.data;
  const invitationTotal = platform
    ? platform.invitationsPending +
      platform.invitationsAccepted +
      platform.invitationsRejected +
      platform.invitationsExpired
    : 0;
  const registrationsLast30 = data ? lastNSum(data.registrationsByDay, 30) : 0;
  const activityLast30 = data ? lastNSum(data.activityByDay, 30) : 0;
  const registrationDelta30 = data ? comparePeriod(data.registrationsByDay, 30) : null;
  const activityDelta30 = data ? comparePeriod(data.activityByDay, 30) : null;
  const monthDelta = data ? comparePeriod(data.registrationsByMonth, 1) : null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t('admin.analytics.title')}
        subtitle={t('admin.analytics.subtitle')}
      />
      <AdminState loading={analytics.isLoading} error={analytics.error}>
        {data ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AdminKpi
                label={t('admin.analytics.thesesWithoutSupervisor')}
                value={data.thesesWithoutSupervisor}
                tone="warn"
                icon={<Warning size={16} />}
                share={
                  platform
                    ? shareOf(
                        data.thesesWithoutSupervisor,
                        platform.activeTheses,
                        t('admin.kpi.ofActiveTheses'),
                      )
                    : null
                }
              />
              <AdminKpi
                label={t('admin.analytics.pendingInvitationsOlderThan7Days')}
                value={data.pendingInvitationsOlderThan7Days}
                tone="danger"
                icon={<Clock size={16} />}
                share={
                  platform
                    ? shareOf(
                        data.pendingInvitationsOlderThan7Days,
                        platform.invitationsPending,
                        t('admin.kpi.ofPending'),
                      )
                    : null
                }
              />
              <AdminKpi
                label={t('admin.analytics.expiredInvitations')}
                value={data.expiredInvitations}
                tone="muted"
                icon={<EnvelopeSimple size={16} />}
                share={shareOf(
                  data.expiredInvitations,
                  invitationTotal,
                  t('admin.kpi.ofInvitations'),
                )}
              />
              <AdminKpi
                label={t('admin.analytics.activeSessions')}
                value={data.activeSessions}
                tone="teal"
                icon={<UsersThree size={16} />}
                share={
                  platform
                    ? shareOf(
                        data.activeSessions,
                        platform.activeAccounts,
                        t('admin.kpi.ofActiveAccounts'),
                      )
                    : null
                }
              />
              <AdminKpi
                label={t('admin.analytics.loginsLast30Days')}
                value={data.loginsLast30Days}
                tone="brand"
                icon={<SignIn size={16} />}
                share={shareOf(data.loginsLast30Days, activityLast30, t('admin.kpi.ofActivity'))}
              />
              <AdminKpi
                label={t('admin.analytics.supervisorChangesLast30Days')}
                value={data.supervisorChangesLast30Days}
                tone="violet"
                icon={<ArrowsLeftRight size={16} />}
              />
              <AdminKpi
                label={t('admin.dashboard.registrationsLast30Days')}
                value={registrationsLast30}
                tone="brand"
                icon={<ChartLine size={16} />}
                trend={data.registrationsByDay.slice(-30)}
                delta={
                  registrationDelta30
                    ? { ...registrationDelta30, label: t('admin.kpi.vsPrev30') }
                    : null
                }
              />
              <AdminKpi
                label={t('admin.analytics.activityLast30Days')}
                value={activityLast30}
                tone="teal"
                icon={<Pulse size={16} />}
                trend={data.activityByDay.slice(-30)}
                delta={
                  activityDelta30 ? { ...activityDelta30, label: t('admin.kpi.vsPrev30') } : null
                }
              />
            </dl>

            <div className="grid gap-4 lg:grid-cols-2">
              <AdminPanel>
                <AdminSparkline
                  points={data.registrationsByDay}
                  label={t('admin.analytics.registrationsByDay')}
                  emptyLabel={t('admin.dashboard.chartEmpty')}
                  tone="brand"
                />
              </AdminPanel>
              <AdminPanel>
                <AdminSparkline
                  points={data.activityByDay}
                  label={t('admin.analytics.activityByDay')}
                  emptyLabel={t('admin.dashboard.chartEmpty')}
                  tone="teal"
                />
              </AdminPanel>
            </div>

            <AdminPanel>
              <AdminSparkline
                points={data.registrationsByMonth}
                label={t('admin.analytics.registrationsByMonth')}
                emptyLabel={t('admin.dashboard.chartEmpty')}
                tone="violet"
              />
              {monthDelta ? (
                <p className="mt-2 text-xs tabular-nums text-muted">
                  {monthDelta.absolute > 0 ? '▲ +' : monthDelta.absolute < 0 ? '▼ ' : '= '}
                  {Math.abs(monthDelta.absolute).toLocaleString()} {t('admin.kpi.vsPrevMonth')}
                </p>
              ) : null}
            </AdminPanel>
          </>
        ) : null}
      </AdminState>
    </div>
  );
}
