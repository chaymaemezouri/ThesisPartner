import { Link } from 'react-router-dom';
import { Avatar, EmptyState, Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { QueryError } from '../objectives/components/QueryError';
import { useSupervisedTheses } from './hooks/use-supervised-theses';

export function SupervisorDeliverablesIndex() {
  const t = useT();
  const supervised = useSupervisedTheses();

  return (
    <div className="min-w-0">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{t('supervision.deliverables')}</h1>
        <p className="mt-1 text-sm text-muted">{t('supervision.deliverablesPick')}</p>
      </header>
      {supervised.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-20" />
        </div>
      ) : null}
      {supervised.isError ? <QueryError error={supervised.error} /> : null}
      {supervised.data && supervised.data.theses.length === 0 ? (
        <EmptyState
          title={t('supervision.empty')}
          description={t('supervision.deliverablesEmptyDesc')}
        />
      ) : null}
      <ul className="grid gap-3">
        {supervised.data?.theses.map((thesis) => {
          const student = thesis.doctoralStudent;
          const name = student
            ? `${student.givenName} ${student.familyName}`
            : t('supervision.studentFallback');
          const deliverableLabel =
            thesis.deliverableCount === 1
              ? t('supervision.deliverableCountOne')
              : t('supervision.deliverableCountMany', { count: thesis.deliverableCount });
          return (
            <li className="rounded-2xl border border-line bg-surface p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-150 hover:border-[#d5deea] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]" key={thesis.thesisId}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  to={`/encadrement/${thesis.thesisId}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <Avatar label={name} imageUrl={student?.avatarUrl} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{name}</span>
                    <span className="block truncate text-sm text-muted">{thesis.title}</span>
                  </span>
                </Link>
                <Link
                  to={`/encadrement/${thesis.thesisId}/livrables`}
                  className="text-sm font-medium text-brand"
                >
                  {deliverableLabel}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
