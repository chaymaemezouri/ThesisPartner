import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useT } from '../../../i18n/LocaleContext';
import type { RemarkListItem } from '../hooks/use-remarks';
import { REMARK_STATUS_STYLE } from '../presentation';
import { RemarkStatusBadge } from './RemarkStatusBadge';

function turnLabel(status: RemarkListItem['status'], t: ReturnType<typeof useT>) {
  if (status === 'CLOSED') return t('remarks.turn.done');
  if (status === 'RESOLVED') return t('remarks.turn.supervisor');
  return t('remarks.turn.student');
}

export function RemarkList({
  remarks,
  detailPath,
}: {
  remarks: RemarkListItem[];
  detailPath: (remarkId: string) => string;
}) {
  const t = useT();
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      <ul className="divide-y divide-line/80" aria-label={t('remarks.listAria')}>
        {remarks.map((item) => (
          <li key={item.id}>
            <Link
              to={detailPath(item.id)}
              className="group flex items-start gap-3 px-3 py-3.5 transition-colors hover:bg-canvas/65 sm:items-center sm:px-4"
            >
              <span
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${REMARK_STATUS_STYLE[item.status].edge} ${REMARK_STATUS_STYLE[item.status].soft} ${REMARK_STATUS_STYLE[item.status].ink} sm:mt-0`}
              >
                <Icon name="remarks" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium text-ink">{item.title}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Icon
                      name={
                        item.target.kind === 'OBJECTIVE' || item.target.kind === 'TASK'
                          ? 'objectives'
                          : item.target.kind === 'THESIS'
                            ? 'thesis'
                            : 'deliverables'
                      }
                      className="h-3 w-3 shrink-0"
                    />
                    <span className="break-words">{item.target.label}</span>
                  </span>
                  {item.status !== 'CLOSED' ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="profile" className="h-3 w-3" />
                      {turnLabel(item.status, t)}
                    </span>
                  ) : null}
                  {item.replyCount > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="messages" className="h-3 w-3" />
                      <span className="sr-only">{t('remarks.exchanges')} : </span>
                      {item.replyCount}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                <RemarkStatusBadge status={item.status} />
                <Icon
                  name="chevron"
                  className="hidden h-3.5 w-3.5 text-muted/70 transition-transform group-hover:translate-x-0.5 sm:block"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
