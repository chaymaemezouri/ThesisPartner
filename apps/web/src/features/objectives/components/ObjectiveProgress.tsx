export function ObjectiveProgress({
  value,
  compact = false,
  showLabel = true,
}: {
  value: number;
  compact?: boolean;
  showLabel?: boolean;
}) {
  const progress = Math.min(100, Math.max(0, value));
  return (
    <div className={`flex min-w-0 items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      <div
        className={`${compact ? 'h-1.5' : 'h-2'} min-w-0 flex-1 overflow-hidden rounded-full bg-brand-soft`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label={`Progression ${progress} %`}
      >
        <div
          className={`h-full transition-[width] duration-200 ${progress === 100 ? 'bg-ok' : 'bg-brand'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabel ? (
        <span
          className={`shrink-0 text-right font-semibold tabular-nums text-brand ${
            compact ? 'w-9 text-xs' : 'w-12 text-sm'
          }`}
        >
          {progress} %
        </span>
      ) : null}
    </div>
  );
}
