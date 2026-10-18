import { useQueries } from '@tanstack/react-query';
import { Button, EmptyState, Modal, Skeleton, Textarea } from '@thesispartner/ui';
import { meetingListSchema } from '@thesispartner/validation';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { IconAction } from '../../components/IconAction';
import { useLocale, useT } from '../../i18n/LocaleContext';
import { formatShortDay } from '../dashboard/labels';
import { MeetingCalendar } from '../meetings/components/MeetingCalendar';
import { MeetingDetailView } from '../meetings/components/MeetingDetailView';
import { MeetingForm } from '../meetings/components/MeetingForm';
import { MeetingStatusBadge } from '../meetings/components/MeetingStatusBadge';
import {
  useCancelMeeting,
  useConfirmMeeting,
  useCreateMeeting,
  type Meeting,
} from '../meetings/hooks/use-meetings';
import { QueryError, queryErrorMessage } from '../objectives/components/QueryError';
import { useSupervisedTheses } from './hooks/use-supervised-theses';

type DeskView = 'requests' | 'upcoming' | 'history' | 'all';

type DeskMeeting = Meeting & {
  studentName: string;
  bucket: 'upcoming' | 'history';
};

const VIEWS: DeskView[] = ['requests', 'upcoming', 'history', 'all'];

function isView(value: string | null): value is DeskView {
  return value === 'requests' || value === 'upcoming' || value === 'history' || value === 'all';
}

