import { Button, Input, Textarea } from '@thesispartner/ui';
import { useState } from 'react';
import { useT } from '../../../i18n/LocaleContext';
import { queryErrorMessage } from '../../objectives/components/QueryError';
import type { MeetingDraft } from '../hooks/use-meetings';

export function MeetingRequestForm({
  initial,
  pending,
  error,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial?: { title: string; agenda?: string };
  pending: boolean;
  error: unknown;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (body: { title: string; agenda?: string }) => Promise<void>;
}) {
  const t = useT();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [agenda, setAgenda] = useState(initial?.agenda ?? '');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        try {
          await onSubmit({ title, agenda: agenda.trim() || undefined });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <Input
        id="request-title"
        label={t('meetings.subject')}
        value={title}
        maxLength={200}
        required
        onChange={(event) => setTitle(event.target.value)}
      />
      <Textarea
        id="request-agenda"
        label={t('meetings.agenda')}
        value={agenda}
        maxLength={4000}
        rows={3}
        className="!min-h-16"
        onChange={(event) => setAgenda(event.target.value)}
      />
      <p className="text-[11px] text-muted">{t('meetings.requestHelp')}</p>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {queryErrorMessage(error, t)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || submitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

export function MeetingForm({
  initial,
  pending,
  error,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial?: MeetingDraft;
  pending: boolean;
  error: unknown;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (body: MeetingDraft) => Promise<void>;
}) {
  const t = useT();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [scheduledOn, setScheduledOn] = useState(initial?.scheduledOn ?? '');
  const [mode, setMode] = useState<'ONLINE' | 'IN_PERSON'>(initial?.mode ?? 'ONLINE');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [meetingUrl, setMeetingUrl] = useState(initial?.meetingUrl ?? '');
  const [agenda, setAgenda] = useState(initial?.agenda ?? '');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        try {
          await onSubmit({
            title,
            scheduledOn,
            mode,
            location: mode === 'IN_PERSON' ? location.trim() : undefined,
            meetingUrl: mode === 'ONLINE' ? meetingUrl.trim() : undefined,
            agenda: agenda.trim() || undefined,
          });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <Input
        id="meeting-title"
        label={t('meetings.subject')}
        value={title}
        maxLength={200}
        required
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input
        id="meeting-date"
        label={t('meetings.date')}
        type="date"
        value={scheduledOn}
        required
        onChange={(event) => setScheduledOn(event.target.value)}
      />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">{t('meetings.mode')}</legend>
        <div className="flex gap-2">
          {(['ONLINE', 'IN_PERSON'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              className={
                mode === value
                  ? 'rounded-md bg-brand px-3 py-1.5 text-xs text-white'
                  : 'rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-ink'
              }
              onClick={() => setMode(value)}
            >
              {t(`meetings.modeLabel.${value}`)}
            </button>
          ))}
        </div>
      </fieldset>
      {mode === 'ONLINE' ? (
        <div className="flex flex-col gap-1.5">
          <Input
            id="meeting-url"
            label={t('meetings.link')}
            type="url"
            value={meetingUrl}
            maxLength={500}
            placeholder="https://"
            onChange={(event) => setMeetingUrl(event.target.value)}
          />
          <p className="text-xs text-muted">{t('meetings.videoHelp')}</p>
        </div>
      ) : (
        <Input
          id="meeting-place"
          label={t('meetings.place')}
          value={location}
          maxLength={300}
          required
          onChange={(event) => setLocation(event.target.value)}
        />
      )}
      <Textarea
        id="meeting-agenda"
        label={t('meetings.agenda')}
        value={agenda}
        maxLength={4000}
        rows={3}
        className="!min-h-16"
        onChange={(event) => setAgenda(event.target.value)}
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {queryErrorMessage(error, t)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || submitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
