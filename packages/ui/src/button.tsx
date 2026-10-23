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
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-[background-color,border-color,transform,color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variant === 'primary' &&
          'border-brand bg-brand text-white hover:border-brand-strong hover:bg-brand-strong',
        variant === 'secondary' &&
          'border-line bg-surface text-ink hover:border-ink/20 hover:bg-canvas',
        variant === 'ghost' && 'border-transparent bg-transparent text-ink hover:bg-canvas',
        className,
      )}
      {...props}
    />
  );
}