export function SupervisorMeetingsIndex() {
  const t = useT();
  const { dateLocale } = useLocale();
  const supervised = useSupervisedTheses();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const theses = supervised.data?.theses ?? [];
  const meetingQueries = useQueries({
    queries: theses.map((thesis) => ({
      queryKey: ['meetings', thesis.thesisId],
      queryFn: () => apiGet(`/api/v1/theses/${thesis.thesisId}/meetings`, meetingListSchema),
    })),
  });

  const viewParam = params.get('vue');
  const view: DeskView = isView(viewParam) ? viewParam : 'all';
  const studentFilter = params.get('student') ?? 'all';
  const openThesisId = params.get('thesis');
  const openMeetingId = params.get('meeting');

  const rows: DeskMeeting[] = theses.flatMap((thesis, index) => {
    const data = meetingQueries[index]?.data;
    if (!data) return [];
    const student = thesis.doctoralStudent;
    const studentName = student
      ? `${student.givenName} ${student.familyName}`
      : t('supervision.studentFallback');
    return [
      ...data.upcoming.map((meeting) => ({ ...meeting, studentName, bucket: 'upcoming' as const })),
      ...data.history.map((meeting) => ({ ...meeting, studentName, bucket: 'history' as const })),
    ];
  });

  const scoped =
    studentFilter === 'all' ? rows : rows.filter((meeting) => meeting.thesisId === studentFilter);
  const requestCount = scoped.filter((meeting) => meeting.status === 'REQUESTED').length;
  const needle = search.trim().toLocaleLowerCase('fr');
  const visible = scoped
    .filter((meeting) => matchesView(meeting, view))
    .filter((meeting) => {
      if (!needle) return true;
      const mode = meeting.mode ? t(`meetings.modeLabel.${meeting.mode}`) : '';
      return `${meeting.title} ${meeting.studentName} ${mode}`
        .toLocaleLowerCase('fr')
        .includes(needle);
    })
    .sort(compareMeetings);

  function setView(nextView: DeskView) {
    const next = new URLSearchParams(params);
    next.set('vue', nextView);
    next.delete('thesis');
    next.delete('meeting');
    setParams(next);
  }

  function setStudent(thesisId: string) {
    const next = new URLSearchParams(params);
    if (thesisId === 'all') next.delete('student');
    else next.set('student', thesisId);
    next.delete('thesis');
    next.delete('meeting');
    setParams(next);
  }

  function openMeeting(meeting: DeskMeeting) {
    const next = new URLSearchParams(params);
    next.set('thesis', meeting.thesisId);
    next.set('meeting', meeting.id);
    setParams(next);
  }

  const listParams = new URLSearchParams(params);
  listParams.delete('thesis');
  listParams.delete('meeting');
  const backTo = listParams.size > 0 ? `/reunions?${listParams}` : '/reunions';
  const opened = rows.find(
    (meeting) => meeting.thesisId === openThesisId && meeting.id === openMeetingId,
  );

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('nav.meetings')}</h1>
      {supervised.isLoading || meetingQueries.some((query) => query.isLoading) ? (
        <div aria-busy="true">
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {supervised.isError ? <QueryError error={supervised.error} /> : null}
      {meetingQueries.find((query) => query.isError)?.error ? (
        <QueryError error={meetingQueries.find((query) => query.isError)?.error} />
      ) : null}
      {supervised.data && theses.length === 0 ? (
        <EmptyState title={t('supervision.empty')} description={t('meetings.emptyUpcoming')} />
      ) : null}
      {theses.length > 0 && !meetingQueries.some((query) => query.isLoading) ? (
        <div className="grid items-start gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="flex gap-0.5 overflow-x-auto rounded-md border border-line bg-surface p-1.5 shadow-control md:sticky md:top-20 md:flex-col md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {VIEWS.map((item) => (
              <button
                key={item}
                type="button"
                aria-current={view === item && !opened ? 'page' : undefined}
                className={
                  view === item
                    ? 'flex items-center justify-between gap-2 rounded-md bg-brand-soft px-3 py-2 text-left text-sm font-semibold text-brand'
                    : 'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-canvas'
                }
                onClick={() => setView(item)}
              >
                <span>{viewLabel(item, t)}</span>
                {item === 'requests' && requestCount > 0 ? (
                  <span className="rounded-full bg-warn-soft px-1.5 text-[11px] font-medium text-warn">
                    {requestCount}
                  </span>
                ) : null}
              </button>
            ))}
            <p className="mt-2 px-3 pt-2 text-[11px] font-medium tracking-wide text-muted uppercase md:border-t md:border-line">
              {t('supervision.students')}
            </p>
            <button
              type="button"
              aria-current={studentFilter === 'all' ? 'page' : undefined}
              className={
                studentFilter === 'all'
                  ? 'rounded-md bg-brand-soft px-3 py-2 text-left text-sm font-semibold text-brand'
                  : 'rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-canvas'
              }
              onClick={() => setStudent('all')}
            >
              {t('supervision.filterAll')}
            </button>
            {theses.map((thesis) => {
              const student = thesis.doctoralStudent;
              const name = student
                ? `${student.givenName} ${student.familyName}`
                : t('supervision.studentFallback');
              const waiting = rows.filter(
                (meeting) => meeting.thesisId === thesis.thesisId && meeting.status === 'REQUESTED',
              ).length;
              const selected = studentFilter === thesis.thesisId;
              return (
                <button
                  key={thesis.thesisId}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  className={
                    selected
                      ? 'flex items-center justify-between gap-2 rounded-md bg-brand-soft px-3 py-2 text-left text-sm font-semibold text-brand'
                      : 'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-canvas'
                  }
                  onClick={() => setStudent(thesis.thesisId)}
                >
                  <span className="truncate">{name}</span>
                  {waiting > 0 ? (
                    <span className="rounded-full bg-warn-soft px-1.5 text-[11px] font-medium text-warn">
                      {waiting}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="min-w-0">
            {opened ? (
              <MeetingDetailView
                thesisId={opened.thesisId}
                meetingId={opened.id}
                canManage
                canRequest={false}
                backTo={backTo}
              />
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <input
                    value={search}
                    placeholder={t('common.search')}
                    aria-label={t('common.search')}
                    className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-sm shadow-control outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 hover:border-brand/35 focus:border-brand focus:shadow-[0_0_0_3px_rgba(36,87,167,0.12)]"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <IconAction
                    label={t('meetings.new')}
                    icon="plus"
                    onClick={() => setScheduling(true)}
                  />
                </div>
                <div className="grid items-start gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
                  <MeetingCalendar
                    meetings={visible}
                    detailPath={(meetingId) => {
                      const meeting = visible.find((item) => item.id === meetingId);
                      if (!meeting) return backTo;
                      const next = new URLSearchParams(params);
                      next.set('thesis', meeting.thesisId);
                      next.set('meeting', meeting.id);
                      return `/reunions?${next}`;
                    }}
                  />
                  {visible.length === 0 ? (
                    <EmptyState
                      title={t('meetings.emptyTitle')}
                      description={
                        view === 'requests'
                          ? t('meetings.deskEmptyRequests')
                          : view === 'history'
                            ? t('meetings.emptyHistory')
                            : t('meetings.emptyUpcoming')
                      }
                    />
                  ) : (
                    <ul
                      className="overflow-hidden rounded-md border border-line bg-surface"
                      aria-label={t('meetings.listAria')}
                    >
                      {visible.map((meeting) => (
                        <li key={meeting.id} className="border-b border-line last:border-b-0">
                          <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => openMeeting(meeting)}
                            >
                              <span className="block truncate text-sm font-medium text-ink">
                                {meeting.title}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-muted">
                                {meeting.studentName}
                                <span aria-hidden="true"> · </span>
                                {meeting.scheduledOn ? (
                                  <time dateTime={meeting.scheduledOn}>
                                    {formatShortDay(meeting.scheduledOn, dateLocale)}
                                  </time>
                                ) : (
                                  t('meetings.dateUnset')
                                )}
                                {meeting.mode ? (
                                  <>
                                    <span aria-hidden="true"> · </span>
                                    {t(`meetings.modeLabel.${meeting.mode}`)}
                                  </>
                                ) : null}
                              </span>
                            </button>
                            <MeetingStatusBadge status={meeting.status} />
                            {meeting.status === 'REQUESTED' ? (
                              <RequestActions meeting={meeting} />
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
      <Modal
        open={scheduling}
        title={t('meetings.new')}
        closeLabel={t('common.close')}
        onClose={() => setScheduling(false)}
      >
        <ScheduleMeeting
          theses={theses.map((thesis) => ({
            thesisId: thesis.thesisId,
            name: thesis.doctoralStudent
              ? `${thesis.doctoralStudent.givenName} ${thesis.doctoralStudent.familyName}`
              : t('supervision.studentFallback'),
          }))}
          initialThesisId={studentFilter === 'all' ? (theses[0]?.thesisId ?? '') : studentFilter}
          onClose={() => setScheduling(false)}
        />
      </Modal>
    </div>
  );
}

function viewLabel(view: DeskView, t: ReturnType<typeof useT>) {
  if (view === 'requests') return t('meetings.deskRequests');
  if (view === 'upcoming') return t('meetings.upcoming');
  if (view === 'history') return t('meetings.history');
  return t('supervision.filterAll');
}

function matchesView(meeting: DeskMeeting, view: DeskView) {
  if (view === 'all') return true;
  if (view === 'requests') return meeting.status === 'REQUESTED';
  if (view === 'upcoming') return meeting.bucket === 'upcoming' && meeting.status !== 'REQUESTED';
  return meeting.bucket === 'history';
}

function compareMeetings(left: DeskMeeting, right: DeskMeeting) {
  const rank = { REQUESTED: 0, PLANNED: 1, HELD: 2, CANCELLED: 3 };
  if (rank[left.status] !== rank[right.status]) return rank[left.status] - rank[right.status];
  const leftDay = left.scheduledOn ?? '';
  const rightDay = right.scheduledOn ?? '';
  if (left.bucket === 'history') return rightDay.localeCompare(leftDay);
  return leftDay.localeCompare(rightDay);
}

function RequestActions({ meeting }: { meeting: DeskMeeting }) {
  const t = useT();
  const confirm = useConfirmMeeting(meeting.thesisId, meeting.id);
  const cancel = useCancelMeeting(meeting.thesisId, meeting.id);
  const [confirming, setConfirming] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <>
      <div className="flex gap-2">
        <Button className="h-8 px-3 text-xs" onClick={() => setConfirming(true)}>
          {t('meetings.confirm')}
        </Button>
        <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => setRefusing(true)}>
          {t('meetings.refuse')}
        </Button>
      </div>
      <Modal
        open={confirming}
        title={t('meetings.confirm')}
        closeLabel={t('common.close')}
        onClose={() => setConfirming(false)}
      >
        <p className="mb-3 text-xs text-muted">{t('meetings.confirmHelp')}</p>
        <MeetingForm
          initial={{
            title: meeting.title,
            scheduledOn: meeting.scheduledOn ?? '',
            mode: meeting.mode ?? 'ONLINE',
            location: meeting.location ?? undefined,
            meetingUrl: meeting.meetingUrl ?? undefined,
            agenda: meeting.agenda ?? undefined,
          }}
          pending={confirm.isPending}
          error={confirm.error}
          submitLabel={t('meetings.confirm')}
          onCancel={() => setConfirming(false)}
          onSubmit={async (body) => {
            await confirm.mutateAsync(body);
            setConfirming(false);
          }}
        />
      </Modal>
      <Modal
        open={refusing}
        title={t('meetings.refuse')}
        closeLabel={t('common.close')}
        onClose={() => setRefusing(false)}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await cancel.mutateAsync({ reason: reason.trim() || undefined });
            setRefusing(false);
          }}
        >
          <Textarea
            id={`refuse-${meeting.id}`}
            label={t('meetings.cancelReason')}
            value={reason}
            rows={3}
            maxLength={500}
            className="!min-h-16"
            onChange={(event) => setReason(event.target.value)}
          />
          {cancel.error ? (
            <p className="text-sm text-danger" role="alert">
              {queryErrorMessage(cancel.error, t)}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={cancel.isPending}>
              {t('meetings.refuse')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setRefusing(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ScheduleMeeting({
  theses,
  initialThesisId,
  onClose,
}: {
  theses: { thesisId: string; name: string }[];
  initialThesisId: string;
  onClose: () => void;
}) {
  const t = useT();
  const [thesisId, setThesisId] = useState(initialThesisId);
  const create = useCreateMeeting(thesisId);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        {t('supervision.students')}
        <select
          value={thesisId}
          aria-label={t('supervision.students')}
          className="h-9 rounded-md border border-line bg-surface px-3 text-sm font-normal shadow-control"
          onChange={(event) => setThesisId(event.target.value)}
        >
          {theses.map((thesis) => (
            <option key={thesis.thesisId} value={thesis.thesisId}>
              {thesis.name}
            </option>
          ))}
        </select>
      </label>
      <MeetingForm
        pending={create.isPending}
        error={create.error}
        submitLabel={t('meetings.create')}
        onCancel={onClose}
        onSubmit={async (body) => {
          await create.mutateAsync(body);
          onClose();
        }}
      />
    </div>
  );
}
