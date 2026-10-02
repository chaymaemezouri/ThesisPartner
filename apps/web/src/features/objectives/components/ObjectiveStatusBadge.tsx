import { useT } from '../../../i18n/LocaleContext';

const STYLE = {
  PLANNED: 'bg-violet-soft text-violet',
  IN_PROGRESS: 'bg-brand-soft text-brand',
  COMPLETED: 'bg-ok-soft text-ok',
  CANCELLED: 'bg-canvas text-muted',
} as const;

export function ObjectiveStatusBadge({ status }: { status: keyof typeof STYLE }) {
  const t = useT();
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${STYLE[status]}`}
    >
      {t(`objectives.status.${status}`)}
    </span>
  );
}
