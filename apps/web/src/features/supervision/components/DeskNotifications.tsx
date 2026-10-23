import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@thesispartner/ui';
import { Icon } from '../../../components/Icon';
import type { IconName } from '../../../routes/nav';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { formatShortDay } from '../../dashboard/labels';
import type { SupervisorDesk } from '../hooks/use-supervisor-desk';

type Notification = SupervisorDesk['notifications'][number];
type Kind = Notification['kind'];
const KINDS: Kind[] = ['DELIVERABLE', 'OVERDUE', 'MEETING', 'REMARK'];
const STYLE = {
  DELIVERABLE: { icon: 'deliverables', tone: 'bg-brand-soft text-brand' },
  OVERDUE: { icon: 'watch', tone: 'bg-warn-soft text-warn' },
  MEETING: { icon: 'meetings', tone: 'bg-violet-soft text-violet' },
  REMARK: { icon: 'remarks', tone: 'bg-teal-soft text-teal' },
} satisfies Record<Kind, { icon: IconName; tone: string }>;

export function DeskNotifications({
  notifications,
  destination,
}: {
  notifications: Notification[];
  destination: (kind: Kind, thesisId: string) => string;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const filtered = notifications.filter(
    (item) =>
      (kind === 'all' || item.kind === kind) &&
      (!query || `${item.title} ${item.studentName}`.toLocaleLowerCase().includes(query)),
  );
  const groups = new Map<string, Notification[]>();
  for (const item of filtered) {
    const day = item.date ?? '';
    const rows = groups.get(day) ?? [];
    rows.push(item);
    groups.set(day, rows);
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        title={t('followUp.noNotifications')}
        description={t('followUp.notificationsHelp')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label={t('followUp.notificationType')}
          className="flex min-w-0 flex-1 justify-center gap-1 overflow-x-auto rounded-2xl border border-line/80 bg-line/45 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(['all', ...KINDS] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs transition-[background-color,box-shadow,color] ${
                kind === value
                  ? 'bg-surface font-semibold text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                  : 'font-medium text-ink/80 hover:bg-surface/70'
              }`}
            >
              {value === 'all' ? t('followUp.allNotifications') : t(`followUp.kind.${value}`)}
            </button>
          ))}
        </div>
        <label className="w-full text-xs sm:w-72 sm:shrink-0">
          <span className="sr-only">{t('followUp.searchNotifications')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('followUp.searchNotifications')}
            className="h-10 w-full rounded-[10px] border border-line bg-canvas/70 px-3 text-xs text-ink outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted/70 focus:border-brand/50 focus:bg-surface focus:ring-2 focus:ring-brand/10 sm:text-sm"
          />
        </label>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-[14px] border border-line bg-surface px-4 py-8 text-center text-xs text-muted shadow-[0_3px_18px_rgba(15,23,42,0.03)]">
          <p>{t('followUp.noMatchingNotifications')}</p>
          <button
            type="button"
            className="mt-3 text-brand hover:underline"
            onClick={() => {
              setKind('all');
              setSearch('');
            }}
          >
            {t('followUp.resetFilters')}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_3px_18px_rgba(15,23,42,0.03)]">
          {[...groups].map(([day, rows]) => (
            <section key={day}>
              <h3 className="flex items-center justify-between gap-3 border-y border-line/70 bg-canvas/60 px-4 py-2 text-[11px] font-medium text-muted">
                {day ? (
                  <time dateTime={day}>{formatShortDay(day, dateLocale)}</time>
                ) : (
                  t('common.notProvided')
                )}
                <span className="tabular-nums">{rows.length}</span>
              </h3>
              <ul className="divide-y divide-line/75">
                {rows.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={destination(item.kind, item.thesisId)}
                      className="group flex items-start gap-3 px-3 py-3.5 transition-colors hover:bg-canvas/55 sm:items-center sm:px-4"
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${STYLE[item.kind].tone}`}
                      >
                        <Icon name={STYLE[item.kind].icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-medium text-ink">
                          {item.title}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Icon name="profile" className="h-3 w-3 shrink-0" />
                            <span className="break-words">{item.studentName}</span>
                          </span>
                          <span className={`rounded-full px-2 py-0.5 ${STYLE[item.kind].tone}`}>
                            {t(`followUp.kind.${item.kind}`)}
                          </span>
                        </span>
                      </span>
                      <Icon
                        name="chevron"
                        className="mt-1 h-3.5 w-3.5 shrink-0 text-muted/70 transition-transform group-hover:translate-x-0.5 sm:mt-0"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
