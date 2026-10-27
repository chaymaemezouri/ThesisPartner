import { useId, useMemo, useState } from 'react';
import { toneColor, type AdminTone } from './AdminUi';

type Point = { date: string; count: number };

type Props = {
  points: Point[];
  label: string;
  emptyLabel: string;
  tone?: AdminTone;
};

export function AdminSparkline({ points, label, emptyLabel, tone = 'brand' }: Props) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const color = toneColor(tone);
  const max = Math.max(0, ...points.map((point) => point.count));
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const last = points[points.length - 1]?.count ?? 0;

  const path = useMemo(() => {
    if (points.length === 0) return '';
    const width = 560;
    const height = 140;
    const padX = 8;
    const padY = 12;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const step = points.length === 1 ? 0 : innerW / (points.length - 1);
    const coords = points.map((point, index) => {
      const x = padX + index * step;
      const y = padY + innerH - (max === 0 ? 0 : (point.count / max) * innerH);
      return { x, y };
    });
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (!first || !last) return '';
    const line = coords
      .map(
        (coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x.toFixed(1)} ${coord.y.toFixed(1)}`,
      )
      .join(' ');
    const area = `${line} L ${last.x.toFixed(1)} ${height - padY} L ${first.x.toFixed(1)} ${height - padY} Z`;
    return { line, area, coords, width, height, padY };
  }, [points, max]);

  if (points.length === 0 || total === 0 || typeof path === 'string') {
    return (
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
        <p className="mt-6 text-sm text-muted">{emptyLabel}</p>
      </div>
    );
  }

  const hovered = active != null ? points[active] : points[points.length - 1];

  return (
    <figure className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <figcaption className="text-[11px] font-semibold tracking-wide text-muted uppercase">
          {label}
        </figcaption>
        <p className="text-right text-sm font-semibold tabular-nums text-ink">
          {hovered?.count ?? last}
          <span className="ml-2 text-xs font-medium text-muted">{hovered?.date}</span>
        </p>
      </div>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${path.width} ${path.height}`}
        className="h-36 w-full"
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((line) => (
          <line
            key={line}
            x1={8}
            x2={path.width - 8}
            y1={12 + (path.height - 24) * line}
            y2={12 + (path.height - 24) * line}
            stroke="#e6e6e6"
          />
        ))}
        <path d={path.area} fill={`url(#${gradientId})`} />
        <path d={path.line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
        {path.coords.map((coord, index) => {
          const point = points[index];
          if (!point) return null;
          return (
            <g key={point.date}>
              <rect
                x={coord.x - 6}
                y={0}
                width={12}
                height={path.height}
                fill="transparent"
                onMouseEnter={() => setActive(index)}
              >
                <title>
                  {point.date}: {point.count}
                </title>
              </rect>
              {active === index ? (
                <>
                  <line
                    x1={coord.x}
                    x2={coord.x}
                    y1={path.padY}
                    y2={path.height - path.padY}
                    stroke={color}
                    strokeOpacity="0.25"
                  />
                  <circle cx={coord.x} cy={coord.y} r="4.5" fill={color} />
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
