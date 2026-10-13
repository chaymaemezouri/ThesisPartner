import { useParams } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { useThesisMembers } from '../objectives/hooks/use-objectives';
import { QueryError } from '../objectives/components/QueryError';
import { MeetingDetailView } from './components/MeetingDetailView';
import { StudentSpaceNav } from '../supervision/StudentSpaceNav';
import { MeetingsWorkspace } from './components/MeetingsWorkspace';

export function SupervisorMeetingsPage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const thesis = useThesisMembers(thesisId);
  return (
    <div className="min-w-0">
      <StudentSpaceNav thesisId={thesisId} />
      <h1 className="sr-only">{t('meetings.title')}</h1>
      {thesis.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {thesis.isError || !thesis.data ? <QueryError error={thesis.error} /> : null}
      {thesis.data ? (
        <MeetingsWorkspace
          thesisId={thesisId}
          canCreate={thesis.data.role === 'SUPERVISOR'}
          canRequest={false}
          detailPath={(meetingId) => `/encadrement/${thesisId}/reunions/${meetingId}`}
        />
      ) : null}
    </div>
  );
}

export function SupervisorMeetingDetailPage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const meetingId = params.meetingId ?? '';
  const thesis = useThesisMembers(thesisId);
  if (thesis.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (thesis.isError || !thesis.data) return <QueryError error={thesis.error} />;
  const student = thesis.data.members.find((member) => member.role === 'DOCTORAL_STUDENT');
  return (
    <MeetingDetailView
      thesisId={thesisId}
      meetingId={meetingId}
      canManage={thesis.data.role === 'SUPERVISOR'}
      canRequest={false}
      backTo={`/encadrement/${thesisId}/reunions`}
      trail={[
        { label: t('remarks.students'), to: '/encadrement' },
        {
          label: student?.displayName ?? t('remarks.thisStudent'),
          to: `/encadrement/${thesisId}`,
        },
        { label: t('meetings.title'), to: `/encadrement/${thesisId}/reunions` },
      ]}
    />
  );
}
