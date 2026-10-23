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
      ? 'border-transparent bg-transparent text-danger hover:bg-danger-soft'
      : tone === 'neutral'
        ? 'border-transparent bg-transparent text-ink hover:bg-canvas'
        : 'border-brand bg-brand text-white hover:bg-brand-strong';
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${showLabel ? 'rounded-lg px-3 py-2 text-sm font-medium' : 'h-9 w-9 rounded-full'} ${toneClass} ${className}`}
      {...props}
    >
      <Icon name={icon} className="h-4 w-4" />
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}
