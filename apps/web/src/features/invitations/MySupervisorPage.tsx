import { useQuery } from '@tanstack/react-query';
import { thesisDetailSchema, thesisListSchema } from '@thesispartner/validation';
import { Link, Navigate } from 'react-router-dom';
import { EmptyState, Skeleton } from '@thesispartner/ui';
import { apiGet } from '../../api/client';
import { formErrorMessage } from '../../forms/api-errors';
import { useT } from '../../i18n/LocaleContext';
import { useSupervisedTheses } from '../supervision/hooks/use-supervised-theses';
import { isSupervisorWorkspace } from '../supervision/workspace-mode';
import { primaryThesis } from '../theses/primary-thesis';
import { ThesisInvitationsPanel } from './ThesisInvitationsPanel';

export function MySupervisorPage() {
  const t = useT();
  const supervised = useSupervisedTheses();
  const list = useQuery({
    queryKey: ['theses'],
    queryFn: () => apiGet('/api/v1/theses', thesisListSchema),
    enabled: supervised.isSuccess && !isSupervisorWorkspace(supervised.data),
  });

  if (supervised.isSuccess && isSupervisorWorkspace(supervised.data)) {
    return <Navigate to="/encadrement" replace />;
  }

  const thesisSummary = list.data ? primaryThesis(list.data.theses) : null;

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('nav.mySupervisor')}</h1>
      <p className="text-sm text-muted">{t('nav.mySupervisorDesc')}</p>

      {supervised.isLoading || list.isLoading ? (
        <div className="mt-6" aria-busy="true">
          <Skeleton className="h-40" />
        </div>
      ) : null}

      {list.isError ? (
        <p className="mt-6 text-sm text-danger" role="alert">
          {formErrorMessage(list.error, t)}
        </p>
      ) : null}

      {list.data && !thesisSummary ? (
        <div className="mt-6">
          <EmptyState
            title={t('invitations.emptyThesisTitle')}
            description={t('invitations.emptyThesisDescription')}
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

      {thesisSummary ? <SupervisorDossier thesisId={thesisSummary.id} /> : null}
    </div>
  );
}

function SupervisorDossier({ thesisId }: { thesisId: string }) {
  const t = useT();
  const detail = useQuery({
    queryKey: ['theses', thesisId],
    queryFn: () => apiGet(`/api/v1/theses/${thesisId}`, thesisDetailSchema),
  });

  if (detail.isLoading) {
    return (
      <div className="mt-6" aria-busy="true">
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <p className="mt-6 text-sm text-danger" role="alert">
        {formErrorMessage(detail.error, t)}
      </p>
    );
  }

  const thesis = detail.data;
  const supervisor = thesis.members.find((member) => member.role === 'SUPERVISOR');

  return (
    <article className="mt-6 rounded-2xl border border-line bg-gradient-to-r from-teal-soft/80 via-surface to-brand-soft p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {t('invitations.thesis')}
        </p>
        <h2 className="mt-1 text-sm font-semibold text-ink">{thesis.title}</h2>
      </div>
      <ThesisInvitationsPanel
        thesisId={thesis.id}
        hasSupervisor={Boolean(supervisor)}
        canManage={thesis.role === 'DOCTORAL_STUDENT'}
        standalone
          supervisor={
            supervisor
              ? {
                  givenName: supervisor.givenName,
                  familyName: supervisor.familyName,
                  displayName: supervisor.displayName,
                  email: supervisor.email,
                  phone: supervisor.phone,
                  institution: supervisor.institution,
                  specialty: supervisor.specialty,
                  academicTitle: supervisor.academicTitle,
                  avatarUrl: supervisor.avatarUrl,
                  laboratory: supervisor.laboratory,
                  doctoralSchool: supervisor.doctoralSchool,
                  orcid: supervisor.orcid,
                  googleScholarUrl: supervisor.googleScholarUrl,
                  linkedinUrl: supervisor.linkedinUrl,
                }
              : null
          }
      />
    </article>
  );
}
