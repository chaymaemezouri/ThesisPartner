import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supervisedThesisSchema } from '@thesispartner/validation';
import { Avatar, EmptyState, Input, Select, Skeleton } from '@thesispartner/ui';
import type { z } from 'zod';
import { Icon } from '../../components/Icon';
import { useLocale, useT } from '../../i18n/LocaleContext';
import { formatShortDay } from '../dashboard/labels';
import { utcToday } from '../dashboard/format';
import { QueryError } from '../objectives/components/QueryError';
import { useSupervisedTheses } from './hooks/use-supervised-theses';
import { portraitUrl } from './temporary-portraits';
import {
  matchesRoster,
  rosterStats,
  sortRoster,
  studentName,
  type RosterFilter,
  type RosterSort,
} from './roster';

type SupervisedThesis = z.infer<typeof supervisedThesisSchema>;

export function SupervisorDashboard({ layout = 'cards' }: { layout?: 'cards' | 'list' }) {
  const t = useT();
  const supervised = useSupervisedTheses();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [sort, setSort] = useState<RosterSort>('name');

  const theses = useMemo(() => supervised.data?.theses ?? [], [supervised.data?.theses]);
  const stats = layout === 'cards' ? rosterStats(theses) : null;
  const visible = useMemo(
    () =>
      sortRoster(
        theses.filter((item) => matchesRoster(item, query, filter, t('supervision.studentUnset'))),
        sort,
        t('supervision.studentUnset'),
      ),
    [filter, query, sort, t, theses],
  );

  if (supervised.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-20" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (supervised.isError) return <QueryError error={supervised.error} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <h1 className="sr-only">{t('supervision.dashboardTitle')}</h1>
      {stats ? (
        <section className="grid shrink-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            icon="supervision"
            label={t('supervision.statsStudents')}
            value={String(stats.students)}
          />
          <Stat
            icon="dashboard"
            label={t('supervision.statsProgress')}
            value={`${stats.averageProgress} %`}
          />
          <Stat
            icon="objectives"
            tone={stats.overdue > 0 ? 'danger' : 'brand'}
            label={t('supervision.statsObjectives')}
            value={t('supervision.statsInProgress', { count: stats.inProgress })}
            detail={
              stats.overdue > 0 ? t('supervision.statsOverdue', { count: stats.overdue }) : undefined
            }
          />
          <Stat
            icon="deliverables"
            tone={stats.pending > 0 ? 'warn' : 'brand'}
            label={t('supervision.statsPending')}
            value={String(stats.pending)}
          />
        </section>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col gap-3.5">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              {t('supervision.title')}
              {stats ? (
                <span className="ml-1.5 text-sm font-normal text-muted">({stats.students})</span>
              ) : (
                <span className="ml-2 rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium tabular-nums text-brand">
                  {theses.length}
                </span>
              )}
            </h2>
            {layout === 'list' ? (
              <p className="mt-1 text-sm text-muted">{t('supervision.subtitle')}</p>
            ) : null}
          </div>
          {layout === 'cards' ? (
            <Link
              to="/encadrement"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink shadow-control transition-colors hover:border-brand/35 hover:bg-brand-soft/60 hover:text-brand"
            >
              {t('supervision.seeAll')}
              <Icon name="chevron" className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
        <div
          className={`grid shrink-0 gap-3 md:grid-cols-[minmax(0,1fr)_11rem_13rem] ${
            layout === 'list'
              ? 'rounded-xl border border-line bg-surface p-3'
              : 'rounded-[12px] border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
          }`}
        >
          <Input
            id="student-search"
            label={t('supervision.search')}
            value={query}
            placeholder={t('supervision.searchPlaceholder')}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            id="student-filter"
            label={t('supervision.filter')}
            value={filter}
            onChange={(event) => setFilter(event.target.value as RosterFilter)}
          >
            <option value="all">{t('supervision.filterAll')}</option>
            <option value="on_track">{t('supervision.filterOnTrack')}</option>
            <option value="attention">{t('supervision.filterAttention')}</option>
            <option value="late">{t('supervision.filterLate')}</option>
            <option value="pending">{t('supervision.filterPending')}</option>
          </Select>
          <Select
            id="student-sort"
            label={t('supervision.sort')}
            value={sort}
            onChange={(event) => setSort(event.target.value as RosterSort)}
          >
            <option value="name">{t('supervision.sortName')}</option>
            <option value="progress-desc">{t('supervision.sortProgressDesc')}</option>
            <option value="progress-asc">{t('supervision.sortProgressAsc')}</option>
          </Select>
        </div>

        {theses.length === 0 ? (
          <EmptyState title={t('supervision.empty')} description={t('supervision.emptyHelp')} />
        ) : null}
        {theses.length > 0 && visible.length === 0 ? (
          <EmptyState title={t('supervision.noMatch')} description={t('supervision.noMatchHelp')} />
        ) : null}
        <ul
          className={
            layout === 'cards'
              ? 'grid min-h-0 flex-1 content-start justify-start gap-3 overflow-y-auto pb-2 [grid-template-columns:repeat(auto-fill,minmax(11rem,11rem))]'
              : 'grid gap-3'
          }
        >
          {visible.map((thesis) => {
            const name = studentName(thesis, t('supervision.studentUnset'));
            return layout === 'cards' ? (
              <SquareCard key={thesis.thesisId} thesis={thesis} name={name} />
            ) : (
              <ListCard key={thesis.thesisId} thesis={thesis} name={name} />
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SquareCard({ thesis, name }: { thesis: SupervisedThesis; name: string }) {
  const t = useT();
  const late = thesis.objectiveSummary.overdue > 0;
  const pending = thesis.pendingValidationCount > 0;
  const chip = late
    ? { label: t('supervision.filterLate'), className: 'bg-danger-soft text-danger' }
    : pending
      ? { label: t('supervision.statusReview'), className: 'bg-warn-soft text-warn' }
      : { label: t('supervision.statusActive'), className: 'bg-ok-soft text-ok' };
  return (
    <li className="min-w-0">
      <Link
        to={`/encadrement/${thesis.thesisId}`}
        className="flex h-full flex-col items-center rounded-[12px] border border-line bg-surface px-3 py-4 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
      >
        <Avatar
          label={name}
          imageUrl={portraitUrl(name, thesis.doctoralStudent?.avatarUrl)}
          size="xl"
          decorative
        />
        <p className="mt-3 line-clamp-2 text-sm font-medium leading-snug text-ink">{name}</p>
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-canvas"
          role="progressbar"
          aria-valuenow={thesis.progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('supervision.progressOf', { name })}
        >
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${thesis.progressPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {t('supervision.objectivesShort', {
            done: thesis.objectiveSummary.completed,
            total: thesis.objectiveSummary.total,
          })}
        </p>
        <span
          className={`mt-2.5 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide ${chip.className}`}
        >
          {chip.label}
        </span>
      </Link>
    </li>
  );
}

function ListCard({ thesis, name }: { thesis: SupervisedThesis; name: string }) {
  const t = useT();
  const late = thesis.objectiveSummary.overdue > 0;
  const pending = thesis.pendingValidationCount > 0;
  return (
    <li className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3 p-4">
        <span className="shrink-0">
          <Avatar label={name} imageUrl={portraitUrl(name, thesis.doctoralStudent?.avatarUrl)} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{name}</p>
              <p className="line-clamp-2 text-sm text-muted">{thesis.title}</p>
            </div>
            <p className="shrink-0 rounded-md bg-brand-soft px-2 py-1 text-sm font-semibold tabular-nums text-brand">
              {thesis.progressPercentage} %
            </p>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas"
            role="progressbar"
            aria-valuenow={thesis.progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('supervision.progressOf', { name })}
          >
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${thesis.progressPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {t('supervision.objectivesDone', {
              done: thesis.objectiveSummary.completed,
              total: thesis.objectiveSummary.total,
            })}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap gap-2 text-xs">
              {late ? (
                <span className="rounded-full bg-danger-soft px-2 py-0.5 font-medium text-danger">
                  {t('supervision.alertOverdue', { count: thesis.objectiveSummary.overdue })}
                </span>
              ) : (
                <span className="rounded-full bg-ok-soft px-2 py-0.5 font-medium text-ok">
                  {t('supervision.filterOnTrack')}
                </span>
              )}
              {pending ? (
                <span className="rounded-full bg-warn-soft px-2 py-0.5 font-medium text-warn">
                  {t('supervision.alertPending', { count: thesis.pendingValidationCount })}
                </span>
              ) : null}
            </p>
            <Link
              to={`/encadrement/${thesis.thesisId}`}
              className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {t('supervision.openSpace')}
              <Icon name="chevron" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
      <StudentPriorities thesis={thesis} />
    </li>
  );
}

function StudentPriorities({ thesis }: { thesis: SupervisedThesis }) {
  const t = useT();
  const { dateLocale } = useLocale();
  const deadline = thesis.nextDeadline;
  const base = `/encadrement/${thesis.thesisId}`;
  const deadlineUrl = deadline
    ? deadline.kind === 'OBJECTIVE'
      ? `${base}/objectifs/${deadline.id}`
      : deadline.kind === 'DELIVERABLE'
        ? `${base}/livrables/${deadline.id}`
        : deadline.kind === 'MEETING'
          ? `${base}/reunions/${deadline.id}`
          : `${base}/profil`
    : null;
  return (
    <div className="grid gap-3 border-t border-line bg-canvas/50 px-4 py-3 text-left sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.75fr)]">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Icon name="meetings" className="h-3.5 w-3.5" />
          {t('supervision.nextDeadline')}
        </p>
        {deadline && deadlineUrl ? (
          <Link
            to={deadlineUrl}
            className="mt-1 block text-xs text-ink hover:text-brand hover:underline"
          >
            <span className="block break-words">
              {deadline.kind === 'EXPECTED_DEFENSE'
                ? t('dashboard.kind.EXPECTED_DEFENSE')
                : deadline.title}
            </span>
            <time
              dateTime={deadline.occursOn}
              className={`mt-1 block text-xs ${deadline.occursOn < utcToday() ? 'text-danger' : 'text-muted'}`}
            >
              {formatShortDay(deadline.occursOn, dateLocale)}
            </time>
          </Link>
        ) : (
          <p className="mt-1 text-xs text-muted">{t('supervision.noDeadline')}</p>
        )}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Icon name="deliverables" className="h-3.5 w-3.5" />
          {t('supervision.section.deliverables')}
        </p>
        <Link
          to={`${base}/livrables?status=SUBMITTED`}
          className={`mt-1 inline-block text-xs font-medium hover:underline ${thesis.pendingValidationCount > 0 ? 'text-brand' : 'text-muted'}`}
        >
          {t('supervision.pendingCount', { count: thesis.pendingValidationCount })}
        </Link>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Icon name="watch" className="h-3.5 w-3.5" />
          {t('supervision.lastActivity')}
        </p>
        {thesis.lastActivityAt ? (
          <time dateTime={thesis.lastActivityAt} className="mt-1 block text-xs text-ink">
            {new Date(thesis.lastActivityAt).toLocaleDateString(dateLocale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </time>
        ) : (
          <p className="mt-1 text-xs text-muted">{t('supervision.noActivity')}</p>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  detail,
  tone = 'brand',
}: {
  icon: 'supervision' | 'dashboard' | 'objectives' | 'deliverables';
  label: string;
  value: string;
  detail?: string;
  tone?: 'brand' | 'danger' | 'warn';
}) {
  const bubble =
    tone === 'danger'
      ? 'bg-danger-soft text-danger'
      : tone === 'warn'
        ? 'bg-warn-soft text-warn'
        : 'bg-brand-soft text-brand';
  return (
    <article className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[10px] ${bubble}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">{label}</p>
        <p className="mt-0.5 text-lg font-semibold leading-tight tabular-nums text-ink">{value}</p>
        {detail ? <p className="mt-0.5 text-xs font-medium text-danger">{detail}</p> : null}
      </div>
    </article>
  );
}
