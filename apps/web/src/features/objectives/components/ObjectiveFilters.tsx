import { Icon } from '../../../components/Icon';
import type { IconName } from '../../../routes/nav';
import { useT } from '../../../i18n/LocaleContext';
import { STATUS_TAB_IDS, type StatusTab } from '../labels';

const TAB_ICONS = {
  all: 'objectives',
  IN_PROGRESS: 'radar',
  PLANNED: 'meetings',
  COMPLETED: 'portfolio',
  overdue: 'watch',
} satisfies Record<StatusTab, IconName>;

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
  const tabs = STATUS_TAB_IDS.map((id) => ({
    id,
    label: t(`objectives.tabs.${id}`),
  }));

  const tabList = (
    <div
      className="flex gap-1 overflow-x-auto rounded-2xl border border-line/80 bg-line/45 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={t('objectives.title')}
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
            className={`group flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-[background-color,box-shadow,color] duration-150 ${
              selected
                ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                : 'text-ink/80 hover:bg-surface/70'
            }`}
            onClick={() => onTab(item.id)}
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
              if (nextTab) onTab(nextTab.id);
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
              <Icon name={TAB_ICONS[item.id]} className="h-4 w-4" />
            </span>
            <span className={`whitespace-nowrap text-sm ${selected ? 'font-semibold' : 'font-medium'}`}>
              {item.label}
            </span>
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
    <div className="flex flex-col gap-3">
      {tabList}
      {searchField}
    </div>
  );
}
