import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow] duration-150',
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
        tone === 'neutral' && 'border-line bg-canvas text-muted',
        tone === 'ok' && 'border-ok/20 bg-ok-soft text-ok',
        tone === 'warn' && 'border-warn/20 bg-warn-soft text-warn',
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  label,
  imageUrl,
  decorative = false,
  size = 'sm',
  className,
}: {
  label: string;
  imageUrl?: string | null;
  decorative?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const frame = cn(
    'inline-flex items-center justify-center overflow-hidden rounded-full bg-brand-soft font-semibold text-brand',
    size === 'xl'
      ? 'h-24 w-24 text-xl ring-2 ring-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]'
      : size === 'lg'
        ? 'h-[4.5rem] w-[4.5rem] text-lg ring-2 ring-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]'
        : size === 'md'
          ? 'h-16 w-16 text-base ring-2 ring-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]'
          : 'h-8 w-8 text-xs',
    className,
  );
  if (
    imageUrl &&
    (imageUrl.startsWith('https://') ||
      imageUrl.startsWith('http://') ||
      imageUrl.startsWith('/api/') ||
      imageUrl.startsWith('/tmp-avatars/'))
  ) {
    return (
      <img src={imageUrl} alt={decorative ? '' : label} className={cn(frame, 'object-cover')} />
    );
  }

  const initials = label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      className={frame}
    >
      {initials || '·'}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn('block animate-pulse rounded-md bg-line/80', className)}
      aria-hidden="true"
    />
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed border-brand/25 bg-surface px-6 py-10 text-center shadow-control">
      <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-brand/35" aria-hidden="true" />
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}
