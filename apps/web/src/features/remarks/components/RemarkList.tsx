import { Link } from 'react-router-dom';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import type { RemarkListItem } from '../hooks/use-remarks';
import { RemarkPriorityBadge } from './RemarkPriorityBadge';
import { RemarkStatusBadge } from './RemarkStatusBadge';

export function RemarkList({
  remarks,
  detailPath,
}: {
  remarks: RemarkListItem[];
  detailPath: (remarkId: string) => string;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  return (
    <ul className="flex flex-col gap-2" aria-label={t('remarks.listAria')}>
      {remarks.map((item) => (
        <li key={item.id}>
          <Link
            to={detailPath(item.id)}
            className="block min-w-0 rounded-md border border-line bg-surface px-3 py-3 transition-colors hover:border-brand"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 break-words font-medium text-ink">{item.title}</p>
              <RemarkStatusBadge status={item.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {t(`remarks.targetKind.${item.target.kind}`)} · {item.target.label}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
              <RemarkPriorityBadge priority={item.priority} />
              <span>
                {item.author.givenName} {item.author.familyName}
              </span>
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleDateString(dateLocale, { timeZone: 'UTC' })}
              </time>
              <span>
                {t('remarks.activityOn', {
                  date: new Date(item.lastActivityAt).toLocaleDateString(dateLocale, {
                    timeZone: 'UTC',
                  }),
                })}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
