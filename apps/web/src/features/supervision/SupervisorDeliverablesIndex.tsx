import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Avatar, EmptyState, Input, Skeleton } from '@thesispartner/ui';
import { Icon } from '../../components/Icon';
import { useLocale, useT } from '../../i18n/LocaleContext';
import { QueryError } from '../objectives/components/QueryError';
import { useSupervisedTheses } from './hooks/use-supervised-theses';

export function SupervisorDeliverablesIndex() {
  const t = useT();
  const navigate = useNavigate();
  const supervised = useSupervisedTheses();
  const { dateLocale } = useLocale();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'students' ? 'students' : 'review';
  const [search, setSearch] = useState('');
  const theses = supervised.data?.theses ?? [];
  const totalPending = theses.reduce((count, thesis) => count + thesis.pendingValidationCount, 0);
  const queue = theses
    .flatMap((thesis) =>
      thesis.pendingDeliverables.map((item) => ({
        ...item,
        thesisId: thesis.thesisId,
        studentName: thesis.doctoralStudent
          ? `${thesis.doctoralStudent.givenName} ${thesis.doctoralStudent.familyName}`
          : t('supervision.studentFallback'),
      })),
    )
    .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));
  const needle = search.trim().toLocaleLowerCase();
  const visible = queue.filter((item) =>
    `${item.title} ${item.studentName}`.toLocaleLowerCase().includes(needle),
  );

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('supervision.deliverables')}</h1>
      <div
        role="tablist"
        aria-label={t('supervision.deliverables')}
        className="mb-4 flex flex-wrap justify-center gap-1 rounded-2xl border border-line/80 bg-line/45 p-1.5"
      >
        {(['review', 'students'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={`rounded-xl px-3 py-2 text-xs transition-[background-color,box-shadow,color] ${
              view === id
                ? 'bg-surface font-semibold text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                : 'font-medium text-ink/80 hover:bg-surface/70'
            }`}
            onClick={() => {
              const copy = new URLSearchParams(params);
              copy.set('view', id);
              setParams(copy);
            }}
          >
            {t(id === 'review' ? 'deliverables.toReview' : 'deliverables.byStudent')}
            {id === 'review' ? ` (${totalPending})` : ''}
          </button>
        ))}
      </div>
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
      {supervised.data && theses.length > 0 && view === 'review' ? (
        <section>
          <div className="mb-4 max-w-md">
            <Input
              id="review-search"
              label={t('common.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {queue.length < totalPending ? (
            <p className="mb-3 text-xs text-muted">
              {t('deliverables.queueLimited', { shown: queue.length, total: totalPending })}
            </p>
          ) : null}
          {visible.length === 0 ? (
            <EmptyState
              title={t(needle ? 'deliverables.noMatches' : 'deliverables.noReview')}
              description={t(needle ? 'deliverables.noMatchesHelp' : 'deliverables.noReviewHelp')}
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-line bg-surface">
              <table
                className="block w-full table-fixed text-left sm:table"
                aria-label={t('deliverables.toReview')}
              >
                <thead className="hidden border-b border-line bg-canvas/60 text-[10px] tracking-wide text-muted uppercase sm:table-header-group">
                  <tr>
                    <th scope="col" className="w-[35%] px-4 py-3">
                      {t('deliverables.itemLabel')}
                    </th>
                    <th scope="col" className="w-[25%] px-3 py-3">
                      {t('deliverables.studentLabel')}
                    </th>
                    <th scope="col" className="px-3 py-3">
                      {t('deliverables.versions')}
                    </th>
                    <th scope="col" className="px-3 py-3">
                      {t('deliverables.submittedOn')}
                    </th>
                    <th scope="col" className="w-28 px-3 py-3">
                      <span className="sr-only">{t('deliverables.reviewDocument')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="block divide-y divide-line sm:table-row-group">
                  {visible.map((item) => {
                    const href = `/encadrement/${item.thesisId}/livrables/${item.id}`;
                    return (
                      <tr
                        key={`${item.thesisId}-${item.id}`}
                        className="group grid cursor-pointer grid-cols-2 gap-3 p-4 transition-colors hover:bg-brand-soft/35 focus-within:bg-brand-soft/35 sm:table-row sm:p-0"
                        onClick={(event) => {
                          if (
                            event.target instanceof Element &&
                            event.target.closest('a,button,input,select')
                          )
                            return;
                          if (window.getSelection()?.toString()) return;
                          void navigate(href);
                        }}
                      >
                        <td className="col-span-2 min-w-0 sm:px-4 sm:py-4 sm:align-top">
                          <Link
                            to={href}
                            className="break-words text-sm font-medium text-ink group-hover:text-brand"
                          >
                            {item.title}
                          </Link>
                        </td>
                        <td className="col-span-2 min-w-0 break-words text-xs text-muted sm:px-3 sm:py-4 sm:align-top">
                          {item.studentName}
                        </td>
                        <td className="text-xs text-muted sm:px-3 sm:py-4 sm:align-top">
                          {(item.versionCount ?? 0) === 1
                            ? t('deliverables.versionCountOne')
                            : t('deliverables.versionCountMany', {
                                count: item.versionCount ?? 0,
                              })}
                        </td>
                        <td className="text-right text-xs text-muted sm:px-3 sm:py-4 sm:text-left sm:align-top">
                          {item.submittedAt ? (
                            <time dateTime={item.submittedAt}>
                              {new Date(item.submittedAt).toLocaleDateString(dateLocale)}
                            </time>
                          ) : (
                            t('common.notProvided')
                          )}
                        </td>
                        <td className="col-span-2 sm:px-3 sm:py-4 sm:align-top">
                          <Link
                            to={href}
                            aria-label={t('common.open')}
                            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                          >
                            {t('common.open')}
                            <Icon name="chevron" className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
      {view === 'students' ? (
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
      ) : null}
    </div>
  );
}
