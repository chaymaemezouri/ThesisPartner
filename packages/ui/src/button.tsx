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
        'inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold shadow-control transition-[background-color,border-color,box-shadow,transform,color] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:translate-y-0',
        variant === 'primary' &&
          'border-brand bg-brand text-white hover:border-brand-strong hover:bg-brand-strong hover:shadow-[0_7px_16px_rgba(36,87,167,0.18)]',
        variant === 'secondary' &&
          'border-line bg-surface text-ink hover:border-brand/35 hover:bg-brand-soft/60 hover:text-brand',
        variant === 'ghost' &&
          'border-transparent bg-transparent text-ink shadow-none hover:bg-brand-soft hover:text-brand',
        className,
      )}
      {...props}
    />
  );
}
