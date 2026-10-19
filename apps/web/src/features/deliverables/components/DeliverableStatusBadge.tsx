import { useT } from '../../../i18n/LocaleContext';
import type { DeliverableListItem } from '../hooks/use-deliverables';
import { STATUS_PRESENTATION } from '../presentation';

export function DeliverableStatusBadge({ status }: { status: DeliverableListItem['status'] }) {
  const t = useT();
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium sm:text-xs ${STATUS_PRESENTATION[status].badge}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {t(`deliverables.status.${status}`)}
    </span>
  );
}
