import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useEscape, useLockBody } from '@/hooks/useLockBody';

interface BaseSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  showClose?: boolean;
}

function Overlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      aria-hidden="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 animate-fade-in"
    />
  );
}

export function Drawer({
  open,
  onClose,
  children,
  className,
  ariaLabel = 'Painel',
  showClose = true,
}: BaseSheetProps) {
  useLockBody(open);
  useEscape(open, onClose);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <Overlay onClose={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card shadow-card animate-slide-in-right sm:max-w-md',
          className,
        )}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        )}
        {children}
      </aside>
    </div>,
    document.body,
  );
}

export function Modal({
  open,
  onClose,
  children,
  className,
  ariaLabel = 'Janela',
  showClose = true,
}: BaseSheetProps) {
  useLockBody(open);
  useEscape(open, onClose);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <Overlay onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-border bg-card shadow-card animate-sheet-up sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl',
          className,
        )}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-background"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
