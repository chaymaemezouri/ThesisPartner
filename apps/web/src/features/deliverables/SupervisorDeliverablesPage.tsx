import { useParams } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { useThesisMembers } from '../objectives/hooks/use-objectives';
import { QueryError } from '../objectives/components/QueryError';
import { DeliverableDetailView } from './components/DeliverableDetailView';
import { StudentSpaceNav } from '../supervision/StudentSpaceNav';
import { DeliverablesWorkspace } from './components/DeliverablesWorkspace';

export function SupervisorDeliverablesPage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const thesis = useThesisMembers(thesisId);
  return (
    <div className="min-w-0">
      <StudentSpaceNav thesisId={thesisId} />
      <h1 className="sr-only">{t('deliverables.title')}</h1>
      {thesis.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {thesis.isError || !thesis.data ? <QueryError error={thesis.error} /> : null}
      {thesis.data ? (
        <DeliverablesWorkspace
          thesisId={thesisId}
          canCreate={thesis.data.role === 'DOCTORAL_STUDENT'}
          canRemark={thesis.data.role === 'SUPERVISOR'}
          tabsAside
          detailPath={(deliverableId) => `/encadrement/${thesisId}/livrables/${deliverableId}`}
        />
      ) : null}
    </div>
  );
}

export function SupervisorDeliverableDetailPage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const deliverableId = params.deliverableId ?? '';
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
    <DeliverableDetailView
      thesisId={thesisId}
      deliverableId={deliverableId}
      canEdit={thesis.data.role === 'DOCTORAL_STUDENT'}
      canReview={thesis.data.role === 'SUPERVISOR'}
      backTo={`/encadrement/${thesisId}/livrables`}
      objectivePath={(objectiveId) => `/encadrement/${thesisId}/objectifs/${objectiveId}`}
      trail={[
        { label: t('objectives.supervisor.students'), to: '/encadrement' },
        {
          label: student?.displayName ?? t('remarks.thisStudent'),
          to: `/encadrement/${thesisId}/objectifs`,
        },
        { label: t('deliverables.title'), to: `/encadrement/${thesisId}/livrables` },
      ]}
    />
  );
}
