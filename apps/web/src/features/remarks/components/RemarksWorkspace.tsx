import { EmptyState, Modal, Skeleton } from '@thesispartner/ui';
import { Icon } from '../../../components/Icon';
import type { IconName } from '../../../routes/nav';
import { IconAction } from '../../../components/IconAction';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../../../i18n/LocaleContext';
import { useDeliverables } from '../../deliverables/hooks/use-deliverables';
import { useObjectives } from '../../objectives/hooks/use-objectives';
import { QueryError } from '../../objectives/components/QueryError';
import { useCreateRemark, useRemarks } from '../hooks/use-remarks';
import { filtersFromSearch } from '../keys';
import { REMARK_TAB_IDS, type RemarkTab } from '../labels';
import { REMARK_STATUS_STYLE } from '../presentation';
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
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(min-width: 768px)');
    const updateLayout = () => setDesktop(media.matches);
    updateLayout();
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);
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
      className={`flex min-w-0 gap-1 overflow-x-auto rounded-[12px] border border-line bg-surface p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${tabsAside ? 'md:flex-col md:overflow-visible' : ''}`}
      role="tablist"
      aria-label={t('remarks.title')}
      aria-orientation={tabsAside && desktop ? 'vertical' : 'horizontal'}
    >
      {tabs.map((item, index) => {
        const selected = tab === item.id;
        const style = REMARK_STATUS_STYLE[item.id === 'all' ? 'OPEN' : item.id];
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${tabsAside ? 'md:w-full' : ''} ${selected ? `${style.edge} ${style.wash} ${style.ink} font-medium` : 'border-transparent text-muted hover:bg-canvas hover:text-ink'}`}
            onClick={() => update({ status: item.id === 'all' ? null : item.id })}
            onKeyDown={(event) => {
              if (
                !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(
                  event.key,
                )
              )
                return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : (index +
                        (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) +
                        tabs.length) %
                      tabs.length;
              const nextTab = tabs[next];
              if (nextTab) update({ status: nextTab.id === 'all' ? null : nextTab.id });
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next]?.focus();
            }}
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${style.soft} ${style.ink}`}
            >
              <Icon name={TAB_ICON[item.id]} className="h-3.5 w-3.5" />
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={
        tabsAside ? 'grid items-start gap-4 md:grid-cols-[11rem_minmax(0,1fr)]' : 'min-w-0'
      }
    >
      {tabsAside ? (
        <div className="min-w-0 md:sticky md:top-20 md:col-start-1 md:row-start-1">
          {statusTabs}
        </div>
      ) : null}
      <div className={tabsAside ? 'min-w-0 md:col-start-2 md:row-start-1' : undefined}>
        <ol
          className="mb-4 grid grid-cols-2 gap-1 rounded-[12px] border border-line bg-surface p-2 sm:grid-cols-4"
          aria-label={t('remarks.cycleLabel')}
        >
          {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((status, index) => {
            const selected = tab === status;
            const style = REMARK_STATUS_STYLE[status];
            return (
              <li key={status} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  className={`flex h-full w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${style.ink} ${selected ? `${style.edge} ${style.soft} ring-1 ring-current/10` : `${style.wash} border-transparent hover:border-current/15`}`}
                  onClick={() => update({ status })}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border bg-surface/85 text-[11px] font-medium tabular-nums ${style.edge} ${style.ink}`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[11px] font-medium ${style.ink}`}>
                      {t(`remarks.statusLabel.${status}`)}
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                      {canCreate
                        ? t(`remarks.cycle.${status}`)
                        : t(`remarks.cycleStudent.${status}`)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          {!tabsAside ? <div className="w-full">{statusTabs}</div> : null}
          <label className="min-w-40 flex-1 text-xs">
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
            <IconAction label={t('remarks.new')} icon="plus" onClick={() => setCreating(true)} />
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
