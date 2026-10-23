import { useT } from '../../../i18n/LocaleContext';

const STATUS = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export function ObjectiveStatusBadge({ status }: { status: (typeof STATUS)[number] }) {
  const t = useT();
  return (
    <span className="whitespace-nowrap text-[11px] font-medium text-muted">
      {t(`objectives.status.${status}`)}
    </span>
  );
}
