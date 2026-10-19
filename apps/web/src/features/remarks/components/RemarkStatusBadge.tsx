import { useT } from '../../../i18n/LocaleContext';
import type { RemarkListItem } from '../hooks/use-remarks';
import { REMARK_STATUS_STYLE } from '../presentation';

export function RemarkStatusBadge({ status }: { status: RemarkListItem['status'] }) {
  const t = useT();
  const style = REMARK_STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${style.soft} ${style.ink}`}
    >
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />
      {t(`remarks.statusLabel.${status}`)}
    </span>
  );
}
