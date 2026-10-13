import { Link, useParams } from 'react-router-dom';
import { EmptyState, Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { useDashboard } from '../dashboard/hooks/use-dashboard';
import { QueryError } from '../objectives/components/QueryError';
import { DeliverableDetailView } from './components/DeliverableDetailView';
import { DeliverablesWorkspace } from './components/DeliverablesWorkspace';

export function DoctoralDeliverablesPage() {
  const t = useT();
  const dashboard = useDashboard();
  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('deliverables.title')}</h1>
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
            description={t('deliverables.emptyThesisDescription')}
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
        <DeliverablesWorkspace
          thesisId={dashboard.data.thesis.id}
          canCreate
          tabsAside
          detailPath={(deliverableId) => `/livrables/${deliverableId}`}
        />
      ) : null}
    </div>
  );
}

export function DoctoralDeliverableDetailPage() {
  const t = useT();
  const params = useParams();
  const dashboard = useDashboard();
  const deliverableId = params.deliverableId ?? '';
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
        description={t('deliverables.emptyThesisDescription')}
      />
    );
  }
  return (
    <DeliverableDetailView
      thesisId={dashboard.data.thesis.id}
      deliverableId={deliverableId}
      canEdit
      canReview={false}
      backTo="/livrables"
      objectivePath={(objectiveId) => `/objectifs/${objectiveId}`}
    />
  );
}
