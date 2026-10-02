import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { formatShortDay } from '../dashboard/labels';
import { ObjectivesWorkspace } from '../objectives/components/ObjectivesWorkspace';
import { QueryError } from '../objectives/components/QueryError';
import { useSupervisedTheses } from './hooks/use-supervised-theses';

export function SupervisorDossierPage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const supervised = useSupervisedTheses();
  const thesis = supervised.data?.theses.find((item) => item.thesisId === thesisId);

  if (supervised.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (supervised.isError) return <QueryError error={supervised.error} />;
  if (!thesis) {
    return <p className="text-sm text-muted">{t('supervision.studentNotFound')}</p>;
  }

  const student = thesis.doctoralStudent;
  const name = student ? `${student.givenName} ${student.familyName}` : t('remarks.thisStudent');
  const supervisor =
    thesis.supervisors.map((item) => item.displayName).join(', ') || t('common.notProvided');

  return (
    <div className="min-w-0">
      <p className="text-sm">
        <Link to="/encadrement" className="font-medium text-brand">
          {t('supervision.title')}
        </Link>
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">{name}</h1>
      <p className="text-sm text-muted">{thesis.title}</p>
      <article className="mt-4 grid gap-4 rounded-2xl border border-line bg-gradient-to-r from-brand-soft via-surface to-teal-soft p-3 text-sm shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:grid-cols-4">
        <Fact label={t('supervision.supervisor')} value={supervisor} />
        <Fact
          label={t('supervision.university')}
          value={thesis.institution ?? student?.institution}
        />
        <Fact
          label={t('supervision.startDate')}
          value={thesis.startedOn ? formatShortDay(thesis.startedOn) : null}
        />
        <Fact
          label={t('supervision.duration')}
          value={
            thesis.durationYears === null
              ? null
              : t('supervision.years', { count: thesis.durationYears })
          }
        />
      </article>
      <p className="mt-3 flex flex-wrap gap-4">
        <Link
          to={`/encadrement/${thesis.thesisId}/livrables`}
          className="text-sm font-medium text-brand"
        >
          {t('supervision.deliverables')}
        </Link>
        <Link
          to={`/encadrement/${thesis.thesisId}/remarques`}
          className="text-sm font-medium text-brand"
        >
          {t('supervision.remarks')}
        </Link>
      </p>
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-ink">{t('supervision.objectivesFollowUp')}</h2>
        <div className="mt-3">
          <ObjectivesWorkspace
            thesisId={thesisId}
            canManage
            detailPath={(objectiveId) => `/encadrement/${thesisId}/objectifs/${objectiveId}`}
          />
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  const t = useT();
  return (
    <div className="min-w-0">
      <p className="text-muted">{label}</p>
      <p className="truncate font-medium text-ink">
        {value && value.length > 0 ? value : t('common.notProvided')}
      </p>
    </div>
  );
}
