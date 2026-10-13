import { useT } from '../../../i18n/LocaleContext';
import type { Meeting } from '../hooks/use-meetings';

const STYLE = {
  REQUESTED: 'bg-warn-soft text-warn',
  PLANNED: 'bg-brand-soft text-brand',
  HELD: 'bg-ok-soft text-ok',
  CANCELLED: 'bg-canvas text-muted',
} as const;

export function MeetingStatusBadge({ status }: { status: Meeting['status'] }) {
  const t = useT();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${STYLE[status]}`}
    >
      {t(`meetings.statusLabel.${status}`)}
    </span>
  );
}
