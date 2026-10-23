import { EmptyState, Modal, Skeleton } from '@thesispartner/ui';
import { IconAction } from '../../../components/IconAction';
import { Icon } from '../../../components/Icon';
import { STATUS_PRESENTATION } from '../presentation';
import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  deliverableSchema,
  deliverableVersionSchema,
  storedFileSchema,
} from '@thesispartner/validation';
import { apiSend, apiUpload } from '../../../api/client';
import { useT } from '../../../i18n/LocaleContext';
import { useObjectives } from '../../objectives/hooks/use-objectives';
import { QueryError } from '../../objectives/components/QueryError';
import { useCreateDeliverable, useDeliverables, type Deliverable } from '../hooks/use-deliverables';
import { filtersFromSearch } from '../keys';
import { DELIVERABLE_TAB_IDS, DELIVERABLE_TYPE_LABEL, type DeliverableTab } from '../labels';
import { DeliverableForm } from './DeliverableForm';
import { DeliverableList } from './DeliverableList';

const FILTER_TABS = [...DELIVERABLE_TAB_IDS, 'CANCELLED'] as const;

export function DeliverablesWorkspace({
  thesisId,
  canCreate,
  canRemark = false,
  detailPath,
}: {
  thesisId: string;
  canCreate: boolean;
  canRemark?: boolean;
  detailPath: (deliverableId: string) => string;
}) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [savedDraft, setSavedDraft] = useState<Deliverable | null>(null);
  const savedVersion = useRef<string | null>(null);
  const uploadedFile = useRef<File | null>(null);
  const [params, setParams] = useSearchParams();
  const paramsRef = useRef(params);
  const pendingSearch = useRef<string | null>(null);
  const incoming = params.toString();
  if (pendingSearch.current === null || pendingSearch.current === incoming) {
    paramsRef.current = params;
    pendingSearch.current = null;
  }
  const filters = filtersFromSearch(params);
  const deliverables = useDeliverables(thesisId, filters);
  const overview = useDeliverables(thesisId, {});
  const onlyOverdue = params.get('late') === '1';
  const view = params.get('view') === 'cards' ? 'cards' : 'list';
  const rows = deliverables.data?.deliverables ?? [];
  const visibleRows = rows.filter((item) => !onlyOverdue || item.isOverdue);
  const counts = overview.data
    ? Object.fromEntries(
        FILTER_TABS.map((status) => [
          status,
          status === 'all'
            ? overview.data.deliverables.length
            : overview.data.deliverables.filter((item) => item.status === status).length,
        ]),
      )
    : null;
  const overdueCount = overview.data?.deliverables.filter((item) => item.isOverdue).length;
  const objectives = useObjectives(thesisId, {});
  const create = useCreateDeliverable(thesisId);
  const [creating, setCreating] = useState(false);
  const activeFilterCount = [
    filters.type,
    filters.objectiveId,
    filters.sort && filters.sort !== 'due' ? filters.sort : null,
    params.get('search'),
    onlyOverdue || null,
  ].filter(Boolean).length;
  const [filtersOpen, setFiltersOpen] = useState(activeFilterCount > 0);
  const tab = tabFromStatus(filters.status);

  function update(next: Record<string, string | null>) {
    const copy = new URLSearchParams(paramsRef.current);
    for (const [key, value] of Object.entries(next)) {
      if (!value) copy.delete(key);
      else copy.set(key, value);
    }
    paramsRef.current = copy;
    pendingSearch.current = copy.toString();
    setParams(copy);
  }

  function closeCreation() {
    setCreating(false);
    setSavedDraft(null);
    savedVersion.current = null;
    uploadedFile.current = null;
    if (params.has('create')) update({ create: null });
  }

  const appliedFilters = [
    ...(filters.search ? [{ key: 'search', label: filters.search }] : []),
    ...(filters.type ? [{ key: 'type', label: t(`deliverables.type.${filters.type}`) }] : []),
    ...(filters.objectiveId
      ? [
          {
            key: 'objectiveId',
            label:
              objectives.data?.objectives.find((item) => item.id === filters.objectiveId)?.title ??
              t('deliverables.linkedObjective'),
          },
        ]
      : []),
  ];
  const filtered = Boolean(filters.status || activeFilterCount);
  const clearFilters = () =>
    update({ status: null, search: null, type: null, objectiveId: null, sort: null, late: null });
  const selectStatus = (status: string) => update({ status: status === 'all' ? null : status });

  const statusTabs = (
    <div
      className="flex gap-1 overflow-x-auto rounded-2xl border border-line/80 bg-line/45 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={t('deliverables.title')}
    >
      {FILTER_TABS.map((id, index) => {
        const selected = id === tab;
        const style = STATUS_PRESENTATION[id];
        const count = counts ? (counts[id] ?? 0) : null;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-label={t(`deliverables.tabs.${id}`)}
            aria-description={
              count !== null ? t('deliverables.resultCount', { count }) : undefined
            }
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`group flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-[background-color,box-shadow,color] duration-150 ${
              selected
                ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                : 'text-ink/80 hover:bg-surface/70'
            }`}
            onClick={() => selectStatus(id)}
            onKeyDown={(event) => {
              if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? FILTER_TABS.length - 1
                    : (index + (event.key === 'ArrowRight' ? 1 : -1) + FILTER_TABS.length) %
                      FILTER_TABS.length;
              const status = FILTER_TABS[next];
              if (status) selectStatus(status);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next]?.focus();
            }}
          >
            <span
              aria-hidden="true"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                selected ? 'bg-brand-soft text-brand' : 'bg-surface/80 text-muted'
              }`}
            >
              <Icon name={style.icon} className="h-4 w-4" />
            </span>
            <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
              <span className={`text-sm ${selected ? 'font-semibold' : 'font-medium'}`}>
                {t(`deliverables.tabs.${id}`)}
              </span>
              <span
                className={`text-xs tabular-nums ${selected ? 'text-brand' : 'text-muted'}`}
              >
                {count !== null ? count : '–'}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-w-0">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">{statusTabs}</div>
        {canCreate ? (
          <IconAction
            className="shrink-0"
            label={t('deliverables.new')}
            icon="plus"
            onClick={() => setCreating(true)}
          />
        ) : null}
      </div>
      <div className="min-w-0 rounded-[14px] border border-line bg-surface p-3 shadow-[0_3px_18px_rgba(15,23,42,0.03)] sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-40 flex-1 text-[11px] sm:max-w-sm sm:text-xs">
              <span className="sr-only">{t('common.search')}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                type="search"
                value={params.get('search') ?? ''}
                placeholder={t('common.search')}
                className="h-10 w-full rounded-[10px] border border-line bg-canvas/70 pr-9 pl-9 text-xs text-ink outline-none transition-[background-color,border-color,box-shadow] focus:border-brand/50 focus:bg-surface focus:ring-2 focus:ring-brand/10 sm:text-sm"
                onChange={(event) =>
                  update({ search: event.target.value.trim() ? event.target.value : null })
                }
              />
              {filters.search ? (
                <button
                  type="button"
                  aria-label={t('deliverables.clearSearch')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted hover:bg-brand-soft hover:text-brand"
                  onClick={() => update({ search: null })}
                >
                  <Icon name="close" className="h-3 w-3" />
                </button>
              ) : null}
            </label>
            <button
              type="button"
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[10px] border px-3 text-xs font-medium transition-colors ${filtersOpen ? 'border-brand/25 bg-brand-soft text-brand' : 'border-line bg-surface text-muted hover:border-brand/30 hover:text-brand'}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <span>
                {filtersOpen ? t('deliverables.hideFilters') : t('deliverables.showFilters')}
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
              <span aria-hidden="true" className="text-muted">
                {filtersOpen ? '▴' : '▾'}
              </span>
            </button>
            <button
              type="button"
              aria-label={t('deliverables.overdueOnly')}
              aria-pressed={onlyOverdue}
              onClick={() => update({ late: onlyOverdue ? null : '1' })}
              className={`inline-flex min-h-10 items-center gap-2 rounded-[10px] border px-3 text-xs font-medium transition-colors ${onlyOverdue ? 'border-danger/30 bg-danger-soft text-danger' : 'border-line text-muted hover:border-danger/25 hover:bg-danger-soft/60 hover:text-danger'}`}
            >
              <Icon name="notice" className="h-4 w-4" />
              {t('common.overdue')}
              {overdueCount != null ? (
                <span className="rounded-full bg-danger-soft px-1.5 py-0.5 text-[11px] tabular-nums text-danger">
                  {overdueCount}
                </span>
              ) : null}
            </button>
            <div
              role="group"
              aria-label={t('deliverables.viewLabel')}
              className="ml-auto flex shrink-0 gap-1 rounded-[10px] border border-line bg-canvas/70 p-1"
            >
              {(['list', 'cards'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-label={t(
                    mode === 'list' ? 'deliverables.listView' : 'deliverables.cardView',
                  )}
                  aria-pressed={view === mode}
                  onClick={() => update({ view: mode === 'cards' ? 'cards' : null })}
                  className={`grid h-8 w-8 place-items-center rounded-[7px] transition-colors ${view === mode ? 'bg-surface text-brand shadow-control' : 'text-muted hover:bg-surface/70 hover:text-brand'}`}
                >
                  <Icon name={mode === 'list' ? 'menu' : 'dashboard'} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          {appliedFilters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {appliedFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  aria-label={t('deliverables.removeFilter', { label: filter.label })}
                  onClick={() => update({ [filter.key]: null })}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand/15 bg-brand-soft/70 px-2.5 py-1 text-xs text-brand hover:bg-brand-soft"
                >
                  <span className="truncate">{filter.label}</span>
                  <Icon name="close" className="h-3 w-3 shrink-0" />
                </button>
              ))}
            </div>
          ) : null}

          <div
            className={`grid gap-3 rounded-[10px] border border-brand/10 bg-brand-soft/30 p-3 sm:grid-cols-2 lg:grid-cols-3 ${
              filtersOpen ? 'grid' : 'hidden'
            }`}
          >
            <label className="min-w-0 text-[11px] sm:text-xs">
              <span className="mb-1 block font-medium tracking-wide text-muted uppercase">
                {t('deliverables.form.type')}
              </span>
              <select
                aria-label={t('deliverables.form.type')}
                value={filters.type ?? ''}
                className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink sm:text-sm"
                onChange={(event) => update({ type: event.target.value || null })}
              >
                <option value="">{t('deliverables.filterAllTypes')}</option>
                {(
                  Object.keys(DELIVERABLE_TYPE_LABEL) as Array<keyof typeof DELIVERABLE_TYPE_LABEL>
                ).map((value) => (
                  <option key={value} value={value}>
                    {t(`deliverables.type.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-[11px] sm:text-xs">
              <span className="mb-1 block font-medium tracking-wide text-muted uppercase">
                {t('deliverables.form.objective')}
              </span>
              <select
                aria-label={t('deliverables.form.objective')}
                value={filters.objectiveId ?? ''}
                className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink sm:text-sm"
                onChange={(event) => update({ objectiveId: event.target.value || null })}
              >
                <option value="">{t('deliverables.filterAllObjectives')}</option>
                {(objectives.data?.objectives ?? []).map((objective) => (
                  <option key={objective.id} value={objective.id}>
                    {objective.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-[11px] sm:text-xs">
              <span className="mb-1 block font-medium tracking-wide text-muted uppercase">
                {t('deliverables.sortBy')}
              </span>
              <select
                aria-label={t('deliverables.sortBy')}
                value={filters.sort ?? 'due'}
                className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink sm:text-sm"
                onChange={(event) =>
                  update({ sort: event.target.value === 'due' ? null : event.target.value })
                }
              >
                <option value="due">{t('deliverables.dueDate')}</option>
                <option value="updated">{t('deliverables.lastUpdated')}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <p role="status">
            {deliverables.data
              ? t('deliverables.resultCount', { count: visibleRows.length })
              : t('common.loading')}
          </p>
          {filtered ? (
            <button
              type="button"
              className="font-medium text-brand hover:underline"
              onClick={clearFilters}
            >
              {t('deliverables.clearFilters')}
            </button>
          ) : null}
        </div>

        {deliverables.isLoading ? (
          <div className="mt-3 grid gap-2" aria-busy="true">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : null}
        {deliverables.isError ? <QueryError error={deliverables.error} /> : null}
        {deliverables.data && visibleRows.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={t(filtered ? 'deliverables.noMatches' : 'deliverables.emptyTitle')}
              description={t(
                filtered ? 'deliverables.noMatchesHelp' : 'deliverables.emptyDescription',
              )}
            />
          </div>
        ) : null}
        {deliverables.data && visibleRows.length > 0 ? (
          <DeliverableList
            deliverables={visibleRows}
            view={view}
            detailPath={detailPath}
            thesisId={thesisId}
            canRemark={canRemark}
          />
        ) : null}

        <Modal
          open={canCreate && (creating || params.get('create') === '1')}
          title={t('deliverables.new')}
          closeLabel={t('common.close')}
          onClose={closeCreation}
        >
          <DeliverableForm
            objectives={objectives.data?.objectives ?? []}
            pending={create.isPending}
            error={create.error}
            submitLabel={t('deliverables.form.create')}
            allowFile
            savedDraft={Boolean(savedDraft)}
            onCancel={closeCreation}
            onSubmit={async (body, file, intent = 'draft') => {
              const created = savedDraft
                ? await apiSend(
                    `/api/v1/theses/${thesisId}/deliverables/${savedDraft.id}`,
                    deliverableSchema,
                    body,
                    'PATCH',
                  )
                : await create.mutateAsync(body);
              setSavedDraft(created);
              try {
                if (file && uploadedFile.current && uploadedFile.current !== file)
                  savedVersion.current = null;
                if ((file || intent === 'submit') && !savedVersion.current) {
                  const version = await apiSend(
                    `/api/v1/theses/${thesisId}/deliverables/${created.id}/versions`,
                    deliverableVersionSchema,
                    { changeSummary: t('deliverables.initialVersion') },
                  );
                  savedVersion.current = version.id;
                }
                if (file && savedVersion.current && uploadedFile.current !== file) {
                  await apiUpload(
                    `/api/v1/theses/${thesisId}/deliverables/${created.id}/versions/${savedVersion.current}/file`,
                    storedFileSchema,
                    file,
                  );
                  uploadedFile.current = file;
                }
                if (intent === 'submit')
                  await apiSend(
                    `/api/v1/theses/${thesisId}/deliverables/${created.id}/submit`,
                    deliverableSchema,
                    {},
                  );
              } finally {
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['deliverables'] }),
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
                  queryClient.invalidateQueries({ queryKey: ['supervision'] }),
                ]);
              }
              closeCreation();
              void navigate(detailPath(created.id));
            }}
          />
        </Modal>
      </div>
    </div>
  );
}

function tabFromStatus(status: string | undefined): DeliverableTab | 'CANCELLED' {
  if (status === 'CANCELLED') return 'CANCELLED';
  if (
    status === 'DRAFT' ||
    status === 'SUBMITTED' ||
    status === 'CHANGES_REQUESTED' ||
    status === 'VALIDATED'
  ) {
    return status;
  }
  return 'all';
}
