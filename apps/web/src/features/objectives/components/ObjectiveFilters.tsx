import { useEffect, useState } from 'react';
import { Icon } from '../../../components/Icon';
import type { IconName } from '../../../routes/nav';
import { useT } from '../../../i18n/LocaleContext';
import { STATUS_TAB_IDS, type StatusTab } from '../labels';

const TAB_STYLE = {
  all: {
    icon: 'objectives',
    ink: 'text-brand',
    soft: 'bg-brand-soft',
    solid: 'bg-brand',
    edge: 'border-brand/20',
  },
  IN_PROGRESS: {
    icon: 'radar',
    ink: 'text-violet',
    soft: 'bg-violet-soft',
    solid: 'bg-violet',
    edge: 'border-violet/20',
  },
  PLANNED: {
    icon: 'meetings',
    ink: 'text-warn',
    soft: 'bg-warn-soft',
    solid: 'bg-warn',
    edge: 'border-warn/20',
  },
  COMPLETED: {
    icon: 'portfolio',
    ink: 'text-ok',
    soft: 'bg-ok-soft',
    solid: 'bg-ok',
    edge: 'border-ok/20',
  },
  overdue: {
    icon: 'watch',
    ink: 'text-danger',
    soft: 'bg-danger-soft',
    solid: 'bg-danger',
    edge: 'border-danger/20',
  },
} satisfies Record<
  StatusTab,
  { icon: IconName; ink: string; soft: string; solid: string; edge: string }
>;

export function ObjectiveFilters({
  tab,
  search,
  onTab,
  onSearch,
  part = 'all',
}: {
  tab: StatusTab;
  search: string;
  onTab: (tab: StatusTab) => void;
  onSearch: (value: string) => void;
  part?: 'all' | 'tabs' | 'search';
}) {
  const t = useT();
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const tabs = STATUS_TAB_IDS.map((id) => ({
    id,
    label: t(`objectives.tabs.${id}`),
  }));

  const vertical = part === 'tabs';
  const tabList = (
    <div
      className={
        vertical
          ? 'flex gap-1.5 overflow-x-auto rounded-[14px] border border-line/80 bg-surface/80 p-1.5 md:flex-col md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'flex gap-1.5 overflow-x-auto rounded-[14px] border border-line/80 bg-surface/80 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      }
      role="tablist"
      aria-label={t('objectives.title')}
      aria-orientation={vertical && desktop ? 'vertical' : 'horizontal'}
    >
      {tabs.map((item, index) => {
        const selected = tab === item.id;
        const style = TAB_STYLE[item.id];
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`group relative flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-[10px] border px-2.5 py-2 text-left text-sm transition-[background-color,border-color,box-shadow] duration-150 ${vertical ? 'md:w-full' : ''} ${selected ? `${style.soft} ${style.ink} ${style.edge} font-semibold shadow-[0_2px_6px_rgb(15_23_42/0.04)]` : 'border-transparent text-muted hover:bg-canvas hover:text-ink'}`}
            onClick={() => onTab(item.id)}
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
              if (nextTab) onTab(nextTab.id);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next]?.focus();
            }}
          >
            <span
              aria-hidden="true"
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] transition-colors ${selected ? `${style.solid} text-white` : `${style.soft} ${style.ink}`}`}
            >
              <Icon name={style.icon} className="h-3.5 w-3.5" />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
  const searchField = (
    <label className="min-w-0 text-sm">
      <span className="sr-only">{t('common.search')}</span>
      <input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={t('common.search')}
        className="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm shadow-control outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 hover:border-brand/35 focus:border-brand focus:shadow-[0_0_0_3px_rgba(36,87,167,0.12)]"
      />
    </label>
  );

  if (part === 'tabs') return tabList;
  if (part === 'search') return searchField;
  return (
    <div className="flex flex-col gap-4">
      {tabList}
      {searchField}
    </div>
  );
}
