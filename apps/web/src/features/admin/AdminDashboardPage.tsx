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
import { Link } from 'react-router-dom';
import { useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';
import { AdminSparkline } from './AdminSparkline';
import { AdminKpi, AdminPanel, AdminState, AdminBadge, comparePeriod, shareOf } from './AdminUi';
import { useAdminStats } from './hooks/use-admin';

type AdminStats = z.infer<typeof adminStatsSchema>;

export function AdminDashboardPage() {
  const stats = useAdminStats();

  return (
    <div className="space-y-8">
      <AdminState loading={stats.isLoading} error={stats.error}>
        {stats.data ? <AdminDashboardBody data={stats.data} /> : null}
      </AdminState>
    </div>
  );
}

function AdminDashboardBody({ data }: { data: AdminStats }) {
  const t = useT();
  const me = useMeQuery();
  const firstName = me.data?.user.givenName?.trim() || me.data?.user.displayName?.split(' ')[0];
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
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#1a3f8b] via-brand to-[#1f6f8f] px-5 py-6 text-white shadow-[0_18px_40px_rgba(36,99,197,0.28)] sm:px-7 sm:py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 20%, rgba(255,255,255,0.35), transparent 42%), radial-gradient(circle at 88% 10%, rgba(255,255,255,0.18), transparent 35%)',
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">
              {t('admin.dashboard.eyebrow')}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t('admin.dashboard.welcome', { name: firstName || t('admin.roles.superAdmin') })}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {t('admin.dashboard.welcomeHelp')}
            </p>
          </div>
          <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            {todayLabel}
          </div>
        </div>

        <dl className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HeroStat
            label={t('admin.dashboard.totalUsers')}
            value={data.totalUsers}
            hint={shareOf(data.activeAccounts, data.totalUsers, ofUsers)}
          />
          <HeroStat
            label={t('admin.dashboard.activeTheses')}
            value={data.activeTheses}
            hint={shareOf(data.activeTheses, data.theses, ofTheses)}
          />
          <HeroStat
            label={t('admin.dashboard.invitationsPending')}
            value={data.invitationsPending}
            hint={shareOf(data.invitationsPending, invitationTotal, ofInvitations)}
          />
          <HeroStat
            label={t('admin.dashboard.healthStatus')}
            value={
              data.health.status === 'ok'
                ? t('admin.dashboard.healthOk')
                : t('admin.dashboard.healthDegraded')
            }
            hintText={t('admin.dashboard.healthHeading')}
          />
        </dl>

        <div className="relative mt-5 flex flex-wrap gap-2">
          <Link
            to="/admin/utilisateurs"
            className="inline-flex h-9 items-center rounded-xl bg-white px-3.5 text-sm font-semibold text-brand shadow-sm transition hover:bg-brand-soft"
          >
            {t('admin.nav.users')}
          </Link>
          <Link
            to="/admin/invitations"
            className="inline-flex h-9 items-center rounded-xl border border-white/25 bg-white/10 px-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            {t('admin.nav.invitations')}
          </Link>
          <Link
            to="/admin/analytics"
            className="inline-flex h-9 items-center rounded-xl border border-white/25 bg-white/10 px-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            {t('admin.nav.analytics')}
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            {t('admin.dashboard.accountsHeading')}
          </h2>
          <p className="text-xs text-muted">{t('admin.dashboard.subtitle')}</p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpi
            label={t('admin.dashboard.totalUsers')}
            value={data.totalUsers}
            tone="brand"
            icon={<Users size={18} weight="duotone" />}
          />
          <AdminKpi
            label={t('admin.dashboard.activeAccounts')}
            value={data.activeAccounts}
            tone="ok"
            icon={<CheckCircle size={18} weight="duotone" />}
            share={shareOf(data.activeAccounts, data.totalUsers, ofUsers)}
          />
          <AdminKpi
            label={t('admin.dashboard.suspendedAccounts')}
            value={data.suspendedAccounts}
            tone="danger"
            icon={<Prohibit size={18} weight="duotone" />}
            share={shareOf(data.suspendedAccounts, data.totalUsers, ofUsers)}
          />
          <AdminKpi
            label={t('admin.dashboard.doctoralStudents')}
            value={data.doctoralStudents}
            tone="teal"
            icon={<GraduationCap size={18} weight="duotone" />}
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
            icon={<UserCircle size={18} weight="duotone" />}
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
            icon={<Scroll size={18} weight="duotone" />}
            share={shareOf(data.activeTheses, data.theses, ofTheses)}
          />
          <AdminKpi
            label={t('admin.dashboard.theses')}
            value={data.theses}
            tone="muted"
            icon={<Scroll size={18} weight="duotone" />}
            share={shareOf(
              data.theses - data.activeTheses,
              data.theses,
              t('admin.kpi.ofInactiveTheses'),
            )}
          />
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          {t('admin.dashboard.invitationsHeading')}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminKpi
            label={t('admin.dashboard.invitationsPending')}
            value={data.invitationsPending}
            tone="warn"
            icon={<EnvelopeSimple size={18} weight="duotone" />}
            share={shareOf(data.invitationsPending, invitationTotal, ofInvitations)}
          />
          <AdminKpi
            label={t('admin.dashboard.invitationsAccepted')}
            value={data.invitationsAccepted}
            tone="ok"
            icon={<CheckCircle size={18} weight="duotone" />}
            share={shareOf(data.invitationsAccepted, invitationTotal, ofInvitations)}
          />
          <AdminKpi
            label={t('admin.dashboard.invitationsRejected')}
            value={data.invitationsRejected}
            tone="danger"
            icon={<Prohibit size={18} weight="duotone" />}
            share={shareOf(data.invitationsRejected, invitationTotal, ofInvitations)}
          />
          <AdminKpi
            label={t('admin.dashboard.invitationsExpired')}
            value={data.invitationsExpired}
            tone="muted"
            icon={<EnvelopeSimple size={18} weight="duotone" />}
            share={shareOf(data.invitationsExpired, invitationTotal, ofInvitations)}
          />
        </dl>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
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
          <div className="rounded-2xl border border-line bg-canvas/70 p-4">
            <AdminSparkline
              points={registrationsTrend30}
              label={t('admin.dashboard.registrationsChart')}
              emptyLabel={t('admin.dashboard.chartEmpty')}
              tone="brand"
            />
          </div>
        </AdminPanel>

        <AdminPanel title={t('admin.dashboard.healthHeading')}>
          <div className="flex items-center justify-between rounded-2xl bg-linear-to-r from-canvas to-brand-soft/40 px-4 py-4">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                  data.health.status === 'ok' ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'
                }`}
              >
                <Pulse size={22} weight="duotone" />
              </span>
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
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-2.5 transition hover:border-brand/20"
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

function HeroStat({
  label,
  value,
  hint,
  hintText,
}: {
  label: string;
  value: string | number;
  hint?: ReturnType<typeof shareOf>;
  hintText?: string;
}) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <dt className="text-[11px] font-semibold tracking-[0.08em] text-white/70 uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{display}</dd>
      {hint ? (
        <p className="mt-1 text-[11px] text-white/70">
          {hint.part.toLocaleString()} / {hint.total.toLocaleString()}
          {hint.label ? ` ${hint.label}` : ''}
        </p>
      ) : hintText ? (
        <p className="mt-1 text-[11px] text-white/70">{hintText}</p>
      ) : null}
    </div>
  );
}
