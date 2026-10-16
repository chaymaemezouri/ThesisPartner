import { useT } from '../../../i18n/LocaleContext';
import { STATUS_TAB_IDS, type StatusTab } from '../labels';

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

  const vertical = part === 'tabs';
  const tabList = (
    <div
      className={
        vertical
          ? 'flex gap-0.5 overflow-x-auto rounded-md border border-line bg-surface p-1.5 shadow-control md:sticky md:top-20 md:flex-col md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'flex gap-1 overflow-x-auto rounded-md border border-line bg-canvas p-1 shadow-control [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      }
      role="tablist"
      aria-label={t('objectives.title')}
    >
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={tab === item.id}
          className={
            tab === item.id
              ? vertical
                ? 'shrink-0 rounded-md bg-brand-soft px-3 py-2 text-left text-sm font-semibold text-brand md:w-full'
                : 'shrink-0 whitespace-nowrap rounded-md bg-surface px-3 py-1 text-sm font-semibold text-brand shadow-control'
              : vertical
                ? 'shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-brand-soft hover:text-brand md:w-full'
                : 'shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted transition-colors duration-150 hover:bg-surface/70 hover:text-ink'
          }
          onClick={() => onTab(item.id)}
        >
          {item.label}
        </button>
      ))}
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
