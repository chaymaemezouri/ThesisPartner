import { Link } from 'react-router-dom';
import { Avatar, EmptyState, Skeleton } from '@thesispartner/ui';
import { Icon } from '../../components/Icon';
import { useT } from '../../i18n/LocaleContext';
import { QueryError } from '../objectives/components/QueryError';
import { useSupervisedTheses } from './hooks/use-supervised-theses';

export function SupervisorDeliverablesIndex() {
  const t = useT();
  const supervised = useSupervisedTheses();

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('supervision.deliverables')}</h1>
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
          const pending = thesis.pendingValidationCount;
          return (
            <li key={thesis.thesisId}>
              <Link
                to={`/encadrement/${thesis.thesisId}/livrables`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-150 hover:border-brand"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar label={name} imageUrl={student?.avatarUrl} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{name}</span>
                    <span className="block truncate text-sm text-muted">{thesis.title}</span>
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {pending > 0 ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn"
                      aria-label={t('supervision.alertPending', { count: pending })}
                    >
                      <Icon name="notice" className="h-3.5 w-3.5" />
                      {pending}
                    </span>
                  ) : null}
                  <span className="text-sm font-medium text-brand">{deliverableLabel}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
