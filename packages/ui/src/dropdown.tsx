import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from './cn';

type DropdownProps = {
  label: ReactNode;
  menuLabel: string;
  children: (close: () => void) => ReactNode;
};

export function Dropdown({ label, menuLabel, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5 text-sm font-medium text-ink shadow-control transition-[background-color,border-color,box-shadow] duration-150 hover:border-brand/30 hover:bg-brand-soft/50',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          className="absolute right-0 z-20 mt-2 min-w-44 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-card"
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
