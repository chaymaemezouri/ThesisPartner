import type { ReactNode } from 'react';
import { ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';

export type AdminTone = 'brand' | 'ok' | 'warn' | 'danger' | 'teal' | 'violet' | 'muted';

export type AdminTrendPoint = { date: string; count: number };

const TONE: Record<
  AdminTone,
  { bar: string; soft: string; ink: string; deltaUp: string; deltaDown: string }
> = {
  brand: {
    bar: '#2463c5',
    soft: 'bg-brand-soft text-brand',
    ink: 'text-brand',
    deltaUp: 'text-ok',
    deltaDown: 'text-danger',
  },
  ok: {
    bar: '#167448',
    soft: 'bg-ok-soft text-ok',
    ink: 'text-ok',
    deltaUp: 'text-ok',
    deltaDown: 'text-danger',
  },
  warn: {
    bar: '#b85c12',
    soft: 'bg-warn-soft text-warn',
    ink: 'text-warn',
    deltaUp: 'text-ok',
    deltaDown: 'text-danger',
  },
  danger: {
    bar: '#c72e3a',
    soft: 'bg-danger-soft text-danger',
    ink: 'text-danger',
    deltaUp: 'text-ok',
    deltaDown: 'text-danger',
  },
  teal: {
    bar: '#0f766e',
    soft: 'bg-teal-soft text-teal',
    ink: 'text-teal',
    deltaUp: 'text-ok',
    deltaDown: 'text-danger',
  },
  violet: {
    bar: '#6650b8',
    soft: 'bg-violet-soft text-violet',
    ink: 'text-violet',
    deltaUp: 'text-ok',
    deltaDown: 'text-danger',
  },
  muted: {
    bar: '#8a8a93',
    soft: 'bg-canvas text-muted',
    ink: 'text-muted',
    deltaUp: 'text-ok',
    deltaDown: 'text-danger',
  },
};

export type AdminDelta = {
  absolute: number;
  percent?: number | null;
  invert?: boolean;
  label?: string;
};

export type AdminShare = {
  part: number;
  total: number;
  label?: string;
};

function sumWindow(points: AdminTrendPoint[], start: number, end: number): number {
  return points.slice(start, end).reduce((sum, point) => sum + point.count, 0);
}

export function lastNSum(points: AdminTrendPoint[], days: number): number {
  if (days < 1 || points.length === 0) return 0;
  return sumWindow(points, Math.max(0, points.length - days), points.length);
}

export function comparePeriod(points: AdminTrendPoint[], days: number): AdminDelta | null {
  if (days < 1 || points.length < days * 2) return null;
  const recent = sumWindow(points, points.length - days, points.length);
  const previous = sumWindow(points, points.length - days * 2, points.length - days);
  const absolute = recent - previous;
  const percent = previous === 0 ? (recent === 0 ? 0 : null) : (absolute / previous) * 100;
  return { absolute, percent };
}

export function shareOf(part: number, total: number, label?: string): AdminShare | null {
  if (total <= 0 || part < 0) return null;
  return { part, total, label };
}

export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

export function AdminKpi({
  label,
  value,
  hint,
  tone = 'brand',
  icon,
  trend,
  delta,
  share,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: AdminTone;
  icon?: ReactNode;
  trend?: AdminTrendPoint[];
  delta?: AdminDelta | null;
  share?: AdminShare | null;
}) {
  const palette = TONE[tone];
  const display = typeof value === 'number' ? value.toLocaleString() : value;
  const computedDelta = delta ?? null;
  const good =
    computedDelta == null
      ? null
      : computedDelta.invert
        ? computedDelta.absolute <= 0
        : computedDelta.absolute >= 0;
  const sharePercent =
    share && share.total > 0 ? Math.min(100, (share.part / share.total) * 100) : null;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_14px_32px_rgba(36,99,197,0.1)]">
      <div className="flex items-start justify-between gap-3">
        <dt className="min-w-0 text-[11px] leading-4 font-semibold tracking-[0.06em] text-muted uppercase">
          {label}
        </dt>
        {icon ? (
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${palette.soft}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <dd className="mt-3 text-[2rem] leading-none font-semibold tracking-tight tabular-nums text-ink">
        {display}
      </dd>
      <div className="mt-2.5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
        {computedDelta ? (
          <p
            className={`text-xs font-semibold tabular-nums ${good ? palette.deltaUp : palette.deltaDown}`}
          >
            {computedDelta.absolute > 0 ? '▲ +' : computedDelta.absolute < 0 ? '▼ ' : '= '}
            {computedDelta.absolute === 0 ? '0' : Math.abs(computedDelta.absolute).toLocaleString()}
            {computedDelta.percent != null ? ` (${formatSignedPercent(computedDelta)})` : ''}
            {computedDelta.label ? (
              <span className="ml-1 font-medium text-muted"> {computedDelta.label}</span>
            ) : null}
          </p>
        ) : null}
        {share ? (
          <p className="text-xs tabular-nums text-muted">
            {share.part.toLocaleString()} / {share.total.toLocaleString()}
            {sharePercent != null ? ` · ${sharePercent.toFixed(0)}%` : ''}
            {share.label ? ` ${share.label}` : ''}
          </p>
        ) : null}
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      {sharePercent != null ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${sharePercent}%`, background: palette.bar }}
          />
        </div>
      ) : null}
      {trend && trend.length > 1 ? <MiniSpark points={trend} color={palette.bar} /> : null}
    </div>
  );
}

function formatSignedPercent(delta: AdminDelta): string {
  if (delta.percent == null) return '';
  const sign = delta.absolute > 0 ? '+' : delta.absolute < 0 ? '−' : '';
  return `${sign}${Math.abs(delta.percent).toFixed(1)}%`;
}

function MiniSpark({ points, color }: { points: AdminTrendPoint[]; color: string }) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const width = 120;
  const height = 28;
  const step = points.length === 1 ? 0 : width / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = index * step;
    const y = height - (point.count / max) * (height - 2) - 1;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const last = points[points.length - 1];
  const lastX = (points.length - 1) * step;
  const lastY = last ? height - (last.count / max) * (height - 2) - 1 : height;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-7 w-full" aria-hidden="true">
      <path
        d={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="2.2" fill={color} />
    </svg>
  );
}

export function AdminPanel({
  title,
  children,
  className = '',
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-line/80 px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminBadge({
  tone = 'muted',
  children,
}: {
  tone?: AdminTone;
  children: ReactNode;
}) {
  const styles: Record<AdminTone, string> = {
    brand: 'bg-brand-soft text-brand-strong',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    teal: 'bg-teal-soft text-teal',
    violet: 'bg-violet-soft text-violet',
    muted: 'bg-canvas text-muted',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export function AdminState({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: unknown;
  children: ReactNode;
}) {
  const t = useT();
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="h-[8.5rem] animate-pulse rounded-2xl border border-line bg-surface"
          />
        ))}
        <p className="sr-only">{t('common.loading')}</p>
      </div>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
      >
        {error instanceof ApiClientError ? error.body.message : t('errors.generic')}
      </p>
    );
  }
  return children;
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function toneColor(tone: AdminTone): string {
  return TONE[tone].bar;
}
