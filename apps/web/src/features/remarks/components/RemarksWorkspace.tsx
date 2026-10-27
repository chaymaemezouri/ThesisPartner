import { EmptyState, Modal, Skeleton } from '@thesispartner/ui';
import { Icon } from '../../../components/Icon';
import type { IconName } from '../../../routes/nav';
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

const TAB_ICON = {
  all: 'remarks',
  OPEN: 'messages',
  IN_PROGRESS: 'pencil',
  RESOLVED: 'portfolio',
  CLOSED: 'library',
} satisfies Record<RemarkTab, IconName>;

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
  void tabsAside;

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
      className="flex min-w-0 justify-center gap-1 overflow-x-auto rounded-2xl border border-line/80 bg-line/45 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={t('remarks.title')}
    >
      {tabs.map((item, index) => {
        const selected = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-[background-color,box-shadow,color] duration-150 ${
              selected
                ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                : 'text-ink/80 hover:bg-surface/70'
            }`}
            onClick={() => update({ status: item.id === 'all' ? null : item.id })}
            onKeyDown={(event) => {
              if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
              const nextTab = tabs[next];
              if (nextTab) update({ status: nextTab.id === 'all' ? null : nextTab.id });
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
              <Icon name={TAB_ICON[item.id]} className="h-4 w-4" />
            </span>
            <span
              className={`whitespace-nowrap text-sm ${selected ? 'font-semibold' : 'font-medium'}`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-w-0">
      <div className="mb-3">{statusTabs}</div>
      <div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="min-w-[8rem] flex-1 text-xs">
            <span className="sr-only">{t('common.search')}</span>
            <input
              value={params.get('search') ?? ''}
              placeholder={t('common.search')}
              className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-brand/50 focus:shadow-[0_0_0_3px_rgba(36,87,167,0.08)] sm:text-sm"
              onChange={(event) =>
                update({ search: event.target.value.trim() ? event.target.value : null })
              }
            />
          </label>
          {canCreate ? (
            <IconAction
              className="shrink-0"
              label={t('remarks.new')}
              icon="plus"
              onClick={() => setCreating(true)}
            />
          ) : null}
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
