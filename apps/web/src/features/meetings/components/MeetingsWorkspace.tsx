import { EmptyState, Modal, Skeleton } from '@thesispartner/ui';
import { IconAction } from '../../../components/IconAction';
import { useState } from 'react';
import { useT } from '../../../i18n/LocaleContext';
import { QueryError } from '../../objectives/components/QueryError';
import { useCreateMeeting, useMeetings, useRequestMeeting } from '../hooks/use-meetings';
import { MeetingCalendar } from './MeetingCalendar';
import { MeetingForm, MeetingRequestForm } from './MeetingForm';
import { MeetingList } from './MeetingList';

export function MeetingsWorkspace({
  thesisId,
  canCreate,
  canRequest,
  detailPath,
}: {
  thesisId: string;
  canCreate: boolean;
  canRequest: boolean;
  detailPath: (meetingId: string) => string;
}) {
  const t = useT();
  const meetings = useMeetings(thesisId);
  const create = useCreateMeeting(thesisId);
  const request = useRequestMeeting(thesisId);
  const [creating, setCreating] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const upcoming = meetings.data?.upcoming ?? [];
  const history = meetings.data?.history ?? [];
  const empty = upcoming.length === 0 && history.length === 0;

  return (
    <div className="min-w-0">
      {canCreate || canRequest ? (
        <div className="mb-3 flex justify-end gap-2">
          {canRequest ? (
            <IconAction
              label={t('meetings.request')}
              icon="plus"
              onClick={() => setRequesting(true)}
            />
          ) : null}
          {canCreate ? (
            <IconAction label={t('meetings.new')} icon="plus" onClick={() => setCreating(true)} />
          ) : null}
        </div>
      ) : null}
      {meetings.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {meetings.isError ? <QueryError error={meetings.error} /> : null}
      {meetings.data ? (
        <div className="grid items-start gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
          <MeetingCalendar meetings={[...upcoming, ...history]} detailPath={detailPath} />
          {empty ? (
            <EmptyState
              title={t('meetings.emptyTitle')}
              description={
                canCreate
                  ? t('meetings.emptyDescriptionSupervisor')
                  : t('meetings.emptyDescriptionStudent')
              }
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-line bg-surface">
              <section aria-labelledby="meetings-upcoming">
                <h2
                  id="meetings-upcoming"
                  className="border-b border-line px-3 py-2 text-[11px] font-medium tracking-wide text-muted uppercase"
                >
                  {t('meetings.upcoming')}
                </h2>
                {upcoming.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-muted">{t('meetings.emptyUpcoming')}</p>
                ) : (
                  <MeetingList meetings={upcoming} detailPath={detailPath} />
                )}
              </section>
              <section className="border-t border-line" aria-labelledby="meetings-history">
                <h2
                  id="meetings-history"
                  className="border-b border-line px-3 py-2 text-[11px] font-medium tracking-wide text-muted uppercase"
                >
                  {t('meetings.history')}
                </h2>
                {history.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-muted">{t('meetings.emptyHistory')}</p>
                ) : (
                  <MeetingList meetings={history} detailPath={detailPath} />
                )}
              </section>
            </div>
          )}
        </div>
      ) : null}
      <Modal
        open={creating}
        title={t('meetings.new')}
        closeLabel={t('common.close')}
        onClose={() => setCreating(false)}
      >
        <MeetingForm
          pending={create.isPending}
          error={create.error}
          submitLabel={t('meetings.create')}
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            await create.mutateAsync(body);
            setCreating(false);
          }}
        />
      </Modal>
      <Modal
        open={requesting}
        title={t('meetings.request')}
        closeLabel={t('common.close')}
        onClose={() => setRequesting(false)}
      >
        <MeetingRequestForm
          pending={request.isPending}
          error={request.error}
          submitLabel={t('meetings.requestSubmit')}
          onCancel={() => setRequesting(false)}
          onSubmit={async (body) => {
            await request.mutateAsync(body);
            setRequesting(false);
          }}
        />
      </Modal>
    </div>
  );
}
