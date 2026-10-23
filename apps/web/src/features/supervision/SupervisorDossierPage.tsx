import { useParams } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { ActivityList } from '../dashboard/components/ActivityList';
import { ThesisProgressSummary } from '../dashboard/components/ThesisProgressSummary';
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
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0 lg:col-span-2">
          <ThesisProgressSummary
            thesis={data.thesis}
            progress={data.progress}
            workProgress={data.workProgress}
            objectives={data.objectives}
            deliverables={data.deliverables}
            showThesisLink={false}
            variant="supervisor"
            paths={{
              objectives: `${root}/objectifs`,
              deliverables: `${root}/livrables`,
            }}
          />
        </div>
        <UpcomingDeadlines deadlines={data.upcomingDeadlines} scope={root} />
      </div>
      <div className="mt-4">
        <ActivityList activity={data.recentActivity} scope={root} />
      </div>
    </div>
  );
}
