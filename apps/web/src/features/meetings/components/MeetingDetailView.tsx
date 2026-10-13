import { Button, Modal, Skeleton, Textarea } from '@thesispartner/ui';
import { IconAction } from '../../../components/IconAction';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { QueryError, queryErrorMessage } from '../../objectives/components/QueryError';
import {
  useCancelMeeting,
  useConfirmMeeting,
  useHoldMeeting,
  useMeeting,
  useReviseRequest,
  useUpdateMeeting,
} from '../hooks/use-meetings';
import { MeetingForm, MeetingRequestForm } from './MeetingForm';
import { MeetingStatusBadge } from './MeetingStatusBadge';

export function MeetingDetailView({
  thesisId,
  meetingId,
  canManage,
  canRequest,
  backTo,
  trail,
}: {
  thesisId: string;
  meetingId: string;
  canManage: boolean;
  canRequest: boolean;
  backTo: string;
  trail?: { label: string; to: string }[];
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const meeting = useMeeting(thesisId, meetingId);
  const update = useUpdateMeeting(thesisId, meetingId);
  const revise = useReviseRequest(thesisId, meetingId);
  const confirm = useConfirmMeeting(thesisId, meetingId);
  const hold = useHoldMeeting(thesisId, meetingId);
  const cancel = useCancelMeeting(thesisId, meetingId);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  if (meeting.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (meeting.isError || !meeting.data) return <QueryError error={meeting.error} />;

  const data = meeting.data;
  const planned = canManage && data.status === 'PLANNED';
  const awaiting = data.status === 'REQUESTED';
  const studentRequest = canRequest && awaiting;
  const supervisorRequest = canManage && awaiting;
  const crumbs = trail ?? [{ label: t('meetings.title'), to: backTo }];
  const when = data.scheduledOn
    ? new Date(`${data.scheduledOn}T00:00:00.000Z`).toLocaleDateString(dateLocale, {
        timeZone: 'UTC',
      })
    : null;

  return (
    <article className="min-w-0">
      <nav className="mb-2 text-[11px] text-muted" aria-label={t('common.breadcrumb')}>
        {crumbs.map((crumb, index) => (
          <span key={crumb.to}>
            {index > 0 ? <span aria-hidden="true"> / </span> : null}
            <Link to={crumb.to} className="text-brand hover:underline">
              {crumb.label}
            </Link>
          </span>
        ))}
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{data.title}</span>
      </nav>
      <section className="overflow-hidden rounded-md border border-line bg-surface">
        <header className="border-b border-line px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 break-words text-base font-semibold tracking-tight text-ink">
              {data.title}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              <MeetingStatusBadge status={data.status} />
              {planned ? (
                <IconAction
                  tone="neutral"
                  icon="pencil"
                  label={t('meetings.edit')}
                  onClick={() => setEditing(true)}
                />
              ) : null}
              {studentRequest ? (
                <IconAction
                  tone="neutral"
                  icon="pencil"
                  label={t('meetings.editRequest')}
                  onClick={() => setEditing(true)}
                />
              ) : null}
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            {when && data.scheduledOn && data.mode ? (
              <>
                <time dateTime={data.scheduledOn}>{when}</time>
                <span aria-hidden="true"> · </span>
                {t(`meetings.modeLabel.${data.mode}`)}
                {data.mode === 'IN_PERSON' && data.location ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    {data.location}
                  </>
                ) : null}
              </>
            ) : (
              t('meetings.dateUnset')
            )}
          </p>
          {data.mode === 'ONLINE' && data.meetingUrl && data.status !== 'CANCELLED' ? (
            data.status === 'PLANNED' ? (
              <div className="mt-3">
                <a
                  href={data.meetingUrl}
                  className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-medium text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('meetings.joinVideo')}
                </a>
                <p className="mt-1.5 break-all text-xs text-muted">{data.meetingUrl}</p>
              </div>
            ) : (
              <p className="mt-1.5 text-xs">
                <a
                  href={data.meetingUrl}
                  className="text-brand hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('meetings.openLink')}
                </a>
              </p>
            )
          ) : null}
        </header>
        <div className="px-4 py-3.5">
          <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">
            {t('meetings.agenda')}
          </h2>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
            {data.agenda?.trim() ? data.agenda : t('meetings.noAgenda')}
          </p>
        </div>
        {data.status === 'HELD' ? (
          <div className="border-t border-line px-4 py-3.5">
            <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">
              {t('meetings.minutes')}
            </h2>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
              {data.minutes}
            </p>
          </div>
        ) : null}
        {data.status === 'CANCELLED' ? (
          <div className="border-t border-line px-4 py-3.5">
            <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">
              {t('meetings.cancelReason')}
            </h2>
            <p className="mt-1.5 text-sm text-ink">
              {data.cancelReason?.trim() ? data.cancelReason : t('meetings.noReason')}
            </p>
          </div>
        ) : null}
        {studentRequest ? (
          <p className="border-t border-line px-4 py-3 text-xs text-muted">{t('meetings.waiting')}</p>
        ) : null}
        {supervisorRequest ? (
          <div className="border-t border-line px-4 py-3">
            <p className="text-xs text-muted">{t('meetings.confirmHelp')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button className="h-8 px-3 text-xs" onClick={() => setConfirming(true)}>
                {t('meetings.confirm')}
              </Button>
              <Button
                variant="secondary"
                className="h-8 px-3 text-xs"
                onClick={() => setCancelling(true)}
              >
                {t('meetings.refuse')}
              </Button>
            </div>
          </div>
        ) : null}
        {planned ? (
          <form
            className="border-t border-line px-4 py-3"
            onSubmit={async (event) => {
              event.preventDefault();
              await hold.mutateAsync({ minutes });
            }}
          >
            <p className="text-xs font-medium text-ink">{t('meetings.minutes')}</p>
            <p className="mt-0.5 text-[11px] text-muted">{t('meetings.minutesHelp')}</p>
            <div className="mt-2">
              <Textarea
                id="meeting-minutes"
                label={t('meetings.minutes')}
                value={minutes}
                rows={3}
                maxLength={4000}
                required
                className="!min-h-16"
                onChange={(event) => setMinutes(event.target.value)}
              />
            </div>
            {hold.error ? (
              <p className="mt-2 text-xs text-danger" role="alert">
                {queryErrorMessage(hold.error, t)}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="submit" className="h-8 px-3 text-xs" disabled={hold.isPending}>
                {t('meetings.markHeld')}
              </Button>
              <IconAction
                tone="danger"
                icon="close"
                label={t('meetings.cancel')}
                onClick={() => setCancelling(true)}
              />
            </div>
          </form>
        ) : null}
      </section>
      <Modal
        open={editing}
        title={studentRequest ? t('meetings.editRequest') : t('meetings.edit')}
        closeLabel={t('common.close')}
        onClose={() => setEditing(false)}
      >
        {studentRequest ? (
          <MeetingRequestForm
            initial={{ title: data.title, agenda: data.agenda ?? undefined }}
            pending={revise.isPending}
            error={revise.error}
            submitLabel={t('meetings.save')}
            onCancel={() => setEditing(false)}
            onSubmit={async (body) => {
              await revise.mutateAsync(body);
              setEditing(false);
            }}
          />
        ) : data.scheduledOn && data.mode ? (
          <MeetingForm
            initial={{
              title: data.title,
              scheduledOn: data.scheduledOn,
              mode: data.mode,
              location: data.location ?? undefined,
              meetingUrl: data.meetingUrl ?? undefined,
              agenda: data.agenda ?? undefined,
            }}
            pending={update.isPending}
            error={update.error}
            submitLabel={t('meetings.save')}
            onCancel={() => setEditing(false)}
            onSubmit={async (body) => {
              await update.mutateAsync(body);
              setEditing(false);
            }}
          />
        ) : null}
      </Modal>
      <Modal
        open={confirming}
        title={t('meetings.confirm')}
        closeLabel={t('common.close')}
        onClose={() => setConfirming(false)}
      >
        <MeetingForm
          initial={{
            title: data.title,
            scheduledOn: data.scheduledOn ?? '',
            mode: data.mode ?? 'ONLINE',
            location: data.location ?? undefined,
            meetingUrl: data.meetingUrl ?? undefined,
            agenda: data.agenda ?? undefined,
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
        open={cancelling}
        title={supervisorRequest ? t('meetings.refuse') : t('meetings.cancel')}
        closeLabel={t('common.close')}
        onClose={() => setCancelling(false)}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await cancel.mutateAsync({ reason: reason.trim() || undefined });
            setCancelling(false);
          }}
        >
          <Textarea
            id="cancel-reason"
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
              {supervisorRequest ? t('meetings.refuse') : t('meetings.cancel')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCancelling(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>
    </article>
  );
}
