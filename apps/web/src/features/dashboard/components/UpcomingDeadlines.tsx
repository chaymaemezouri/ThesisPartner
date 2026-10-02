import { Link } from 'react-router-dom';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import type { DashboardData } from '../labels';

function isPastDay(day: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return day < today;
}

function splitDay(value: string, dateLocale: string): { day: string; month: string; year: string } {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return { day: value, month: '', year: '' };
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    day: String(day).padStart(2, '0'),
    month: date.toLocaleDateString(dateLocale, { month: 'short', timeZone: 'UTC' }).replace('.', ''),
    year: String(year),
  };
}

function deadlinePath(item: DashboardData['upcomingDeadlines'][number]): string {
  if (item.kind === 'OBJECTIVE') return `/objectifs/${item.id}`;
  if (item.kind === 'DELIVERABLE') return `/livrables/${item.id}`;
  if (item.kind === 'EXPECTED_DEFENSE') return '/profil';
  return '/objectifs';
}

export function UpcomingDeadlines({
  deadlines,
}: {
  deadlines: DashboardData['upcomingDeadlines'];
}) {
  const t = useT();
  const { dateLocale } = useLocale();

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface lg:h-full">
      <header className="flex shrink-0 items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="font-serif text-lg text-ink">{t('dashboard.upcomingDeadlines')}</h2>
        <Link
          to="/objectifs"
          className="text-xs font-medium tracking-wide text-muted uppercase transition-colors hover:text-ink"
        >
          {t('dashboard.viewAll')}
        </Link>
      </header>

      {deadlines.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted">{t('dashboard.noDeadlinesPlanned')}</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {deadlines.map((item) => {
            const late = isPastDay(item.occursOn);
            const parts = splitDay(item.occursOn, dateLocale);
            return (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  to={deadlinePath(item)}
                  className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-3 px-4 py-3 transition-colors hover:bg-canvas/70"
                >
                  <time
                    dateTime={item.occursOn}
                    className={`pt-0.5 text-right leading-tight ${late ? 'text-danger' : 'text-ink'}`}
                  >
                    <span className="block font-serif text-xl tabular-nums tracking-tight">
                      {parts.day}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium tracking-[0.08em] uppercase text-muted">
                      {parts.month}
                    </span>
                    <span className="mt-0.5 block text-[11px] tabular-nums text-muted">
                      {parts.year}
                    </span>
                  </time>

                  <span className="min-w-0 border-l border-line pl-3">
                    <span className="block text-sm leading-snug text-ink">{item.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                      <span>{t(`dashboard.kind.${item.kind}`)}</span>
                      {late ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-danger">{t('common.overdue')}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
