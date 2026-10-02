import { useT } from '../../../i18n/LocaleContext';
import { STATUS_TAB_IDS, type StatusTab } from '../labels';

export function ObjectiveFilters({
  tab,
  search,
  onTab,
  onSearch,
}: {
  tab: StatusTab;
  search: string;
  onTab: (tab: StatusTab) => void;
  onSearch: (value: string) => void;
}) {
  const t = useT();
  const tabs = STATUS_TAB_IDS.map((id) => ({
    id,
    label: t(`objectives.tabs.${id}`),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                ? '-mb-px shrink-0 whitespace-nowrap border-b-2 border-brand px-3 py-2 text-sm font-medium text-brand'
                : '-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink'
            }
            onClick={() => onTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="min-w-0 text-sm">
        <span className="sr-only">{t('common.search')}</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t('common.search')}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}
