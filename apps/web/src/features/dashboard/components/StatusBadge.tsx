import type { ReactNode } from 'react';

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs text-muted">
      {children}
    </span>
  );
}
