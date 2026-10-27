import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { formatDay } from '../../dashboard/labels';
import { LinkedRemarkButton } from '../../remarks/components/LinkedRemarkButton';
import type { DeliverableListItem } from '../hooks/use-deliverables';
import { documentPresentation } from '../presentation';
import { DeliverableStatusBadge } from './DeliverableStatusBadge';

export function DeliverableCards({
  deliverables,
  detailPath,
  thesisId,
  canRemark = false,
}: {
  deliverables: DeliverableListItem[];
  detailPath: (id: string) => string;
  thesisId?: string;
  canRemark?: boolean;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  return (
    <ul
      className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-label={t('deliverables.title')}
    >
      {deliverables.map((item) => {
        const style = documentPresentation(item.type);
        return (
          <li
            key={item.id}
            className="group flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-surface transition-[border-color,box-shadow,transform] duration-200 hover:border-brand/30 hover:shadow-[0_8px_24px_rgba(36,87,167,0.09)] focus-within:border-brand/40 motion-safe:hover:-translate-y-0.5"
          >
            <Link
              to={detailPath(item.id)}
              aria-label={item.title}
              className="flex min-w-0 flex-1 flex-col"
            >
              <div
                className={`flex min-w-0 flex-wrap items-center justify-between gap-2 bg-linear-to-r ${style.wash} to-surface p-4`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${style.tone}`}
                >
                  <Icon name={style.icon} className="h-5 w-5" />
                </span>
                <DeliverableStatusBadge status={item.status} />
              </div>
              <div className="flex flex-1 flex-col px-4 pb-4">
                <p className="mt-1 break-words text-xs font-semibold text-ink transition-colors group-hover:text-brand sm:text-sm">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] text-muted sm:text-xs">
                  {t(`deliverables.type.${item.type}`)}
                </p>
                <div className="mt-4 flex flex-1 items-start gap-2 rounded-[9px] bg-canvas/70 px-2.5 py-2">
                  <Icon name="objectives" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                  <p className="break-words text-[11px] leading-relaxed text-muted sm:text-xs">
                    {item.objective?.title ?? t('deliverables.noObjective')}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[11px] sm:text-xs">
                  <span className="rounded-md bg-violet-soft/70 px-2 py-1 tabular-nums text-violet">
                    {item.versionCount === 1
                      ? t('deliverables.versionCountOne')
                      : t('deliverables.versionCountMany', { count: item.versionCount })}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 ${item.isOverdue ? 'text-danger' : 'text-muted'}`}
                  >
                    <Icon name="meetings" className="h-3.5 w-3.5" />
                    <time dateTime={item.dueDate ?? undefined}>
                      {item.dueDate ? formatDay(item.dueDate, dateLocale) : t('common.notProvided')}
                    </time>
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-medium text-danger">
                    {item.isOverdue ? t('common.overdue') : ''}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-brand">
                    {t('common.open')}
                    <Icon
                      name="chevron"
                      className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </div>
            </Link>
            {canRemark && thesisId ? (
              <div className="flex justify-end border-t border-line px-3 py-2">
                <LinkedRemarkButton
                  thesisId={thesisId}
                  subject={item.title}
                  deliverableId={item.id}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
