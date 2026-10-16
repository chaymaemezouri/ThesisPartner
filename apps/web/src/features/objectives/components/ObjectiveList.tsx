import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { formatShortDay } from '../../dashboard/labels';
import type { Objective } from '../hooks/use-objectives';
import { ObjectiveProgress } from './ObjectiveProgress';
import { ObjectiveStatusBadge } from './ObjectiveStatusBadge';

export function ObjectiveList({
  objectives,
  detailPath,
  canManage = false,
  onEdit,
  onDelete,
}: {
  objectives: Objective[];
  detailPath: (objectiveId: string) => string;
  canManage?: boolean;
  onEdit?: (objective: Objective) => void;
  onDelete?: (objective: Objective) => void;
}) {
  const t = useT();
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
      <ul className="divide-y divide-line">
        {objectives.map((objective, index) => (
          <li key={objective.id} className="flex items-stretch">
            <ObjectiveRow objective={objective} index={index} to={detailPath(objective.id)} />
            {canManage ? (
              <div className="flex shrink-0 items-center gap-0.5 border-l border-line px-1.5">
                <button
                  type="button"
                  aria-label={`${t('common.edit')} ${objective.title}`}
                  className="grid h-7 w-7 place-items-center rounded-md text-warn hover:bg-warn-soft"
                  onClick={() => onEdit?.(objective)}
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  aria-label={`${t('common.delete')} ${objective.title}`}
                  className="grid h-7 w-7 place-items-center rounded-md text-danger hover:bg-danger-soft"
                  onClick={() => onDelete?.(objective)}
                >
                  <TrashIcon />
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ObjectiveRow({
  objective,
  index,
  to,
}: {
  objective: Objective;
  index: number;
  to: string;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const active = objective.taskSummary.total - objective.taskSummary.cancelled;
  return (
    <Link
      to={to}
      className="block min-w-0 flex-1 px-3 py-2.5 transition-colors duration-150 hover:bg-brand-soft"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-soft text-[11px] font-semibold tabular-nums text-brand">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-medium text-ink">{objective.title}</span>
              <ObjectiveStatusBadge status={objective.status} />
              {objective.isOverdue ? (
                <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">
                  {t('objectives.overdue')}
                </span>
              ) : null}
            </div>
            <time className="shrink-0 text-xs text-muted" dateTime={objective.dueDate ?? undefined}>
              {objective.dueDate
                ? formatShortDay(objective.dueDate, dateLocale)
                : t('objectives.notDue')}
            </time>
            <Icon name="chevron" className="h-3.5 w-3.5 shrink-0 text-muted" />
          </div>
          <div className="mt-1.5 min-w-0">
            <ObjectiveProgress value={objective.progress} compact showLabel={false} />
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-xs font-semibold tabular-nums text-brand">
                {objective.progress} %
              </span>
              {active > 0 ? (
                <>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {t('objectives.stepsShort', {
                      done: objective.taskSummary.done,
                      active,
                    })}
                  </span>
                  <StepTrack summary={objective.taskSummary} />
                </>
              ) : (
                <span className="shrink-0 text-xs text-muted">{t('objectives.zeroSteps')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 20h4l10-10-4-4L4 16v4z" strokeLinejoin="round" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 7h14" strokeLinecap="round" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 13h6l1-13" strokeLinejoin="round" />
    </svg>
  );
}

function StepTrack({ summary }: { summary: Objective['taskSummary'] }) {
  const active = summary.total - summary.cancelled;
  const shown = Math.min(active, 10);
  return (
    <div className="hidden min-w-0 flex-1 items-center md:flex" aria-hidden="true">
      {Array.from({ length: shown }, (_, index) => {
        const done = index < summary.done;
        const current = !done && index < summary.done + summary.inProgress;
        const connector = index === 0 ? null : done ? 'bg-ok' : current ? 'bg-warn' : 'bg-line';
        return (
          <span key={index} className="flex min-w-0 flex-1 items-center">
            {connector ? <span className={`h-0.5 min-w-0.5 flex-1 ${connector}`} /> : null}
            <span
              className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border ${
                done
                  ? 'border-ok bg-ok text-[8px] font-bold text-white'
                  : current
                    ? 'border-warn bg-warn'
                    : 'border-line bg-surface'
              }`}
            >
              {done ? '✓' : null}
            </span>
          </span>
        );
      })}
    </div>
  );
}
