import { useT } from '../../../i18n/LocaleContext';
import type { DeliverableListItem } from '../hooks/use-deliverables';
import { STATUS_PRESENTATION } from '../presentation';

export function DeliverableStatusBadge({ status }: { status: DeliverableListItem['status'] }) {
  const t = useT();
  return (
    <span className={`text-[11px] font-medium sm:text-xs ${STATUS_PRESENTATION[status].ink}`}>
      {t(`deliverables.status.${status}`)}
    </span>
  );
}
