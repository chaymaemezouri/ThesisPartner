import { Link, useParams } from 'react-router-dom';
import { EmptyState, Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { useDashboard } from '../dashboard/hooks/use-dashboard';
import { ObjectiveDetailView } from './components/ObjectiveDetailView';
import { ObjectivesWorkspace } from './components/ObjectivesWorkspace';
import { QueryError } from './components/QueryError';

export function DoctoralObjectivesPage() {
  const t = useT();
  const dashboard = useDashboard();
  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('objectives.title')}</h1>
      {dashboard.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {dashboard.isError ? <QueryError error={dashboard.error} /> : null}
      {dashboard.data && !dashboard.data.thesis ? (
        <div>
          <EmptyState
            title={t('deliverables.emptyThesisTitle')}
            description={t('objectives.emptyDescription')}
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
        <ObjectivesWorkspace
          thesisId={dashboard.data.thesis.id}
          canManage
          tabsAside
          detailPath={(objectiveId) => `/objectifs/${objectiveId}`}
        />
      ) : null}
    </div>
  );
}

export function DoctoralObjectiveDetailPage() {
  const t = useT();
  const params = useParams();
  const dashboard = useDashboard();
  const objectiveId = params.objectiveId ?? '';
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
        title={t('deliverables.emptyThesisTitle')}
        description={t('objectives.emptyDescription')}
      />
    );
  }
  return (
    <ObjectiveDetailView
      thesisId={dashboard.data.thesis.id}
      objectiveId={objectiveId}
      canManage
      studentView
      backTo="/objectifs"
    />
  );
}
