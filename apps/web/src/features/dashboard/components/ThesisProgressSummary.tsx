import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { useT } from '../../../i18n/LocaleContext';
import type { IconName } from '../../../routes/nav';
import type { DashboardData } from '../labels';

export function ThesisProgressSummary({
  thesis,
  progress,
  workProgress,
  objectives,
  deliverables,
  paths = { thesis: '/profil', objectives: '/objectifs', deliverables: '/livrables' },
  showThesisLink = true,
  variant = 'student',
}: {
  thesis: DashboardData['thesis'];
  progress: DashboardData['progress'];
  workProgress: DashboardData['workProgress'];
  objectives: DashboardData['objectives'];
  deliverables: DashboardData['deliverables'];
  paths?: { thesis?: string; objectives: string; deliverables: string };
  showThesisLink?: boolean;
  variant?: 'student' | 'supervisor';
}) {
  const t = useT();
  if (!thesis) {
    return (
      <section className="rounded-md border border-line bg-surface p-4 shadow-card">
        <h2 className="text-base font-semibold text-ink">{t('profile.thesis')}</h2>
        <p className="mt-1 text-sm text-muted">{t('module.emptyDescription')}</p>
        <Link to="/profil" className="mt-3 inline-flex text-sm font-medium text-brand">
          {t('profile.createThesis')}
        </Link>
      </section>
    );
  }

  const percentage = workProgress.percentage;
  const stats = [
    {
      to: paths.objectives,
      label: t('nav.objectives'),
      value: `${objectives.completed} / ${objectives.total}`,
      icon: 'objectives' as const,
      tone: 'bg-brand-soft text-brand',
    },
    {
      to: paths.deliverables,
      label: t('nav.deliverables'),
      value: String(deliverables.total),
      icon: 'deliverables' as const,
      tone: 'bg-teal-soft text-teal',
    },
    {
      to: `${paths.deliverables}?status=VALIDATED`,
      label: t('dashboard.validated'),
      value: String(deliverables.validated),
      icon: 'portfolio' as const,
      tone: 'bg-ok-soft text-ok',
    },
    {
      to: `${paths.deliverables}?status=CHANGES_REQUESTED`,
      label: t('dashboard.changesRequested'),
      value: String(deliverables.changesRequested),
      icon: 'remarks' as const,
      tone: 'bg-warn-soft text-warn',
    },
    {
      to: `${paths.deliverables}?status=SUBMITTED`,
      label: t('dashboard.submitted'),
      value: String(deliverables.submitted),
      icon: 'watch' as const,
      tone: 'bg-violet-soft text-violet',
    },
  ];

  if (variant === 'supervisor') {
    return (
      <section className="overflow-hidden rounded-md border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-4 border-b border-line p-4">
          <ProgressRing percentage={percentage} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{t('dashboard.thesisProgress')}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted">{thesis.title}</p>
            <p
              className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[progress.status]}`}
            >
              {t(`progressStatus.${progress.status}`)}
            </p>
          </div>
        </div>
        <ul className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((item) => (
            <Stat key={item.label} {...item} compact />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface shadow-card lg:h-full">
      <div className="shrink-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-ink">{t('profile.thesis')}</h2>
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">{thesis.title}</p>
          </div>
          {showThesisLink && paths.thesis ? (
            <Link to={paths.thesis} className="shrink-0 text-sm font-medium text-brand">
              {t('profile.thesis')}
            </Link>
          ) : null}
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          {showThesisLink && paths.thesis ? (
            <Link
              to={paths.thesis}
              className="shrink-0"
              aria-label={`${t('dashboard.progress')} ${percentage}`}
            >
              <ProgressRing percentage={percentage} />
            </Link>
          ) : (
            <div className="shrink-0" aria-label={`${t('dashboard.progress')} ${percentage}`}>
              <ProgressRing percentage={percentage} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{t('dashboard.thesisProgress')}</p>
            <p
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[progress.status]}`}
            >
              {t(`progressStatus.${progress.status}`)}
            </p>
          </div>
        </div>
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-line bg-canvas/70 px-3 py-3">
        {stats.map((item) => (
          <Stat key={item.label} {...item} />
        ))}
      </ul>
    </section>
  );
}

const STATUS_TONE = {
  NOT_STARTED: 'bg-canvas text-muted',
  ON_TRACK: 'bg-ok-soft text-ok',
  ATTENTION: 'bg-warn-soft text-warn',
  AT_RISK: 'bg-danger-soft text-danger',
} as const;

function ProgressRing({ percentage, size = 'md' }: { percentage: number; size?: 'sm' | 'md' }) {
  const outer =
    size === 'sm'
      ? 'grid h-16 w-16 place-items-center rounded-full'
      : 'grid h-24 w-24 place-items-center rounded-full sm:h-28 sm:w-28';
  const inner =
    size === 'sm'
      ? 'grid h-12 w-12 place-items-center rounded-full bg-surface'
      : 'grid h-[4.75rem] w-[4.75rem] place-items-center rounded-full bg-surface sm:h-[5.5rem] sm:w-[5.5rem]';
  const label =
    size === 'sm'
      ? 'text-xs font-semibold tabular-nums text-brand'
      : 'text-lg font-semibold tabular-nums text-brand sm:text-xl';
  return (
    <div
      className={outer}
      style={{
        background: `conic-gradient(var(--color-brand) ${percentage * 3.6}deg, var(--color-brand-soft) 0deg)`,
      }}
    >
      <div className={inner}>
        <span className={label}>{percentage} %</span>
      </div>
    </div>
  );
}

function Stat({
  to,
  label,
  value,
  icon,
  tone,
  compact = false,
}: {
  to: string;
  label: string;
  value: string;
  icon: IconName;
  tone: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <li>
        <Link
          to={to}
          className="flex flex-col gap-2 rounded-md border border-line bg-canvas/50 px-3 py-2.5 transition-colors hover:border-brand/25 hover:bg-surface"
        >
          <span className="flex items-center gap-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${tone}`}>
              <Icon name={icon} className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 truncate text-xs font-medium text-muted">{label}</span>
          </span>
          <span className="text-sm font-semibold tabular-nums text-ink">{value}</span>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-md border border-transparent bg-surface px-3 py-2 shadow-control transition-[background-color,border-color,box-shadow] duration-150 hover:border-brand/25 hover:bg-white"
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-ink">{label}</span>
        <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{value}</span>
        <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted" />
      </Link>
    </li>
  );
}
