import { Plus, Star } from 'lucide-react';
import type { Category, Product } from '@/types';
import { formatCurrency, getStartingPrice } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  category?: Category;
  index: number;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, category, index, onSelect }: ProductCardProps) {
  const startingPrice = getStartingPrice(product, category);
  const isPizza = category?.kind === 'pizza';

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      disabled={!product.available}
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      className="group flex w-full animate-fade-up items-stretch gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-col sm:p-0"
    >
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl sm:w-full sm:rounded-none">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={640}
          height={640}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 hidden bg-card-img-fade sm:block" />
        {product.featured && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
            <Star className="size-3 fill-current" /> Destaque
          </span>
        )}
        {!product.available && (
          <span className="absolute inset-0 grid place-items-center bg-background/55 text-xs font-bold uppercase tracking-wide text-foreground backdrop-blur-[1px]">
            Indisponível
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-1 sm:px-4 sm:pb-4 sm:pt-1">
        <h3 className="text-lg font-bold leading-tight">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            {product.available ? (
              <>
                {isPizza && (
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    a partir de
                  </p>
                )}
                <p className="text-lg font-bold text-accent">{formatCurrency(startingPrice)}</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">Indisponível hoje</p>
            )}
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-transform group-hover:scale-110 group-active:scale-95">
            <Plus className="size-5" />
          </span>
        </div>
      </div>
    </button>
  );
}
