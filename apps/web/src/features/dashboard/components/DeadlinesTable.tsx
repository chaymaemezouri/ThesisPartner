import { CalendarCheck, FileText, Flag, ListChecks } from 'lucide-react';

import { Link } from 'react-router-dom';

import { useLocale, useT } from '../../../i18n/LocaleContext';

import { dayDiff, formatDate, lateDaysShort, utcToday } from '../format';

import type { DashboardData } from '../labels';

import { deadlinePath } from '../paths';

import { StatusBadge } from './StatusBadge';

const ICONS = {
  EXPECTED_DEFENSE: CalendarCheck,

  OBJECTIVE: Flag,

  TASK: ListChecks,

  DELIVERABLE: FileText,
} as const;

export function DeadlinesTable({ deadlines }: { deadlines: DashboardData['upcomingDeadlines'] }) {
  const t = useT();

  const { dateLocale } = useLocale();

  const today = utcToday();

  const rows = [...deadlines].sort((left, right) => {
    const leftLate = left.occursOn < today;

    const rightLate = right.occursOn < today;

    if (leftLate !== rightLate) return leftLate ? -1 : 1;

    return left.occursOn < right.occursOn ? -1 : left.occursOn > right.occursOn ? 1 : 0;
  });

  return (
    <section className="min-w-0 rounded-md border border-line bg-surface p-4">
      <h2 className="font-serif text-xl text-ink">{t('dashboard.upcomingDeadlines')}</h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('dashboard.noDeadlines')}</p>
      ) : (
        <div className="mt-3 min-w-0 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-faint">
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t('dashboard.date')}
                </th>

                <th scope="col" className="py-2 pr-3 font-medium">
                  {t('dashboard.titleCol')}
                </th>

                <th scope="col" className="py-2 pr-3 font-medium">
                  {t('dashboard.typeCol')}
                </th>

                <th scope="col" className="py-2 font-medium">
                  {t('dashboard.statusCol')}
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item) => {
                const late = dayDiff(item.occursOn, today) < 0;

                const Icon = ICONS[item.kind];

                return (
                  <tr
                    key={`${item.kind}-${item.id}`}

                    className="border-b border-line last:border-0"
                  >
                    <td
                      className={`py-2 pr-3 whitespace-nowrap ${late ? 'text-danger' : 'text-ink'}`}
                    >
                      {formatDate(item.occursOn, dateLocale)}
                    </td>

                    <td className="py-2 pr-3">
                      <Link to={deadlinePath(item)} className="text-brand">
                        {item.title}
                      </Link>
                    </td>

                    <td className="py-2 pr-3">
                      <StatusBadge>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />

                        {t(`dashboard.kind.${item.kind}`)}
                      </StatusBadge>
                    </td>

                    <td className={`py-2 whitespace-nowrap ${late ? 'text-danger' : 'text-muted'}`}>
                      {late ? lateDaysShort(item.occursOn, today, t) : t('dashboard.upcoming')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
