import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from './cn';

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

const controlClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted';

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

function FieldMessages({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  FieldProps & InputHTMLAttributes<HTMLInputElement>
>(function Input({ id, label, hint, error, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClass, error && 'border-danger', className)}
        {...props}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ id, label, hint, error, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClass, 'min-h-28 resize-y', error && 'border-danger', className)}
        {...props}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
>(function Select({ id, label, hint, error, className, children, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClass, error && 'border-danger', className)}
        {...props}
      >
        {children}
      </select>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
});
