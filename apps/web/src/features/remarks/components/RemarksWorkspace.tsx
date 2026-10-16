import { Button, EmptyState, Modal, Skeleton } from '@thesispartner/ui';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../../../i18n/LocaleContext';
import { useDeliverables } from '../../deliverables/hooks/use-deliverables';
import { useObjectives } from '../../objectives/hooks/use-objectives';
import { QueryError } from '../../objectives/components/QueryError';
import { useCreateRemark, useRemarks } from '../hooks/use-remarks';
import { filtersFromSearch } from '../keys';
import { REMARK_TAB_IDS, type RemarkTab } from '../labels';
import { RemarkForm } from './RemarkForm';
import { RemarkList } from './RemarkList';

export function RemarksWorkspace({
  thesisId,
  canCreate,
  detailPath,
}: {
  thesisId: string;
  canCreate: boolean;
  detailPath: (remarkId: string) => string;
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
  const remarks = useRemarks(thesisId, filters);
  const objectives = useObjectives(canCreate ? thesisId : null, {});
  const deliverables = useDeliverables(canCreate ? thesisId : null, {});
  const create = useCreateRemark(thesisId);
  const [creating, setCreating] = useState(false);
  const tab = tabFromStatus(filters.status);
  const tabs = REMARK_TAB_IDS.map((id) => ({
    id,
    label: t(`remarks.tabs.${id}`),
  }));

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
    <div className="min-w-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('remarks.title')}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={
                tab === item.id
                  ? 'rounded-md bg-brand px-3 py-1.5 text-sm text-white'
                  : 'rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink'
              }
              onClick={() => update({ status: item.id === 'all' ? null : item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1 text-sm">
            <span className="sr-only">{t('common.search')}</span>
            <input
              value={params.get('search') ?? ''}
              placeholder={t('common.search')}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              onChange={(event) =>
                update({ search: event.target.value.trim() ? event.target.value : null })
              }
            />
          </label>
          {canCreate ? <Button onClick={() => setCreating(true)}>{t('remarks.new')}</Button> : null}
        </div>
      </div>
      {remarks.isLoading ? (
        <div className="mt-4" aria-busy="true">
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {remarks.isError ? (
        <div className="mt-4">
          <QueryError error={remarks.error} />
        </div>
      ) : null}
      {remarks.data && remarks.data.remarks.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={t('remarks.emptyTitle')}
            description={
              canCreate
                ? t('remarks.emptyDescriptionSupervisor')
                : t('remarks.emptyDescriptionStudent')
            }
          />
        </div>
      ) : null}
      {remarks.data && remarks.data.remarks.length > 0 ? (
        <div className="mt-4">
          <RemarkList remarks={remarks.data.remarks} detailPath={detailPath} />
        </div>
      ) : null}
      <Modal
        open={creating}
        title={t('remarks.new')}
        closeLabel={t('common.close')}
        onClose={() => setCreating(false)}
      >
        <RemarkForm
          objectives={objectives.data?.objectives ?? []}
          deliverables={deliverables.data?.deliverables ?? []}
          pending={create.isPending}
          error={create.error}
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            await create.mutateAsync(body);
            setCreating(false);
          }}
        />
      </Modal>
    </div>
  );
}

function tabFromStatus(status: string | undefined): RemarkTab {
  if (
    status === 'OPEN' ||
    status === 'IN_PROGRESS' ||
    status === 'RESOLVED' ||
    status === 'CLOSED'
  ) {
    return status;
  }
  return 'all';
}
