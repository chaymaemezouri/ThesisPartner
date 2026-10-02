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
      <header className="mb-3 max-w-2xl sm:mb-5">
        <h1 className="font-serif text-xl text-ink sm:text-2xl">{t('deliverables.title')}</h1>
        <p className="mt-1 text-xs text-muted sm:mt-2 sm:text-sm">{t('deliverables.subtitle')}</p>
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
