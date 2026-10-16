import { EmptyState, Modal, Skeleton } from '@thesispartner/ui';
import { IconAction } from '../../../components/IconAction';
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
  tabsAside = false,
}: {
  thesisId: string;
  canCreate: boolean;
  detailPath: (remarkId: string) => string;
  tabsAside?: boolean;
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

  const statusTabs = (
    <div
      className={
        tabsAside
          ? 'flex gap-0.5 overflow-x-auto rounded-md border border-line bg-surface p-1.5 shadow-control md:sticky md:top-20 md:flex-col md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-md border border-line bg-canvas p-1 shadow-control [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      }
      role="tablist"
      aria-label={t('remarks.title')}
    >
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={tab === item.id}
          className={
            tabsAside
              ? item.id === tab
                ? 'shrink-0 rounded-md bg-brand-soft px-3 py-2 text-left text-sm font-semibold text-brand md:w-full'
                : 'shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-brand-soft hover:text-brand md:w-full'
              : item.id === tab
                ? 'shrink-0 whitespace-nowrap rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:text-sm'
                : 'shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs text-muted hover:text-ink sm:text-sm'
          }
          onClick={() => update({ status: item.id === 'all' ? null : item.id })}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={
        tabsAside ? 'grid items-start gap-4 md:grid-cols-[11rem_minmax(0,1fr)]' : 'min-w-0'
      }
    >
      {tabsAside ? <div className="md:col-start-1 md:row-start-1">{statusTabs}</div> : null}
      <div className={tabsAside ? 'min-w-0 md:col-start-2 md:row-start-1' : undefined}>
        <ol
          className="mb-3 grid gap-2 rounded-md border border-line bg-surface p-2.5 sm:grid-cols-4"
          aria-label={t('remarks.cycleLabel')}
        >
          {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((status, index) => (
            <li key={status} className="min-w-0">
              <p className="text-[11px] font-medium text-ink">
                <span className="mr-1 tabular-nums text-muted">{index + 1}.</span>
                {t(`remarks.statusLabel.${status}`)}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">
                {canCreate ? t(`remarks.cycle.${status}`) : t(`remarks.cycleStudent.${status}`)}
              </p>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            {tabsAside ? null : statusTabs}
            {canCreate ? (
              <IconAction label={t('remarks.new')} icon="plus" onClick={() => setCreating(true)} />
            ) : null}
          </div>
          <label className="min-w-0 text-xs">
            <span className="sr-only">{t('common.search')}</span>
            <input
              value={params.get('search') ?? ''}
              placeholder={t('common.search')}
              className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink sm:text-sm"
              onChange={(event) =>
                update({ search: event.target.value.trim() ? event.target.value : null })
              }
            />
          </label>
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
