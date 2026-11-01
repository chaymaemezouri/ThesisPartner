import { useState, type ReactNode } from 'react';
import { formErrorMessage } from '../../forms/api-errors';
import { useLocale, useT } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/translate';
import { useDashboard } from '../dashboard/hooks/use-dashboard';

type Slice = { label: string; value: number; color: string };
type Bar = { label: string; value: number; color: string };
type DayPoint = { date: string; count: number };

const COLORS = {
  brand: '#8fb4ef',
  ok: '#7dceb0',
  warn: '#efc08a',
  danger: '#f0a0a8',
  teal: '#8fd0c6',
  violet: '#b9a8e8',
  mint: '#9fd9c5',
  purple: '#6b5ce7',
  muted: '#c4c4cb',
  line: '#ececf1',
  ink: '#5c5c66',
} as const;

export function ProfileAnalytics() {
  const t = useT();
  const dashboard = useDashboard();

  if (dashboard.isLoading) {
    return (
      <div className="mt-4 grid gap-4 lg:grid-cols-2" aria-busy="true">
        <div className="h-72 animate-pulse rounded-2xl bg-surface" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface" />
        <div className="h-56 animate-pulse rounded-2xl bg-surface lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface lg:col-span-2" />
      </div>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <p className="mt-4 text-sm text-danger" role="alert">
        {formErrorMessage(dashboard.error, t)}
      </p>
    );
  }

  const data = dashboard.data;
  const objectives = data.objectives;
  const deliverables = data.deliverables;

  const objectiveSlices: Slice[] = [
    { label: t('supervision.inProgress'), value: objectives.inProgress, color: COLORS.brand },
    { label: t('dashboard.validated'), value: objectives.completed, color: COLORS.ok },
    { label: t('dashboard.draft'), value: objectives.planned, color: COLORS.muted },
    { label: t('dashboard.overdueCount'), value: objectives.overdue, color: COLORS.danger },
  ].filter((slice) => slice.value > 0);

  const deliverableSlices: Slice[] = [
    { label: t('dashboard.validated'), value: deliverables.validated, color: COLORS.ok },
    { label: t('dashboard.submitted'), value: deliverables.submitted, color: COLORS.brand },
    {
      label: t('dashboard.changesRequested'),
      value: deliverables.changesRequested,
      color: COLORS.warn,
    },
    { label: t('dashboard.draft'), value: deliverables.draft, color: COLORS.muted },
    { label: t('dashboard.overdueCount'), value: deliverables.overdue, color: COLORS.danger },
  ].filter((slice) => slice.value > 0);

  const progressBars: Bar[] = [
    {
      label: t('dashboard.thesisProgress'),
      value: data.workProgress.percentage,
      color: COLORS.brand,
    },
    {
      label: t('dashboard.profileCompletion'),
      value: data.profileCompletion.percentage,
      color: COLORS.teal,
    },
    { label: t('dashboard.progress'), value: data.progress.percentage, color: COLORS.violet },
  ];

  const activityBars: Bar[] = Object.entries(
    countActivity(data.recentActivity.map((item) => item.type)),
  )
    .map(([key, value]) => ({
      label: t(key as MessageKey),
      value,
      color: activityColor(key),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            {t('profile.tabAnalytics')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('profile.analyticsIntro')}</p>
        </div>
        {data.thesis ? (
          <p className="max-w-sm truncate text-xs text-muted">
            {data.thesis.title}
            {' · '}
            {t(data.thesis.doctoralYear === 1 ? 'dashboard.yearOne' : 'dashboard.yearMany', {
              count: data.thesis.doctoralYear,
            })}
          </p>
        ) : (
          <p className="text-xs text-muted">{t('profile.analyticsNoThesis')}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('profile.analyticsObjectivesChart')}>
          <DonutChart
            slices={objectiveSlices}
            empty={t('profile.analyticsChartEmpty')}
            centerLabel={`${objectives.completed}/${objectives.total || 0}`}
            centerHint={t('nav.objectives')}
          />
        </ChartCard>
        <ChartCard title={t('profile.analyticsDeliverablesChart')}>
          <DonutChart
            slices={deliverableSlices}
            empty={t('profile.analyticsChartEmpty')}
            centerLabel={`${deliverables.validated}/${deliverables.total || 0}`}
            centerHint={t('dashboard.validated')}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('profile.analyticsProgressChart')}>
          <HorizontalBars bars={progressBars} empty={t('profile.analyticsChartEmpty')} unit="%" />
        </ChartCard>
        <ChartCard title={t('profile.analyticsActivityChart')}>
          <HorizontalBars bars={activityBars} empty={t('dashboard.noActivity')} showValues />
        </ChartCard>
      </div>

      <ChartCard title={t('profile.analyticsDotChart')}>
        <DotActivityChart points={data.activityByDay} empty={t('profile.analyticsDotEmpty')} />
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_8px_rgba(15,23,42,0.04)] sm:p-5">
      <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DonutChart({
  slices,
  empty,
  centerLabel,
  centerHint,
}: {
  slices: Slice[];
  empty: string;
  centerLabel: string;
  centerHint: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted">{empty}</p>;
  }

  const size = 180;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative shrink-0">
        <svg
          role="img"
          aria-label={centerHint}
          viewBox={`0 0 ${size} ${size}`}
          className="h-44 w-44"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={COLORS.line}
            strokeWidth={stroke}
          />
          {slices.map((slice) => {
            const length = (slice.value / total) * circumference;
            const node = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += length;
            return node;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-lg font-semibold tabular-nums text-ink">{centerLabel}</p>
            <p className="text-[11px] text-muted">{centerHint}</p>
          </div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: slice.color }}
              />
              <span className="truncate text-ink">{slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {slice.value}
              <span className="ml-1 text-[11px]">({Math.round((slice.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HorizontalBars({
  bars,
  empty,
  unit,
  showValues = false,
}: {
  bars: Bar[];
  empty: string;
  unit?: string;
  showValues?: boolean;
}) {
  if (bars.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">{empty}</p>;
  }
  const max = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <ul className="space-y-3">
      {bars.map((bar) => {
        const width = Math.max(4, Math.round((bar.value / max) * 100));
        return (
          <li key={bar.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-ink">{bar.label}</p>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                {bar.value}
                {unit ?? ''}
                {showValues && !unit ? '' : null}
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${width}%`, background: bar.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DotActivityChart({ points, empty }: { points: DayPoint[]; empty: string }) {
  const { dateLocale } = useLocale();
  const [active, setActive] = useState<number | null>(null);
  const total = points.reduce((sum, point) => sum + point.count, 0);
  if (points.length === 0 || total === 0) {
    return <p className="py-10 text-center text-sm text-muted">{empty}</p>;
  }

  const maxCount = Math.max(...points.map((point) => point.count), 1);
  const unit = Math.max(1, Math.ceil(maxCount / 12));
  const maxDots = Math.ceil(maxCount / unit);
  const yMax = niceCeil(maxDots * unit);
  const yTicks = [0, Math.round(yMax / 3), Math.round((2 * yMax) / 3), yMax];

  const padLeft = 44;
  const padRight = 12;
  const padTop = 18;
  const padBottom = 36;
  const plotH = 200;
  const colGap = 4;
  const colW = Math.max(8, Math.min(14, Math.floor(520 / points.length) - colGap));
  const plotW = points.length * (colW + colGap);
  const width = padLeft + plotW + padRight;
  const height = padTop + plotH + padBottom;
  const r = Math.min(5, colW / 2 - 0.5);
  const selected = active ?? findPeakIndex(points);

  const formatDay = (iso: string) => {
    const date = new Date(`${iso}T12:00:00.000Z`);
    return new Intl.DateTimeFormat(dateLocale, { month: 'short', day: 'numeric' }).format(date);
  };

  const xLabels = tickDayIndexes(points.length).map((index) => ({
    index,
    label: formatDay(points[index]!.date),
  }));

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="daily activity"
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-64 w-full min-w-[28rem]"
        onMouseLeave={() => setActive(null)}
      >
        {yTicks.map((tick) => {
          const y = padTop + plotH - (tick / yMax) * plotH;
          return (
            <g key={`y-${tick}`}>
              <line
                x1={padLeft}
                x2={padLeft + plotW}
                y1={y}
                y2={y}
                stroke={COLORS.line}
                strokeWidth={1}
              />
              <text x={padLeft - 10} y={y + 4} textAnchor="end" fill={COLORS.muted} fontSize="11">
                {tick}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const dots = Math.ceil(point.count / unit);
          const x = padLeft + index * (colW + colGap) + colW / 2;
          const isActive = index === selected;
          const fill = isActive ? COLORS.purple : COLORS.mint;
          return (
            <g key={point.date} onMouseEnter={() => setActive(index)} style={{ cursor: 'pointer' }}>
              <rect
                x={x - colW / 2 - 1}
                y={padTop}
                width={colW + 2}
                height={plotH}
                fill="transparent"
              />
              {Array.from({ length: dots }, (_, dotIndex) => {
                const value = (dotIndex + 1) * unit;
                const y = padTop + plotH - (Math.min(value, yMax) / yMax) * plotH + r;
                return <circle key={dotIndex} cx={x} cy={y} r={r} fill={fill} />;
              })}
            </g>
          );
        })}

        {(() => {
          const point = points[selected]!;
          const x = padLeft + selected * (colW + colGap) + colW / 2;
          const topY = padTop + plotH - (point.count / yMax) * plotH;
          return (
            <g pointerEvents="none">
              <line
                x1={padLeft}
                x2={x}
                y1={topY}
                y2={topY}
                stroke={COLORS.purple}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <polygon
                points={`${padLeft + 4},${topY - 4} ${padLeft},${topY} ${padLeft + 4},${topY + 4}`}
                fill={COLORS.purple}
              />
              <polygon
                points={`${x - 4},${topY - 4} ${x},${topY} ${x - 4},${topY + 4}`}
                fill={COLORS.purple}
              />
              <rect x={2} y={topY - 12} width={36} height={22} rx={6} fill={COLORS.purple} />
              <text
                x={20}
                y={topY + 3}
                textAnchor="middle"
                fill="#fff"
                fontSize="11"
                fontWeight="700"
              >
                {point.count}
              </text>
              <rect
                x={x - 28}
                y={padTop + plotH + 8}
                width={56}
                height={22}
                rx={6}
                fill={COLORS.purple}
              />
              <text
                x={x}
                y={padTop + plotH + 23}
                textAnchor="middle"
                fill="#fff"
                fontSize="11"
                fontWeight="600"
              >
                {formatDay(point.date)}
              </text>
            </g>
          );
        })()}

        {xLabels.map(({ index, label }) => {
          if (index === selected) return null;
          const x = padLeft + index * (colW + colGap) + colW / 2;
          return (
            <text
              key={`x-${index}`}
              x={x}
              y={padTop + plotH + 22}
              textAnchor="middle"
              fill={COLORS.muted}
              fontSize="11"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function niceCeil(value: number) {
  if (value <= 3) return 3;
  if (value <= 6) return 6;
  if (value <= 12) return 12;
  const step = value <= 30 ? 5 : 10;
  return Math.ceil(value / step) * step;
}

function findPeakIndex(points: DayPoint[]) {
  let best = 0;
  for (let index = 1; index < points.length; index += 1) {
    if (points[index]!.count >= points[best]!.count) best = index;
  }
  return best;
}

function tickDayIndexes(length: number) {
  if (length <= 1) return [0];
  const step = Math.max(1, Math.round((length - 1) / 6));
  const indexes = new Set<number>();
  for (let index = 0; index < length; index += step) indexes.add(index);
  indexes.add(length - 1);
  return [...indexes].sort((a, b) => a - b);
}

function countActivity(types: string[]) {
  return types.reduce<Record<string, number>>((acc, type) => {
    const key = activityLabelKey(type);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function activityLabelKey(type: string): MessageKey {
  if (type.startsWith('OBJECTIVE_')) return 'activity.OBJECTIVE_UPDATED';
  if (type.startsWith('TASK_')) return 'activity.TASK_COMPLETED';
  if (type.startsWith('DELIVERABLE_')) return 'activity.DELIVERABLE_UPDATED';
  if (type.startsWith('REMARK_')) return 'activity.REMARK_CREATED';
  if (type === 'PROFILE_UPDATED') return 'activity.PROFILE_UPDATED';
  if (type === 'THESIS_CREATED') return 'activity.THESIS_CREATED';
  if (type === 'THESIS_UPDATED') return 'activity.THESIS_UPDATED';
  if (type === 'MEMBER_ADDED') return 'activity.MEMBER_ADDED';
  return 'activity.THESIS_UPDATED';
}

function activityColor(key: string): string {
  if (key.includes('OBJECTIVE') || key.includes('TASK')) return COLORS.brand;
  if (key.includes('DELIVERABLE')) return COLORS.teal;
  if (key.includes('REMARK')) return COLORS.warn;
  if (key.includes('PROFILE')) return COLORS.violet;
  return COLORS.ink;
}
