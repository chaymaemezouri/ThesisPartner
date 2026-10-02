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
    <div className="relative min-w-0">
      <header className={`mb-6 max-w-2xl ${dashboard.data?.thesis ? 'sm:pr-52' : ''}`}>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{t('objectives.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('objectives.subtitle')}</p>
      </header>
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
          pinAction
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
