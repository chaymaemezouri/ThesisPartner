import { useT } from '../../../i18n/LocaleContext';
import type { RemarkListItem } from '../hooks/use-remarks';

const STYLE = {
  OPEN: 'bg-brand-soft text-brand',
  IN_PROGRESS: 'bg-violet-soft text-violet',
  RESOLVED: 'bg-ok-soft text-ok',
  CLOSED: 'bg-canvas text-muted',
} as const;

export function RemarkStatusBadge({ status }: { status: RemarkListItem['status'] }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[status]}`}
    >
      {t(`remarks.statusLabel.${status}`)}
    </span>
  );
}
