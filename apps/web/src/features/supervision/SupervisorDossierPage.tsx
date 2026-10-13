import { useParams } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { ActivityList } from '../dashboard/components/ActivityList';
import { UpcomingDeadlines } from '../dashboard/components/UpcomingDeadlines';
import { QueryError } from '../objectives/components/QueryError';
import { useStudentSpace } from './hooks/use-supervised-theses';
import { StudentSpaceNav } from './StudentSpaceNav';

export function SupervisorDossierPage() {
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const space = useStudentSpace(thesisId);
  const root = `/encadrement/${thesisId}`;

  if (space.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (space.isError || !space.data) return <QueryError error={space.error} />;

  const data = space.data;
  return (
    <div className="min-w-0">
      <StudentSpaceNav thesisId={thesisId} />
      <UpcomingDeadlines deadlines={data.upcomingDeadlines} scope={root} />
      <div className="mt-4">
        <ActivityList activity={data.recentActivity} scope={root} />
      </div>
    </div>
  );
}
