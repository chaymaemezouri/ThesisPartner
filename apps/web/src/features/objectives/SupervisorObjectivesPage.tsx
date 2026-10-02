import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { useThesisMembers } from './hooks/use-objectives';
import { ObjectiveDetailView } from './components/ObjectiveDetailView';
import { ObjectivesWorkspace } from './components/ObjectivesWorkspace';
import { QueryError } from './components/QueryError';

export function SupervisorObjectivesPage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const thesis = useThesisMembers(thesisId);
  return (
    <div className="min-w-0">
      <header className="mb-6 max-w-2xl">
        <p className="text-sm text-muted">
          <Link to="/encadrement" className="text-brand">
            {t('objectives.supervisor.students')}
          </Link>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">
          {t('objectives.supervisor.title')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('objectives.supervisor.subtitle')}</p>
        {thesis.data ? <p className="mt-1 text-sm text-ink">{thesis.data.title}</p> : null}
      </header>
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
      backTo={`/encadrement/${thesisId}`}
    />
  );
}
