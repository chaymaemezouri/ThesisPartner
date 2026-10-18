import { useT } from '../../../i18n/LocaleContext';
import type { DeliverableListItem } from '../hooks/use-deliverables';

const STYLE = {
  DRAFT: 'bg-brand-soft text-brand',
  SUBMITTED: 'bg-violet-soft text-violet',
  CHANGES_REQUESTED: 'bg-warn-soft text-warn',
  VALIDATED: 'bg-ok-soft text-ok',
  CANCELLED: 'bg-canvas text-muted',
} as const;

export function DeliverableStatusBadge({ status }: { status: DeliverableListItem['status'] }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[status]}`}
    >
      {t(`deliverables.status.${status}`)}
    </span>
  );
}
