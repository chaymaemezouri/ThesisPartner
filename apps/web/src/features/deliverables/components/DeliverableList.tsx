import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { LinkedRemarkButton } from '../../remarks/components/LinkedRemarkButton';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { formatDay } from '../../dashboard/labels';
import type { DeliverableListItem } from '../hooks/use-deliverables';
import { DeliverableStatusBadge } from './DeliverableStatusBadge';
import { documentPresentation } from '../presentation';
import { DeliverableCards } from './DeliverableCards';

export function DeliverableList({
  deliverables,
  detailPath,
  thesisId,
  canRemark = false,
  view = 'list',
}: {
  deliverables: DeliverableListItem[];
  detailPath: (deliverableId: string) => string;
  thesisId?: string;
  canRemark?: boolean;
  view?: 'list' | 'cards';
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const navigate = useNavigate();
  if (view === 'cards')
    return (
      <DeliverableCards
        deliverables={deliverables}
        detailPath={detailPath}
        thesisId={thesisId}
        canRemark={canRemark}
      />
    );
  return (
    <div className="mt-3 overflow-hidden">
      <table
        className="block w-full table-fixed text-left md:table"
        aria-label={t('deliverables.title')}
      >
        <thead className="hidden border-b border-line bg-canvas/70 text-[10px] font-medium tracking-wide text-muted uppercase md:table-header-group">
          <tr>
            <th scope="col" className="w-[30%] px-2 py-2">
              {t('deliverables.itemLabel')}
            </th>
            <th scope="col" className="w-[24%] px-2 py-2">
              {t('deliverables.linkedObjective')}
            </th>
            <th scope="col" className="w-[20%] px-2 py-2">
              {t('deliverables.statusLabel')}
            </th>
            <th scope="col" className="w-[10%] px-2 py-2">
              {t('deliverables.versionLabel')}
            </th>
            <th scope="col" className="px-2 py-2">
              {t('deliverables.dueDate')}
            </th>
            {canRemark && thesisId ? (
              <th scope="col" className="w-12">
                <span className="sr-only">{t('nav.remarks')}</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="block divide-y divide-line md:table-row-group">
          {deliverables.map((item) => (
            <tr
              key={item.id}
              className="group grid cursor-pointer grid-cols-2 gap-x-3 gap-y-2 py-3 transition-colors duration-150 hover:bg-brand-soft/35 focus-within:bg-brand-soft/35 md:table-row md:p-0"
              onClick={(event) => {
                if (
                  event.target instanceof Element &&
                  event.target.closest('a,button,input,select')
                )
                  return;
                if (window.getSelection()?.toString()) return;
                void navigate(detailPath(item.id));
              }}
            >
              <td className="col-span-2 min-w-0 md:px-2 md:py-3 md:align-top">
                <Link
                  to={detailPath(item.id)}
                  aria-label={item.title}
                  className="flex items-start gap-3 break-words text-xs font-medium text-ink group-hover:text-brand sm:text-sm"
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-transform group-hover:scale-105 ${documentPresentation(item.type).tone}`}
                  >
                    <Icon name={documentPresentation(item.type).icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{item.title}</span>
                    <span className="mt-1 block text-[11px] font-normal text-muted sm:text-xs">
                      {t(`deliverables.type.${item.type}`)}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="col-span-2 min-w-0 text-[11px] text-muted sm:text-xs md:px-2 md:py-3 md:align-top">
                <span className="mb-1 block text-[10px] tracking-wide uppercase md:hidden">
                  {t('deliverables.linkedObjective')}
                </span>
                <span className="block break-words">
                  {item.objective?.title ?? t('deliverables.noObjective')}
                </span>
              </td>
              <td className="min-w-0 md:px-2 md:py-3 md:align-top">
                <DeliverableStatusBadge status={item.status} />
              </td>
              <td className="text-right text-[11px] tabular-nums text-muted sm:text-xs md:px-2 md:py-3 md:text-left md:align-top">
                <span className="inline-flex rounded-md bg-violet-soft/60 px-2 py-0.5 text-violet">
                  {item.latestVersionNumber
                    ? t('deliverables.versionShort', { number: item.latestVersionNumber })
                    : t('deliverables.noVersionShort')}
                </span>
              </td>
              <td className="col-span-2 text-[11px] tabular-nums sm:text-xs md:px-2 md:py-3 md:align-top">
                <span className="mb-1 block text-[10px] tracking-wide text-muted uppercase md:hidden">
                  {t('deliverables.dueDate')}
                </span>
                <time
                  className={item.isOverdue ? 'font-medium text-danger' : 'text-muted'}
                  dateTime={item.dueDate ?? undefined}
                >
                  {item.dueDate ? formatDay(item.dueDate, dateLocale) : t('common.notProvided')}
                </time>
                {item.isOverdue ? (
                  <span className="mt-0.5 block text-[11px] text-danger">
                    {t('common.overdue')}
                  </span>
                ) : null}
              </td>
              {canRemark && thesisId ? (
                <td className="md:px-1 md:py-3 md:align-top">
                  <LinkedRemarkButton
                    thesisId={thesisId}
                    subject={item.title}
                    deliverableId={item.id}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
