import { Link, useParams } from 'react-router-dom';
import { EmptyState, Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { useDashboard } from '../dashboard/hooks/use-dashboard';
import { QueryError } from '../objectives/components/QueryError';
import { RemarkDetailView } from './components/RemarkDetailView';
import { RemarksWorkspace } from './components/RemarksWorkspace';

export function DoctoralRemarksPage() {
  const t = useT();
  const dashboard = useDashboard();
  return (
    <div className="min-w-0">
      <header className="mb-6 max-w-2xl">
        <h1 className="font-serif text-2xl text-ink">{t('remarks.title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('remarks.subtitle')}</p>
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
        <RemarksWorkspace
          thesisId={dashboard.data.thesis.id}
          canCreate={false}
          detailPath={(remarkId) => `/remarques/${remarkId}`}
        />
      ) : null}
    </div>
  );
}

export function DoctoralRemarkDetailPage() {
  const t = useT();
  const params = useParams();
  const dashboard = useDashboard();
  const remarkId = params.remarkId ?? '';
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
    <RemarkDetailView
      thesisId={dashboard.data.thesis.id}
      remarkId={remarkId}
      canCreate={false}
      backTo="/remarques"
    />
  );
}
