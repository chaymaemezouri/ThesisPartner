import { useT } from '../../../i18n/LocaleContext';
import type { DeliverableListItem } from '../hooks/use-deliverables';

const STYLE = {
  ARTICLE: 'bg-brand-soft text-brand',
  THESIS_CHAPTER: 'bg-teal-soft text-teal',
  REPORT: 'bg-teal-soft text-teal',
  CODE: 'bg-violet-soft text-violet',
  DATASET: 'bg-violet-soft text-violet',
  PRESENTATION: 'bg-warn-soft text-warn',
  POSTER: 'bg-warn-soft text-warn',
  COMMUNICATION: 'bg-brand-soft text-brand',
  OTHER: 'bg-canvas text-muted',
} as const;

export function DeliverableTypeLabel({ type }: { type: DeliverableListItem['type'] }) {
  const t = useT();
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[type]}`}>
      {t(`deliverables.type.${type}`)}
    </span>
  );
}
