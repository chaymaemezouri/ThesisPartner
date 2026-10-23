type Point = { date: string; count: number };

type Props = {
  points: Point[];
  label: string;
  emptyLabel: string;
};

export function AdminSparkline({ points, label, emptyLabel }: Props) {
  const max = Math.max(0, ...points.map((point) => point.count));
  const total = points.reduce((sum, point) => sum + point.count, 0);
  if (points.length === 0 || total === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }

  const width = 560;
  const height = 120;
  const pad = 8;
  const barGap = 1;
  const barWidth = Math.max(1, (width - pad * 2) / points.length - barGap);

  return (
    <figure className="space-y-2">
      <figcaption className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </figcaption>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full text-ink"
      >
        {points.map((point, index) => {
          const barHeight = max === 0 ? 0 : (point.count / max) * (height - pad * 2);
          const x = pad + index * (barWidth + barGap);
          const y = height - pad - barHeight;
          return (
            <rect
              key={point.date}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, point.count > 0 ? 1 : 0)}
              className="fill-current opacity-80"
            >
              <title>
                {point.date}: {point.count}
              </title>
            </rect>
          );
        })}
      </svg>
    </figure>
  );
}
