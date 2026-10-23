import { useT } from '../../../i18n/LocaleContext';
import type { Objective } from '../hooks/use-objectives';

export function ObjectiveStatusBadge({ status }: { status: Objective['status'] }) {
  const t = useT();
  return (
    <span className="whitespace-nowrap text-[11px] font-medium text-muted">
      {t(`objectives.status.${status}`)}
    </span>
  );
}
