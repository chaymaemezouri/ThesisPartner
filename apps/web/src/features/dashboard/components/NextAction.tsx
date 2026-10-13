import { Link } from 'react-router-dom';

import { useLocale, useT } from '../../../i18n/LocaleContext';

import { dayDiff, formatDate, relativeDays, utcToday } from '../format';

import type { DashboardData } from '../labels';

import { deadlinePath } from '../paths';



export function NextAction({ deadlines }: { deadlines: DashboardData['upcomingDeadlines'] }) {

  const t = useT();

  const { dateLocale } = useLocale();

  const today = utcToday();

  const next = [...deadlines].sort((left, right) => {

    const leftLate = left.occursOn < today;

    const rightLate = right.occursOn < today;

    if (leftLate !== rightLate) return leftLate ? -1 : 1;

    return left.occursOn < right.occursOn ? -1 : left.occursOn > right.occursOn ? 1 : 0;

  })[0];

  if (!next) return null;

  const late = dayDiff(next.occursOn, today) < 0;



  return (

    <section className="rounded-md border border-line bg-surface p-4">

      <h2 className="font-serif text-xl text-ink">{t('dashboard.nextAction')}</h2>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">

        <div className="min-w-0">

          <p className="text-base font-medium text-ink">{next.title}</p>

          <p className={`mt-1 text-sm ${late ? 'text-danger' : 'text-muted'}`}>

            {t(`dashboard.kind.${next.kind}`)} · {formatDate(next.occursOn, dateLocale)} ·{' '}

            {relativeDays(next.occursOn, today, t)}

          </p>

        </div>

        <Link

          to={deadlinePath(next)}

          className="inline-flex rounded-md bg-brand px-3 py-2 text-sm font-medium text-white"

        >

          {t('common.open')}

        </Link>

      </div>

    </section>

  );

}

