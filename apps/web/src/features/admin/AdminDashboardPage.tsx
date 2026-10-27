import {
  CheckCircle,
  GraduationCap,
  Prohibit,
  Scroll,
  Users,
  UserCircle,
  EnvelopeSimple,
  Pulse,
} from '@phosphor-icons/react';
import type { z } from 'zod';
import type { adminStatsSchema } from '@thesispartner/validation';
import { useT } from '../../i18n/LocaleContext';
import { AdminSparkline } from './AdminSparkline';
import {
  AdminKpi,
  AdminPageHeader,
  AdminPanel,
  AdminState,
  AdminBadge,
  comparePeriod,
  shareOf,
} from './AdminUi';
import { useAdminStats } from './hooks/use-admin';

type AdminStats = z.infer<typeof adminStatsSchema>;

export function AdminDashboardPage() {
  const t = useT();
  const stats = useAdminStats();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t('admin.dashboard.title')}
        subtitle={t('admin.dashboard.subtitle')}
      />
      <AdminState loading={stats.isLoading} error={stats.error}>
        {stats.data ? <AdminDashboardBody data={stats.data} /> : null}
      </AdminState>
    </div>
  );
}

function AdminDashboardBody({ data }: { data: AdminStats }) {
  const t = useT();
  const invitationTotal =
    data.invitationsPending +
    data.invitationsAccepted +
    data.invitationsRejected +
    data.invitationsExpired;
  const delta7 = comparePeriod(data.registrationsByDay, 7);
  const delta30 = comparePeriod(data.registrationsByDay, 30);
  const registrationsTrend30 = data.registrationsByDay.slice(-30);
  const ofUsers = t('admin.kpi.ofUsers');
  const ofTheses = t('admin.kpi.ofTheses');
  const ofInvitations = t('admin.kpi.ofInvitations');

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">{t('admin.dashboard.accountsHeading')}</h2>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpi
            label={t('admin.dashboard.totalUsers')}
            value={data.totalUsers}
            tone="brand"
            icon={<Users size={16} />}
          />
          <AdminKpi
            label={t('admin.dashboard.activeAccounts')}
            value={data.activeAccounts}
            tone="ok"
            icon={<CheckCircle size={16} />}
            share={shareOf(data.activeAccounts, data.totalUsers, ofUsers)}
          />
          <AdminKpi
            label={t('admin.dashboard.suspendedAccounts')}
            value={data.suspendedAccounts}
            tone="danger"
            icon={<Prohibit size={16} />}
            share={shareOf(data.suspendedAccounts, data.totalUsers, ofUsers)}
          />
          <AdminKpi
            label={t('admin.dashboard.doctoralStudents')}
            value={data.doctoralStudents}
            tone="teal"
            icon={<GraduationCap size={16} />}
            share={
              data.doctoralStudents <= data.totalUsers
                ? shareOf(data.doctoralStudents, data.totalUsers, ofUsers)
                : null
            }
          />
          <AdminKpi
            label={t('admin.dashboard.supervisors')}
            value={data.supervisors}
            tone="violet"
            icon={<UserCircle size={16} />}
            share={
              data.supervisors <= data.totalUsers
                ? shareOf(data.supervisors, data.totalUsers, ofUsers)
                : null
            }
          />
          <AdminKpi
            label={t('admin.dashboard.activeTheses')}
            value={data.activeTheses}
            tone="brand"
            icon={<Scroll size={16} />}
            share={shareOf(data.activeTheses, data.theses, ofTheses)}
          />
          <AdminKpi
            label={t('admin.dashboard.theses')}
            value={data.theses}
            tone="muted"
            icon={<Scroll size={16} />}
            share={shareOf(
              data.theses - data.activeTheses,
              data.theses,
              t('admin.kpi.ofInactiveTheses'),
            )}
          />
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">
          {t('admin.dashboard.invitationsHeading')}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminKpi
            label={t('admin.dashboard.invitationsPending')}
            value={data.invitationsPending}
            tone="warn"
            icon={<EnvelopeSimple size={16} />}
            share={shareOf(data.invitationsPending, invitationTotal, ofInvitations)}
          />
          <AdminKpi
            label={t('admin.dashboard.invitationsAccepted')}
            value={data.invitationsAccepted}
            tone="ok"
            icon={<CheckCircle size={16} />}
            share={shareOf(data.invitationsAccepted, invitationTotal, ofInvitations)}
          />
          <AdminKpi
            label={t('admin.dashboard.invitationsRejected')}
            value={data.invitationsRejected}
            tone="danger"
            icon={<Prohibit size={16} />}
            share={shareOf(data.invitationsRejected, invitationTotal, ofInvitations)}
          />
          <AdminKpi
            label={t('admin.dashboard.invitationsExpired')}
            value={data.invitationsExpired}
            tone="muted"
            icon={<EnvelopeSimple size={16} />}
            share={shareOf(data.invitationsExpired, invitationTotal, ofInvitations)}
          />
        </dl>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <AdminPanel title={t('admin.dashboard.registrationsHeading')}>
          <dl className="mb-5 grid gap-3 sm:grid-cols-3">
            <AdminKpi
              label={t('admin.dashboard.registrationsLast7Days')}
              value={data.registrationsLast7Days}
              tone="brand"
              trend={data.registrationsByDay.slice(-7)}
              delta={delta7 ? { ...delta7, label: t('admin.kpi.vsPrev7') } : null}
            />
            <AdminKpi
              label={t('admin.dashboard.registrationsLast30Days')}
              value={data.registrationsLast30Days}
              tone="teal"
              trend={registrationsTrend30}
              delta={delta30 ? { ...delta30, label: t('admin.kpi.vsPrev30') } : null}
              share={shareOf(
                data.registrationsLast7Days,
                data.registrationsLast30Days,
                t('admin.kpi.ofLast30'),
              )}
            />
            <AdminKpi
              label={t('admin.dashboard.registrationsLast12Months')}
              value={data.registrationsLast12Months}
              tone="violet"
              share={shareOf(
                data.registrationsLast30Days,
                data.registrationsLast12Months,
                t('admin.kpi.ofLast12m'),
              )}
            />
          </dl>
          <AdminSparkline
            points={registrationsTrend30}
            label={t('admin.dashboard.registrationsChart')}
            emptyLabel={t('admin.dashboard.chartEmpty')}
            tone="brand"
          />
        </AdminPanel>

        <AdminPanel title={t('admin.dashboard.healthHeading')}>
          <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
            <div className="flex items-center gap-3">
              <Pulse
                size={22}
                className={data.health.status === 'ok' ? 'text-ok' : 'text-danger'}
              />
              <div>
                <p className="text-sm font-semibold text-ink">
                  {t('admin.dashboard.healthStatus')}
                </p>
                <p className="text-xs text-muted">{t('admin.dashboard.healthHeading')}</p>
              </div>
            </div>
            <AdminBadge tone={data.health.status === 'ok' ? 'ok' : 'danger'}>
              {data.health.status === 'ok'
                ? t('admin.dashboard.healthOk')
                : t('admin.dashboard.healthDegraded')}
            </AdminBadge>
          </div>
          <ul className="mt-4 space-y-2">
            {(
              [
                ['healthApi', data.health.checks.api],
                ['healthDatabase', data.health.checks.database],
                ['healthRedis', data.health.checks.redis],
                ['healthStorage', data.health.checks.storage],
              ] as const
            ).map(([key, value]) => (
              <li
                key={key}
                className="flex items-center justify-between rounded-xl border border-line px-3 py-2"
              >
                <span className="text-sm text-ink">{t(`admin.dashboard.${key}`)}</span>
                <AdminBadge tone={value === 'ok' ? 'ok' : 'danger'}>{value}</AdminBadge>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </>
  );
}
