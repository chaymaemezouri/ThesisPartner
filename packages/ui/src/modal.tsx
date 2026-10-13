import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from './cn';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** `center` = desktop modal / mobile bottom sheet. `start` = side drawer (nav). */
  placement?: 'center' | 'start';
  closeLabel?: string;
};

export function Modal({
  open,
  title,
  onClose,
  children,
  placement = 'center',
  closeLabel = 'Close',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(placement === 'start' ? 'drawer-dialog' : 'modal-dialog')}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog__panel">
        {placement === 'center' ? (
          <div className="modal-dialog__handle" aria-hidden="true" />
        ) : null}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas/55 px-4 py-3">
          <h2 id={titleId} className="min-w-0 truncate text-base font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase transition-colors hover:bg-surface hover:text-ink"
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
        <div className="modal-dialog__body">{children}</div>
      </div>
    </dialog>
  );
}
