import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/LocaleContext';
import type { RemarkListItem } from '../hooks/use-remarks';
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
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <ul className="divide-y divide-line" aria-label={t('remarks.listAria')}>
        {remarks.map((item) => (
          <li key={item.id}>
            <Link
              to={detailPath(item.id)}
              className="flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-canvas/70"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {item.target.label}
                  {item.status === 'CLOSED' ? null : (
                    <>
                      <span aria-hidden="true"> · </span>
                      {turnLabel(item.status, t)}
                    </>
                  )}
                </span>
              </span>
              <RemarkStatusBadge status={item.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
