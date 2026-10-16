import { Button, EmptyState, Modal, Skeleton } from '@thesispartner/ui';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deliverableVersionSchema, storedFileSchema } from '@thesispartner/validation';
import { apiSend, apiUpload } from '../../../api/client';
import { useT } from '../../../i18n/LocaleContext';
import { useObjectives } from '../../objectives/hooks/use-objectives';
import { QueryError } from '../../objectives/components/QueryError';
import { useCreateDeliverable, useDeliverables } from '../hooks/use-deliverables';
import { filtersFromSearch } from '../keys';
import { DELIVERABLE_TAB_IDS, DELIVERABLE_TYPE_LABEL, type DeliverableTab } from '../labels';
import { DeliverableForm } from './DeliverableForm';
import { DeliverableList } from './DeliverableList';

const FILTER_TABS = [...DELIVERABLE_TAB_IDS, 'CANCELLED'] as const;

export function DeliverablesWorkspace({
  thesisId,
  canCreate,
  detailPath,
}: {
  thesisId: string;
  canCreate: boolean;
  detailPath: (deliverableId: string) => string;
}) {
  const t = useT();
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
  const objectives = useObjectives(thesisId, {});
  const create = useCreateDeliverable(thesisId);
  const [creating, setCreating] = useState(false);
  const activeFilterCount = [
    filters.type,
    filters.objectiveId,
    filters.sort && filters.sort !== 'due' ? filters.sort : null,
    params.get('search'),
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

  return (
    <div className="min-w-0 pb-20 sm:pb-0">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-end gap-2 border-b border-line">
          <div
            className="-mb-px min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label={t('deliverables.title')}
          >
            <div className="flex gap-1 px-0.5">
              {FILTER_TABS.map((id) => {
                const selected = id === 'CANCELLED' ? filters.status === 'CANCELLED' : tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={
                      selected
                        ? '-mb-px shrink-0 whitespace-nowrap border-b-2 border-ink px-2 py-2 text-xs font-medium text-ink sm:px-2.5 sm:text-sm'
                        : '-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent px-2 py-2 text-xs text-muted transition-colors hover:text-ink sm:px-2.5 sm:text-sm'
                    }
                    onClick={() =>
                      update({
                        status: id === 'all' ? null : id === 'CANCELLED' ? 'CANCELLED' : id,
                      })
                    }
                  >
                    {t(`deliverables.tabs.${id}`)}
                  </button>
                );
              })}
            </div>
          </div>
          {canCreate ? (
            <Button
              className="mb-1.5 hidden h-8 shrink-0 px-3 text-xs sm:inline-flex sm:h-9 sm:text-sm"
              onClick={() => setCreating(true)}
            >
              {t('deliverables.new')}
            </Button>
          ) : null}
        </div>

        <div className="sm:hidden">
          <button
            type="button"
            className="inline-flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-xs font-medium text-ink"
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
        </div>

        <div
          className={`grid gap-2 rounded-md border border-line bg-surface p-2.5 sm:grid-cols-2 sm:p-3 lg:grid-cols-4 ${
            filtersOpen ? 'grid' : 'hidden sm:grid'
          }`}
        >
          <label className="min-w-0 text-[11px] sm:col-span-2 lg:col-span-1 sm:text-xs">
            <span className="mb-1 block font-medium tracking-wide text-muted uppercase">
              {t('common.search')}
            </span>
            <input
              value={params.get('search') ?? ''}
              placeholder={t('common.search')}
              className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink sm:text-sm"
              onChange={(event) =>
                update({ search: event.target.value.trim() ? event.target.value : null })
              }
            />
          </label>
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
          <label className="min-w-0 text-[11px] sm:col-span-2 lg:col-span-1 sm:text-xs">
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

      {deliverables.isLoading ? (
        <div className="mt-3 grid gap-2" aria-busy="true">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : null}
      {deliverables.isError ? <QueryError error={deliverables.error} /> : null}
      {deliverables.data && deliverables.data.deliverables.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={t('deliverables.emptyTitle')}
            description={t('deliverables.emptyDescription')}
          />
          {canCreate ? (
            <p className="mt-3">
              <Button className="w-full sm:w-auto" onClick={() => setCreating(true)}>
                {t('deliverables.create')}
              </Button>
            </p>
          ) : null}
        </div>
      ) : null}
      {deliverables.data && deliverables.data.deliverables.length > 0 ? (
        <DeliverableList deliverables={deliverables.data.deliverables} detailPath={detailPath} />
      ) : null}

      {canCreate ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 p-3 backdrop-blur-sm sm:hidden">
          <Button className="h-11 w-full text-sm" onClick={() => setCreating(true)}>
            {t('deliverables.new')}
          </Button>
        </div>
      ) : null}

      <Modal
        open={creating}
        title={t('deliverables.new')}
        closeLabel={t('common.close')}
        onClose={() => setCreating(false)}
      >
        <DeliverableForm
          objectives={objectives.data?.objectives ?? []}
          pending={create.isPending}
          error={create.error}
          submitLabel={t('deliverables.form.create')}
          allowFile
          onCancel={() => setCreating(false)}
          onSubmit={async (body, file) => {
            const created = await create.mutateAsync(body);
            if (file) {
              const version = await apiSend(
                `/api/v1/theses/${thesisId}/deliverables/${created.id}/versions`,
                deliverableVersionSchema,
                { changeSummary: 'Initial file' },
              );
              await apiUpload(
                `/api/v1/theses/${thesisId}/deliverables/${created.id}/versions/${version.id}/file`,
                storedFileSchema,
                file,
              );
            }
            setCreating(false);
          }}
        />
      </Modal>
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
