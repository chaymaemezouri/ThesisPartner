import { Link, useParams } from 'react-router-dom';
import { EmptyState, Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { useDashboard } from '../dashboard/hooks/use-dashboard';
import { QueryError } from '../objectives/components/QueryError';
import { MeetingDetailView } from './components/MeetingDetailView';
import { MeetingsWorkspace } from './components/MeetingsWorkspace';

export function DoctoralMeetingsPage() {
  const t = useT();
  const dashboard = useDashboard();
  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('meetings.title')}</h1>
      {dashboard.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {dashboard.isError ? <QueryError error={dashboard.error} /> : null}
      {dashboard.data && !dashboard.data.thesis ? (
        <div>
          <EmptyState
            title={t('remarks.emptyThesisTitle')}
            description={t('remarks.emptyThesisDescription')}
          />
          <p className="mt-4">
            <Link
              to="/profil"
              className="inline-flex rounded-md bg-brand px-3 py-2 text-sm font-medium text-white"
            >
              {t('common.profile')}
            </Link>
          </p>
        </div>
      ) : null}
      {dashboard.data?.thesis ? (
        <MeetingsWorkspace
          thesisId={dashboard.data.thesis.id}
          canCreate={false}
          canRequest
          detailPath={(meetingId) => `/reunions/${meetingId}`}
        />
      ) : null}
    </div>
  );
}

export function DoctoralMeetingDetailPage() {
  const t = useT();
  const params = useParams();
  const dashboard = useDashboard();
  const meetingId = params.meetingId ?? '';
  if (dashboard.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (dashboard.isError || !dashboard.data) return <QueryError error={dashboard.error} />;
  if (!dashboard.data.thesis) {
    return (
      <EmptyState
        title={t('remarks.emptyThesisTitle')}
        description={t('remarks.emptyThesisDescription')}
      />
    );
  }
  return (
    <MeetingDetailView
      thesisId={dashboard.data.thesis.id}
      meetingId={meetingId}
      canManage={false}
      canRequest
      backTo="/reunions"
    />
  );
}
