import { Link, Navigate } from 'react-router-dom';
import { Avatar, Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { QueryError } from '../objectives/components/QueryError';
import { useSupervisedTheses } from './hooks/use-supervised-theses';

export function SupervisionPage() {
  const t = useT();
  const supervised = useSupervisedTheses();

  if (supervised.isSuccess && supervised.data.theses.length === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-w-0">
      <header className="mb-6 max-w-2xl">
        <h1 className="font-serif text-2xl text-ink">{t('supervision.title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('supervision.subtitle')}</p>
      </header>
      {supervised.isLoading ? (
        <div className="grid gap-3" aria-busy="true">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : null}
      {supervised.isError ? <QueryError error={supervised.error} /> : null}
      {supervised.data && supervised.data.theses.length > 0 ? (
        <ul className="grid min-w-0 gap-3">
          {supervised.data.theses.map((thesis) => {
            const student = thesis.doctoralStudent;
            const name = student
              ? `${student.givenName} ${student.familyName}`
              : t('common.notProvided');
            return (
              <li
                key={thesis.thesisId}
                className="min-w-0 rounded-2xl border border-line bg-gradient-to-r from-brand-soft/80 via-surface to-teal-soft/60 p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-150 hover:border-[#d5deea] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar label={name} imageUrl={student?.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{name}</p>
                    <p className="truncate text-sm text-ink">{thesis.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {thesis.discipline ?? t('common.notProvided')} ·{' '}
                      {thesis.institution ?? t('common.notProvided')}
                    </p>
                    {thesis.doctoralStudents.length > 1 ? (
                      <p className="mt-1 text-sm text-muted">
                        {t('supervision.students')}:{' '}
                        {thesis.doctoralStudents
                          .map((item) => `${item.givenName} ${item.familyName}`)
                          .join(', ')}
                      </p>
                    ) : null}
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <Count label={t('supervision.total')} value={thesis.objectiveSummary.total} />
                      <Count
                        label={t('supervision.inProgress')}
                        value={thesis.objectiveSummary.inProgress}
                      />
                      <Count
                        label={t('supervision.completed')}
                        value={thesis.objectiveSummary.completed}
                      />
                      <Count
                        label={t('supervision.overdue')}
                        value={thesis.objectiveSummary.overdue}
                      />
                    </dl>
                    <p className="mt-3 flex flex-wrap gap-4">
                      <Link
                        to={`/encadrement/${thesis.thesisId}`}
                        className="text-sm font-medium text-brand"
                      >
                        {t('supervision.viewFollowUp')}
                      </Link>
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
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
