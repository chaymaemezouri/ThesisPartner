import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-surface p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)]',
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
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'bg-canvas text-ink',
        tone === 'ok' && 'bg-ok-soft text-ok',
        tone === 'warn' && 'bg-warn-soft text-warn',
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
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const frame = cn(
    'inline-flex items-center justify-center overflow-hidden rounded-full bg-brand-soft font-semibold text-brand',
    size === 'lg'
      ? 'h-[4.5rem] w-[4.5rem] text-lg ring-2 ring-white shadow-[0_2px_12px_rgba(15,23,42,0.08)]'
      : size === 'md'
        ? 'h-16 w-16 text-base ring-2 ring-white shadow-[0_2px_12px_rgba(15,23,42,0.08)]'
        : 'h-8 w-8 text-xs',
    className,
  );
  if (
    imageUrl &&
    (imageUrl.startsWith('https://') ||
      imageUrl.startsWith('http://') ||
      imageUrl.startsWith('/api/'))
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
    <span className={cn('block animate-pulse rounded-md bg-line', className)} aria-hidden="true" />
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand/30 bg-brand-soft px-6 py-10 text-center">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}
