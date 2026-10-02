import { Link } from 'react-router-dom';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { formatDay } from '../../dashboard/labels';
import type { DeliverableListItem } from '../hooks/use-deliverables';

export function DeliverableList({
  deliverables,
  detailPath,
}: {
  deliverables: DeliverableListItem[];
  detailPath: (deliverableId: string) => string;
}) {
  const t = useT();
  const { dateLocale } = useLocale();

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-line bg-surface">
      <ul className="divide-y divide-line">
        {deliverables.map((item) => {
          const meta = [
            t(`deliverables.type.${item.type}`),
            t(`deliverables.status.${item.status}`),
            item.latestVersionNumber
              ? t('deliverables.versionShort', { number: item.latestVersionNumber })
              : null,
          ]
            .filter(Boolean)
            .join(' · ');
          const due = item.dueDate ? formatDay(item.dueDate, dateLocale) : t('common.notProvided');

          return (
            <li key={item.id}>
              <Link
                to={detailPath(item.id)}
                className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-canvas/70"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-medium text-ink sm:text-sm">
                      {item.title}
                    </span>
                    <time
                      className={`shrink-0 text-[11px] tabular-nums sm:hidden ${
                        item.isOverdue ? 'text-danger' : 'text-muted'
                      }`}
                      dateTime={item.dueDate ?? undefined}
                    >
                      {due}
                    </time>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted sm:text-xs">
                    {meta}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted sm:text-xs">
                    {item.objective?.title ?? t('common.none')}
                    {item.isOverdue ? (
                      <>
                        {' '}
                        <span className="font-medium text-danger">· {t('common.overdue')}</span>
                      </>
                    ) : null}
                  </span>
                </span>
                <span className="hidden w-[7rem] shrink-0 pt-0.5 text-right sm:block">
                  <span className="block text-[10px] tracking-wide text-muted uppercase">
                    {t('deliverables.dueDate')}
                  </span>
                  <time
                    className={`mt-0.5 block text-xs tabular-nums ${
                      item.isOverdue ? 'text-danger' : 'text-ink'
                    }`}
                    dateTime={item.dueDate ?? undefined}
                  >
                    {due}
                  </time>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
