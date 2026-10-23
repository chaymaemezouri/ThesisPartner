import { useT } from '../../../i18n/LocaleContext';
import type { RemarkListItem } from '../hooks/use-remarks';

export function RemarkStatusBadge({ status }: { status: RemarkListItem['status'] }) {
  const t = useT();
  return (
    <span className="whitespace-nowrap text-[11px] font-medium text-muted">
      {t(`remarks.statusLabel.${status}`)}
    </span>
  );
}
