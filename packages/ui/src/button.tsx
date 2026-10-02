import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-strong',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-canvas',
        variant === 'ghost' && 'text-ink hover:bg-canvas',
        className,
      )}
      {...props}
    />
  );
}
