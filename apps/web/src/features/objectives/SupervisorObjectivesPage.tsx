import { useParams } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { useThesisMembers } from './hooks/use-objectives';
import { ObjectiveDetailView } from './components/ObjectiveDetailView';
import { ObjectivesWorkspace } from './components/ObjectivesWorkspace';
import { QueryError } from './components/QueryError';
import { StudentSpaceNav } from '../supervision/StudentSpaceNav';

export function SupervisorObjectivesPage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const thesis = useThesisMembers(thesisId);
  return (
    <div className="min-w-0">
      <StudentSpaceNav thesisId={thesisId} />
      <h1 className="sr-only">{t('objectives.supervisor.title')}</h1>
      {thesis.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-16" />
        </div>
      ) : null}
      {thesis.isError ? <QueryError error={thesis.error} /> : null}
      {thesis.data ? (
        <ObjectivesWorkspace
          thesisId={thesisId}
          canManage={thesis.data.role === 'SUPERVISOR'}
          tabsAside
          canRemark={thesis.data.role === 'SUPERVISOR'}
          detailPath={(objectiveId) => `/encadrement/${thesisId}/objectifs/${objectiveId}`}
        />
      ) : null}
    </div>
  );
}

export function SupervisorObjectiveDetailPage() {
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const objectiveId = params.objectiveId ?? '';
  const thesis = useThesisMembers(thesisId);
  if (thesis.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (thesis.isError || !thesis.data) return <QueryError error={thesis.error} />;
  return (
    <ObjectiveDetailView
      thesisId={thesisId}
      objectiveId={objectiveId}
      canManage={thesis.data.role === 'SUPERVISOR'}
      canRemark={thesis.data.role === 'SUPERVISOR'}
      backTo={`/encadrement/${thesisId}`}
    />
  );
}
