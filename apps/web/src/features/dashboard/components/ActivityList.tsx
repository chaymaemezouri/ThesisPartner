import { Link } from 'react-router-dom';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { groupActivity } from '../activity';
import { formatDate, utcToday } from '../format';
import type { DashboardData } from '../labels';
import { activityPath } from '../paths';

export function ActivityList({ activity }: { activity: DashboardData['recentActivity'] }) {
  const t = useT();
  const { dateLocale } = useLocale();
  const lines = groupActivity(activity, utcToday(), (type) => t(`activity.${type}`), t);

  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <h2 className="font-serif text-xl text-ink">{t('dashboard.recentActivity')}</h2>
      {lines.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('dashboard.noActivity')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {lines.map((line) => (
            <li key={`${line.date}-${line.type}-${line.text}`} className="py-2 text-sm">
              <Link to={activityPath(line.type)} className="hover:text-brand">
                <span className="text-muted">{formatDate(line.date, dateLocale)}</span>
                <span aria-hidden="true"> · </span>
                <span className="text-ink">{line.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
