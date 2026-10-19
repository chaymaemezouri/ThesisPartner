import type { ButtonHTMLAttributes } from 'react';
import type { IconName } from '../routes/nav';
import { Icon } from './Icon';

export function IconAction({
  label,
  icon,
  tone = 'brand',
  className = '',
  type = 'button',
  showLabel = icon === 'plus',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: IconName;
  tone?: 'brand' | 'neutral' | 'danger';
  showLabel?: boolean;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-danger/30 bg-surface text-danger hover:bg-danger-soft'
      : tone === 'neutral'
        ? 'border-line bg-surface text-brand hover:bg-brand-soft'
        : 'border-brand bg-brand text-white hover:bg-brand-strong';
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border shadow-control transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${showLabel ? 'px-3 py-2 text-sm font-medium' : 'h-9 w-9'} ${toneClass} ${className}`}
      {...props}
    >
      <Icon name={icon} className="h-4 w-4" />
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}
