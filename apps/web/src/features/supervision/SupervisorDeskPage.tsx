import { Button, EmptyState, Skeleton, Textarea } from '@thesispartner/ui';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLocale, useT } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/translate';
import { formatShortDay } from '../dashboard/labels';
import { QueryError, queryErrorMessage } from '../objectives/components/QueryError';
import {
  usePublicationStatus,
  useRecordEvaluation,
  useSupervisorDesk,
  type EvaluationDraft,
  type PublicationStatus,
  type SupervisorDesk,
} from './hooks/use-supervisor-desk';

const SECTIONS = [
  'notifications',
  'schedule',
  'reports',
  'evaluations',
  'publications',
  'decisions',
  'plan',
] as const;

type Section = (typeof SECTIONS)[number];

const DECISION_KEY: Record<string, MessageKey> = {
  'deliverable.validated': 'followUp.decision.deliverableValidated',
  'deliverable.changes_requested': 'followUp.decision.deliverableChanges',
  'objective.completion_approved': 'followUp.decision.objectiveApproved',
  'objective.changes_requested': 'followUp.decision.objectiveChanges',
  'meeting.confirmed': 'followUp.decision.meetingConfirmed',
  'meeting.cancelled': 'followUp.decision.meetingCancelled',
  'meeting.held': 'followUp.decision.meetingHeld',
  'remark.created': 'followUp.decision.remarkCreated',
  'remark.closed': 'followUp.decision.remarkClosed',
  'evaluation.recorded': 'followUp.decision.evaluationRecorded',
  'publication.status_updated': 'followUp.decision.publicationStatus',
};

const PUBLICATION_STATUSES = ['IN_PREPARATION', 'SUBMITTED', 'ACCEPTED', 'PUBLISHED'] as const;

export function SupervisorDeskPage() {
  const t = useT();
  const desk = useSupervisorDesk();
  const [params, setParams] = useSearchParams();
  const sectionParam = params.get('vue');
  const section: Section = isSection(sectionParam) ? sectionParam : 'notifications';

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('nav.followUp')}</h1>
      {desk.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {desk.isError ? <QueryError error={desk.error} /> : null}
      {desk.data ? (
        <div className="grid items-start gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
          <div className="flex gap-0.5 overflow-x-auto rounded-md border border-line bg-surface p-1.5 shadow-control md:sticky md:top-20 md:flex-col md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((item) => (
              <button
                key={item}
                type="button"
                aria-current={section === item ? 'page' : undefined}
                className={
                  section === item
                    ? 'rounded-md bg-brand-soft px-3 py-2 text-left text-sm font-semibold text-brand'
                    : 'rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-canvas'
                }
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set('vue', item);
                  setParams(next);
                }}
              >
                {t(`followUp.${item}`)}
              </button>
            ))}
          </div>
          <section className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{t(`followUp.${section}`)}</h2>
            <p className="mt-1 mb-4 text-sm text-muted">{t(`followUp.${section}Help`)}</p>
            <DeskSection section={section} data={desk.data} />
          </section>
        </div>
      ) : null}
    </div>
  );
}

function isSection(value: string | null): value is Section {
  return SECTIONS.includes(value as Section);
}

function DeskSection({ section, data }: { section: Section; data: SupervisorDesk }) {
  if (section === 'notifications') return <Notifications data={data} />;
  if (section === 'schedule') return <Schedule data={data} />;
  if (section === 'reports') return <Reports data={data} />;
  if (section === 'evaluations') return <Evaluations data={data} />;
  if (section === 'publications') return <Publications data={data} />;
  if (section === 'decisions') return <Decisions data={data} />;
  return <Plan data={data} />;
}

