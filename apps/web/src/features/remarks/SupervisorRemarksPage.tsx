import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { useThesisMembers } from '../objectives/hooks/use-objectives';
import { QueryError } from '../objectives/components/QueryError';
import { RemarkDetailView } from './components/RemarkDetailView';
import { RemarksWorkspace } from './components/RemarksWorkspace';

export function SupervisorRemarksPage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const thesis = useThesisMembers(thesisId);
  const student = thesis.data?.members.find((member) => member.role === 'DOCTORAL_STUDENT');
  return (
    <div className="min-w-0">
      <header className="mb-6 max-w-2xl">
        <p className="text-sm text-muted">
          <Link to="/encadrement" className="text-brand">
            {t('remarks.students')}
          </Link>
          <span aria-hidden="true"> · </span>
          <Link to={`/encadrement/${thesisId}`} className="text-brand">
            {t('remarks.dossier')}
          </Link>
        </p>
        <h1 className="mt-2 font-serif text-2xl text-ink">{t('remarks.title')}</h1>
        <p className="mt-2 text-sm text-muted">
          {t('remarks.supervisorSubtitle', {
            name: student?.displayName ?? t('remarks.thisStudent'),
          })}
        </p>
      </header>
      {thesis.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {thesis.isError || !thesis.data ? <QueryError error={thesis.error} /> : null}
      {thesis.data ? (
        <RemarksWorkspace
          thesisId={thesisId}
          canCreate={thesis.data.role === 'SUPERVISOR'}
          detailPath={(remarkId) => `/encadrement/${thesisId}/remarques/${remarkId}`}
        />
      ) : null}
    </div>
  );
}

export function SupervisorRemarkDetailPage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const remarkId = params.remarkId ?? '';
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
    <RemarkDetailView
      thesisId={thesisId}
      remarkId={remarkId}
      canCreate={thesis.data.role === 'SUPERVISOR'}
      backTo={`/encadrement/${thesisId}/remarques`}
      trail={[
        { label: t('remarks.students'), to: '/encadrement' },
        {
          label: student?.displayName ?? t('remarks.thisStudent'),
          to: `/encadrement/${thesisId}`,
        },
        { label: t('remarks.title'), to: `/encadrement/${thesisId}/remarques` },
      ]}
    />
  );
}
