import { useT } from '../../../i18n/LocaleContext';

import { useObjectives } from '../../objectives/hooks/use-objectives';

import { markPhases, TIMELINE_PHASES, type PhaseMark } from '../phases';

export function ThesisTimeline({ thesisId }: { thesisId: string | null }) {
  const t = useT();

  const objectives = useObjectives(thesisId, {});

  const marks: PhaseMark[] = markPhases(
    objectives.data?.objectives.map((item) => ({ title: item.title, status: item.status })) ?? [],
  );

  return (
    <ol
      className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
      aria-label={t('dashboard.phasesAria')}
    >
      {TIMELINE_PHASES.map((phase, index) => {
        const mark = marks[index] ?? 'upcoming';

        return (
          <li key={phase.id} className="min-w-0">
            <div
              className={`h-0.5 ${mark === 'upcoming' ? 'bg-line' : 'bg-brand'}`}

              aria-hidden="true"
            />

            <p
              className={`mt-2 text-xs ${mark === 'current' ? 'font-medium text-brand' : 'text-muted'}`}
            >
              {t(`dashboard.phases.${phase.id}`)}

              {mark === 'current' ? (
                <span className="sr-only">{t('dashboard.phases.current')}</span>
              ) : null}

              {mark === 'done' ? (
                <span className="sr-only">{t('dashboard.phases.done')}</span>
              ) : null}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
