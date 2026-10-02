import { useT } from '../../../i18n/LocaleContext';
import type { RemarkListItem } from '../hooks/use-remarks';

const STYLE = {
  LOW: 'text-muted',
  MEDIUM: 'text-ink',
  HIGH: 'text-danger',
} as const;

export function RemarkPriorityBadge({ priority }: { priority: RemarkListItem['priority'] }) {
  const t = useT();
  return (
    <span className={`text-xs font-medium ${STYLE[priority]}`}>
      {t(`remarks.priorityLabel.${priority}`)}
    </span>
  );
}