function Notifications({ data }: { data: SupervisorDesk }) {
  const t = useT();
  const { dateLocale } = useLocale();
  if (data.notifications.length === 0) {
    return (
      <EmptyState
        title={t('followUp.noNotifications')}
        description={t('followUp.notificationsHelp')}
      />
    );
  }
  return (
    <ul className="overflow-hidden rounded-md border border-line bg-surface">
      {data.notifications.map((item) => (
        <li key={item.id} className="border-b border-line last:border-b-0">
          <Link
            to={place(item.kind, item.thesisId)}
            className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-canvas/70"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-brand">
                {t(`followUp.kind.${item.kind}`)}
                <span aria-hidden="true"> · </span>
                {item.studentName}
              </span>
              <span className="mt-0.5 block truncate text-sm font-medium text-ink">
                {item.title}
              </span>
            </span>
            {item.date ? (
              <time className="shrink-0 text-[11px] text-muted" dateTime={item.date}>
                {formatShortDay(item.date, dateLocale)}
              </time>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Schedule({ data }: { data: SupervisorDesk }) {
  const t = useT();
  const { dateLocale } = useLocale();
  const [upcoming, setUpcoming] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const rows = upcoming ? data.schedule.filter((item) => item.date >= today) : data.schedule;
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <FilterButton pressed={upcoming} onClick={() => setUpcoming(true)}>
          {t('followUp.upcomingOnly')}
        </FilterButton>
        <FilterButton pressed={!upcoming} onClick={() => setUpcoming(false)}>
          {t('followUp.allDates')}
        </FilterButton>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t('followUp.noSchedule')} description={t('followUp.scheduleHelp')} />
      ) : (
        <ul className="overflow-hidden rounded-md border border-line bg-surface">
          {rows.map((item) => (
            <li key={item.id} className="border-b border-line last:border-b-0">
              <Link
                to={place(item.kind, item.thesisId)}
                className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-canvas/70"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">
                    {item.studentName}
                    <span aria-hidden="true"> · </span>
                    {item.kind === 'DELIVERABLE'
                      ? t('followUp.deliverableDue')
                      : t(`followUp.kind.${item.kind}`)}
                  </span>
                </span>
                <time className="shrink-0 text-[11px] text-muted" dateTime={item.date}>
                  {formatShortDay(item.date, dateLocale)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Reports({ data }: { data: SupervisorDesk }) {
  const t = useT();
  const { dateLocale } = useLocale();
  const [thesisId, setThesisId] = useState(data.plans[0]?.thesisId ?? '');
  const [period, setPeriod] = useState<'month' | 'quarter'>('month');
  const [ready, setReady] = useState(false);
  const plan = data.plans.find((item) => item.thesisId === thesisId);
  const range = periodRange(period);
  const phases =
    plan?.phases.filter(
      (phase) => inRange(phase.dueDate, range) || inRange(phase.startDate, range),
    ) ?? [];
  const meetings = data.schedule.filter(
    (item) => item.thesisId === thesisId && item.kind === 'MEETING' && inRange(item.date, range),
  );
  const evaluations = data.evaluations.filter(
    (item) => item.thesisId === thesisId && inRange(item.evaluatedOn, range),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <StudentSelect plans={data.plans} value={thesisId} onChange={setThesisId} />
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t('followUp.reports')}
          <select
            value={period}
            aria-label={t('followUp.reports')}
            className="h-9 rounded-md border border-line bg-surface px-3 text-sm font-normal shadow-control"
            onChange={(event) => setPeriod(event.target.value === 'quarter' ? 'quarter' : 'month')}
          >
            <option value="month">{t('followUp.month')}</option>
            <option value="quarter">{t('followUp.quarter')}</option>
          </select>
        </label>
        <Button className="h-9 px-3 text-sm" onClick={() => setReady(true)}>
          {t('followUp.generate')}
        </Button>
      </div>
      {ready && plan ? (
        <article className="rounded-md border border-line bg-surface px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">{plan.studentName}</h3>
          <p className="mt-1 text-[11px] text-muted">
            {formatShortDay(range.start, dateLocale)} – {formatShortDay(range.end, dateLocale)}
          </p>
          <p className="mt-3 text-sm text-ink">
            {t('followUp.progress')} · {plan.progressPercentage}%
          </p>
          {phases.length === 0 && meetings.length === 0 && evaluations.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t('followUp.reportEmpty')}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink">
              {phases.map((phase) => (
                <li key={phase.id}>
                  {phase.title}
                  <span className="text-muted"> · {phase.progress}%</span>
                </li>
              ))}
              {meetings.map((meeting) => (
                <li key={meeting.id}>
                  {meeting.title}
                  <span className="text-muted"> · {formatShortDay(meeting.date, dateLocale)}</span>
                </li>
              ))}
              {evaluations.map((item) => (
                <li key={item.id}>
                  {t('followUp.evaluations')}
                  <span className="text-muted">
                    {' '}
                    · {formatShortDay(item.evaluatedOn, dateLocale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}
    </div>
  );
}

function Evaluations({ data }: { data: SupervisorDesk }) {
  const t = useT();
  const { dateLocale } = useLocale();
  const [thesisId, setThesisId] = useState(data.plans[0]?.thesisId ?? '');
  const rows = data.evaluations.filter((item) => item.thesisId === thesisId);

  return (
    <div className="flex flex-col gap-4">
      <StudentSelect plans={data.plans} value={thesisId} onChange={setThesisId} />
      {thesisId ? <EvaluationForm thesisId={thesisId} /> : null}
      {rows.length === 0 ? (
        <EmptyState
          title={t('followUp.noEvaluations')}
          description={t('followUp.evaluationsHelp')}
        />
      ) : (
        <ul className="overflow-hidden rounded-md border border-line bg-surface">
          {rows.map((item) => (
            <li key={item.id} className="border-b border-line px-3 py-2.5 last:border-b-0">
              <p className="text-sm font-medium text-ink">
                <time dateTime={item.evaluatedOn}>
                  {formatShortDay(item.evaluatedOn, dateLocale)}
                </time>
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {t('followUp.quality')} {item.quality}/5 · {t('followUp.autonomy')} {item.autonomy}
                /5 · {t('followUp.methodology')} {item.methodology}/5 · {t('followUp.advancement')}{' '}
                {item.advancement}/5
              </p>
              {item.comment ? <p className="mt-1 text-sm text-ink">{item.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EvaluationForm({ thesisId }: { thesisId: string }) {
  const t = useT();
  const record = useRecordEvaluation(thesisId);
  const [evaluatedOn, setEvaluatedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [quality, setQuality] = useState(3);
  const [autonomy, setAutonomy] = useState(3);
  const [methodology, setMethodology] = useState(3);
  const [advancement, setAdvancement] = useState(3);
  const [comment, setComment] = useState('');

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-line bg-surface px-3 py-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const body: EvaluationDraft = {
          evaluatedOn,
          quality,
          autonomy,
          methodology,
          advancement,
          comment: comment.trim() || undefined,
        };
        await record.mutateAsync(body);
        setComment('');
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t('meetings.date')}
        <input
          type="date"
          required
          value={evaluatedOn}
          className="h-9 rounded-md border border-line bg-surface px-3 text-sm font-normal shadow-control"
          onChange={(event) => setEvaluatedOn(event.target.value)}
        />
      </label>
      <Score label={t('followUp.quality')} value={quality} onChange={setQuality} />
      <Score label={t('followUp.autonomy')} value={autonomy} onChange={setAutonomy} />
      <Score label={t('followUp.methodology')} value={methodology} onChange={setMethodology} />
      <Score label={t('followUp.advancement')} value={advancement} onChange={setAdvancement} />
      <Textarea
        id="evaluation-comment"
        label={t('followUp.comment')}
        value={comment}
        rows={3}
        maxLength={2000}
        className="!min-h-16"
        onChange={(event) => setComment(event.target.value)}
      />
      {record.error ? (
        <p className="text-sm text-danger" role="alert">
          {queryErrorMessage(record.error, t)}
        </p>
      ) : null}
      <div>
        <Button type="submit" className="h-9 px-3 text-sm" disabled={record.isPending}>
          {t('followUp.saveEvaluation')}
        </Button>
      </div>
    </form>
  );
}

function Publications({ data }: { data: SupervisorDesk }) {
  const t = useT();
  if (data.publications.length === 0) {
    return (
      <EmptyState
        title={t('followUp.noPublications')}
        description={t('followUp.publicationsHelp')}
      />
    );
  }
  return (
    <ul className="overflow-hidden rounded-md border border-line bg-surface">
      {data.publications.map((item) => (
        <PublicationRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function PublicationRow({ item }: { item: SupervisorDesk['publications'][number] }) {
  const t = useT();
  const update = usePublicationStatus(item.id);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted">
          {item.studentName}
          <span aria-hidden="true"> · </span>
          {item.venue} · {item.year}
        </span>
      </span>
      <select
        aria-label={t('followUp.publications')}
        value={item.status}
        disabled={update.isPending}
        className="h-9 rounded-md border border-line bg-surface px-2 text-sm shadow-control"
        onChange={(event) => void update.mutate(event.target.value as PublicationStatus)}
      >
        {PUBLICATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {t(`followUp.pubStatus.${status}`)}
          </option>
        ))}
      </select>
    </li>
  );
}

function Decisions({ data }: { data: SupervisorDesk }) {
  const t = useT();
  const { dateLocale } = useLocale();
  if (data.decisions.length === 0) {
    return (
      <EmptyState title={t('followUp.noDecisions')} description={t('followUp.decisionsHelp')} />
    );
  }
  return (
    <ul className="overflow-hidden rounded-md border border-line bg-surface">
      {data.decisions.map((item) => {
        const key = DECISION_KEY[item.action];
        const day = item.createdAt.slice(0, 10);
        return (
          <li key={item.id} className="border-b border-line last:border-b-0">
            <Link
              to={`/encadrement/${item.thesisId}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-canvas/70"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {key ? t(key) : item.action}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {item.studentName}
                </span>
              </span>
              <time className="shrink-0 text-[11px] text-muted" dateTime={day}>
                {formatShortDay(day, dateLocale)}
              </time>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Plan({ data }: { data: SupervisorDesk }) {
  const t = useT();
  const { dateLocale } = useLocale();
  const [thesisId, setThesisId] = useState(data.plans[0]?.thesisId ?? '');
  const plan = data.plans.find((item) => item.thesisId === thesisId);
  const phases = [...(plan?.phases ?? [])].sort((left, right) =>
    (left.dueDate ?? left.startDate ?? '9999').localeCompare(
      right.dueDate ?? right.startDate ?? '9999',
    ),
  );

  return (
    <div className="flex flex-col gap-3">
      <StudentSelect plans={data.plans} value={thesisId} onChange={setThesisId} />
      {phases.length === 0 ? (
        <EmptyState title={t('followUp.noPlan')} description={t('followUp.planHelp')} />
      ) : (
        <ol className="overflow-hidden rounded-md border border-line bg-surface">
          {phases.map((phase, index) => (
            <li key={phase.id} className="border-b border-line last:border-b-0">
              <Link
                to={`/encadrement/${thesisId}/objectifs/${phase.id}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-canvas/70"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{phase.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    {phase.dueDate
                      ? formatShortDay(phase.dueDate, dateLocale)
                      : t('common.notProvided')}
                    <span aria-hidden="true"> · </span>
                    {t(`objectives.status.${phase.status}`)}
                    <span aria-hidden="true"> · </span>
                    {phase.progress}%
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StudentSelect({
  plans,
  value,
  onChange,
}: {
  plans: SupervisorDesk['plans'];
  value: string;
  onChange: (thesisId: string) => void;
}) {
  const t = useT();
  return (
    <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-ink">
      {t('followUp.student')}
      <select
        value={value}
        aria-label={t('followUp.student')}
        className="h-9 rounded-md border border-line bg-surface px-3 text-sm font-normal shadow-control"
        onChange={(event) => onChange(event.target.value)}
      >
        {plans.map((plan) => (
          <option key={plan.thesisId} value={plan.thesisId}>
            {plan.studentName}
          </option>
        ))}
      </select>
    </label>
  );
}

function Score({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-ink">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            aria-pressed={value === score}
            className={
              value === score
                ? 'h-8 w-8 rounded-md bg-brand text-xs font-semibold text-white'
                : 'h-8 w-8 rounded-md border border-line text-xs text-ink hover:bg-canvas'
            }
            onClick={() => onChange(score)}
          >
            {score}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function FilterButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={
        pressed
          ? 'rounded-md bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand'
          : 'rounded-md border border-line px-3 py-1.5 text-xs text-ink'
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function place(kind: string, thesisId: string) {
  if (kind === 'DELIVERABLE') return `/encadrement/${thesisId}/livrables`;
  if (kind === 'OVERDUE' || kind === 'OBJECTIVE') return `/encadrement/${thesisId}/objectifs`;
  if (kind === 'MEETING') return `/encadrement/${thesisId}/reunions`;
  if (kind === 'REMARK') return `/encadrement/${thesisId}/remarques`;
  if (kind === 'DEFENSE') return `/encadrement/${thesisId}/profil`;
  return `/encadrement/${thesisId}`;
}

function periodRange(period: 'month' | 'quarter') {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  if (period === 'month') {
    const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
    return { start: `${year}-${String(month + 1).padStart(2, '0')}-01`, end };
  }
  const startMonth = Math.floor(month / 3) * 3;
  const end = new Date(Date.UTC(year, startMonth + 3, 0)).toISOString().slice(0, 10);
  return { start: `${year}-${String(startMonth + 1).padStart(2, '0')}-01`, end };
}

function inRange(value: string | null, range: { start: string; end: string }) {
  return Boolean(value && value >= range.start && value <= range.end);
}
