import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn, formatCurrency } from '@/lib/utils';

interface FloatingCartBarProps {
  onOpenCart: () => void;
  hidden?: boolean;
}

export function FloatingCartBar({ onOpenCart, hidden = false }: FloatingCartBarProps) {
  const { count, subtotal } = useCart();

  if (count === 0) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 transition-all duration-300',
        hidden ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100',
      )}
    >
      <button
        type="button"
        onClick={onOpenCart}
        aria-label={`Ver carrinho com ${count} ${count === 1 ? 'item' : 'itens'}, total ${formatCurrency(subtotal)}`}
        className="mx-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-border/80 bg-card/95 p-2 pl-3 text-left shadow-card backdrop-blur-xl transition-transform active:scale-[0.99]"
      >
        <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShoppingBag className="size-5" />
          <span
            key={count}
            className="absolute -right-1.5 -top-1.5 grid min-w-5 animate-pop place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground"
          >
            {count}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Ver carrinho / Finalizar</span>
          <span className="block text-xs text-muted-foreground">
            {count} {count === 1 ? 'item' : 'itens'} no pedido
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-2.5 text-sm font-bold text-primary-foreground shadow-glow">
          {formatCurrency(subtotal)}
          <ArrowRight className="size-4" />
        </span>
      </button>
    </div>
  );
}
