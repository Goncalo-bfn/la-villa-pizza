import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const tones: Record<ToastTone, string> = {
  success: 'border-success/40 text-foreground',
  error: 'border-destructive/40 text-foreground',
  info: 'border-border text-foreground',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const { count } = useCart();

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 transition-all duration-300',
          count > 0 ? 'bottom-28' : 'bottom-6',
        )}
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-popover/95 px-4 py-3 text-sm shadow-card backdrop-blur animate-sheet-up',
                tones[toast.tone],
              )}
            >
              <Icon
                className={cn(
                  'size-5 shrink-0',
                  toast.tone === 'success' && 'text-success',
                  toast.tone === 'error' && 'text-destructive',
                  toast.tone === 'info' && 'text-accent',
                )}
              />
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Fechar aviso"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa ser usado dentro de ToastProvider');
  return context;
}
