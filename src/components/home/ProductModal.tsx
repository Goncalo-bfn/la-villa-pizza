import { useEffect, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import type { Category, Product } from '@/types';
import { useMenu } from '@/context/MenuContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import {
  cn,
  formatCurrency,
  getDefaultSizeId,
  getUnitPrice,
  roundMoney,
} from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Sheet';
import { Textarea } from '@/components/ui/Input';

interface ProductModalProps {
  product: Product | null;
  category?: Category;
  onClose: () => void;
}

export function ProductModal({ product, category, onClose }: ProductModalProps) {
  const { settings } = useMenu();
  const { add } = useCart();
  const { showToast } = useToast();

  const isPizza = category?.kind === 'pizza';
  const [sizeId, setSizeId] = useState<string | undefined>();
  const [bordaId, setBordaId] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const availableSizes = product
    ? settings.sizes.filter((size) => (product.sizePrices?.[size.id] ?? 0) > 0)
    : [];

  useEffect(() => {
    if (!product) return;
    setSizeId(isPizza ? getDefaultSizeId(settings, product) : undefined);
    setBordaId(isPizza ? settings.bordas[0]?.id : undefined);
    setQty(1);
    setNote('');
    // Reset when a new product is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) return null;

  const selectedSize = settings.sizes.find((size) => size.id === sizeId);
  const selectedBorder = settings.bordas.find((borda) => borda.id === bordaId);
  const unitPrice = getUnitPrice(product, category, sizeId, selectedBorder);
  const total = roundMoney(unitPrice * qty);
  const canAdd = product.available && (!isPizza || Boolean(sizeId));

  const handleAdd = () => {
    if (!canAdd) return;
    add({
      productId: product.id,
      name: isPizza ? `Pizza ${product.name}` : product.name,
      sizeId: isPizza ? selectedSize?.id : undefined,
      sizeName: isPizza ? selectedSize?.name : undefined,
      bordaId:
        isPizza && selectedBorder && selectedBorder.price > 0 ? selectedBorder.id : undefined,
      bordaName:
        isPizza && selectedBorder && selectedBorder.price > 0 ? selectedBorder.name : undefined,
      unitPrice,
      qty,
      note: note.trim() || undefined,
    });
    showToast(`${qty}x ${product.name} no carrinho`);
    onClose();
  };

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      ariaLabel={`Adicionar ${product.name}`}
      className="sm:max-w-md"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-3xl sm:rounded-t-3xl">
        <img src={product.image} alt={product.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
      </div>

      <div className="space-y-6 p-5 pt-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{product.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
          {!isPizza && (
            <p className="mt-2 text-lg font-bold text-accent">{formatCurrency(product.price ?? 0)}</p>
          )}
        </div>

        {isPizza && availableSizes.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Tamanho</legend>
            <div className="grid grid-cols-3 gap-2">
              {availableSizes.map((size) => {
                const selected = size.id === sizeId;
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSizeId(size.id)}
                    aria-pressed={selected}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/15 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <p className="font-semibold">{size.name}</p>
                    <p className="text-xs text-muted-foreground">{size.slices} fatias</p>
                    <p className="mt-1 text-sm font-bold text-accent">
                      {formatCurrency(product.sizePrices?.[size.id] ?? 0)}
                    </p>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {isPizza && settings.bordas.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Borda</legend>
            <div className="space-y-2">
              {settings.bordas.map((borda) => {
                const selected = borda.id === bordaId;
                return (
                  <button
                    key={borda.id}
                    type="button"
                    onClick={() => setBordaId(borda.id)}
                    aria-pressed={selected}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all',
                      selected
                        ? 'border-primary bg-primary/15'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          'grid size-5 place-items-center rounded-full border',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/50',
                        )}
                      >
                        {selected && <Check className="size-3" />}
                      </span>
                      {borda.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {borda.price > 0 ? `+ ${formatCurrency(borda.price)}` : 'grátis'}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="item-note" className="mb-2 block text-sm font-semibold">
            Alguma observação?
          </label>
          <Textarea
            id="item-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex.: sem cebola, bem assada…"
            maxLength={140}
            className="min-h-16 bg-background"
          />
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center gap-4 border-t border-border bg-card/95 p-4 backdrop-blur safe-bottom">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQty((current) => Math.max(1, current - 1))}
            className="grid size-11 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
            aria-label="Diminuir quantidade"
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-6 text-center text-lg font-bold tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((current) => current + 1)}
            className="grid size-11 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
            aria-label="Aumentar quantidade"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <Button
          variant="hero"
          size="xl"
          className="flex-1"
          onClick={handleAdd}
          disabled={!canAdd}
        >
          Adicionar · {formatCurrency(total)}
        </Button>
      </div>
    </Modal>
  );
}
