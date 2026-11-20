import { useEffect, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import type { CartFlavor, Category, Product } from '@/types';
import { useMenu } from '@/context/MenuContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import {
  cn,
  formatCurrency,
  getDefaultSizeId,
  getHalfPizzaUnitPrice,
  getStartingPrice,
  getUnitPrice,
  roundMoney,
} from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Sheet';
import { Textarea } from '@/components/ui/Input';
import { FALLBACK_PRODUCT_IMAGE } from '@/lib/assets';

interface ProductModalProps {
  product: Product | null;
  category?: Category;
  onClose: () => void;
}

export function ProductModal({ product, category, onClose }: ProductModalProps) {
  const { settings, categories, products } = useMenu();
  const { add } = useCart();
  const { showToast } = useToast();

  const isPizza = category?.kind === 'pizza';
  const [sizeId, setSizeId] = useState<string | undefined>();
  const [bordaId, setBordaId] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [halfMode, setHalfMode] = useState(false);
  const [secondFlavorId, setSecondFlavorId] = useState('');

  useEffect(() => {
    if (!product) return;
    setSizeId(isPizza ? getDefaultSizeId(settings, product) : undefined);
    setBordaId(isPizza ? settings.bordas[0]?.id : undefined);
    setQty(1);
    setNote('');
    setHalfMode(false);
    setSecondFlavorId('');
    // Reset when a new product is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) return null;

  const pizzaCategoryIds = new Set(
    categories.filter((item) => item.kind === 'pizza').map((item) => item.id),
  );
  const pizzaFlavors = products.filter(
    (item) => item.available && pizzaCategoryIds.has(item.categoryId),
  );
  const secondFlavor = pizzaFlavors.find((item) => item.id === secondFlavorId);

  const baseSizes = settings.sizes.filter((size) => (product.sizePrices?.[size.id] ?? 0) > 0);

  // Em meio a meio só valem os tamanhos existentes nos dois sabores (interseção).
  const availableSizes =
    isPizza && halfMode && secondFlavor
      ? baseSizes.filter((size) => (secondFlavor.sizePrices?.[size.id] ?? 0) > 0)
      : baseSizes;

  const selectedSizeId = availableSizes.some((size) => size.id === sizeId)
    ? sizeId
    : availableSizes[availableSizes.length - 1]?.id;
  const selectedSize = settings.sizes.find((size) => size.id === selectedSizeId);
  const selectedBorder = settings.bordas.find((borda) => borda.id === bordaId);

  const isHalf = isPizza && halfMode && Boolean(secondFlavor);
  const unitPrice =
    isHalf && secondFlavor
      ? getHalfPizzaUnitPrice(product, secondFlavor, selectedSizeId, selectedBorder)
      : getUnitPrice(product, category, selectedSizeId, selectedBorder);
  const total = roundMoney(unitPrice * qty);

  const canAdd =
    product.available &&
    (!isPizza ||
      (halfMode
        ? Boolean(secondFlavor && secondFlavor.id !== product.id && selectedSizeId)
        : Boolean(selectedSizeId)));

  const actionLabel =
    isPizza && halfMode
      ? !secondFlavor
        ? 'Escolha o 2º sabor'
        : availableSizes.length === 0
          ? 'Sem tamanho em comum'
          : `Adicionar · ${formatCurrency(total)}`
      : `Adicionar · ${formatCurrency(total)}`;

  const handleHalfToggle = (next: boolean) => {
    setHalfMode(next);
    if (!next) setSecondFlavorId('');
  };

  const selectSecondFlavor = (nextId: string) => {
    if (nextId === product.id) {
      showToast('Escolha um sabor diferente do primeiro', 'error');
      return;
    }
    setSecondFlavorId((current) => (current === nextId ? '' : nextId));
  };

  const handleAdd = () => {
    if (!canAdd) return;

    const flavors: [CartFlavor, CartFlavor] | undefined =
      isHalf && secondFlavor
        ? [
            { productId: product.id, name: product.name },
            { productId: secondFlavor.id, name: secondFlavor.name },
          ]
        : undefined;

    add({
      productId: product.id,
      name: isHalf ? 'Pizza Meio a Meio' : isPizza ? `Pizza ${product.name}` : product.name,
      flavors,
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
    showToast(`${qty}x ${isHalf ? 'Pizza Meio a Meio' : product.name} no carrinho`);
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
                const selected = size.id === selectedSizeId;
                const sizePrice =
                  isHalf && secondFlavor
                    ? getHalfPizzaUnitPrice(product, secondFlavor, size.id, undefined)
                    : product.sizePrices?.[size.id] ?? 0;
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
                      {formatCurrency(sizePrice)}
                    </p>
                  </button>
                );
              })}
            </div>
            {isHalf && secondFlavor && (
              <p className="mt-2 text-xs text-muted-foreground">
                Mostrando apenas os tamanhos disponíveis para os dois sabores.
              </p>
            )}
          </fieldset>
        )}

        {isPizza && (
          <button
            type="button"
            role="switch"
            aria-checked={halfMode}
            onClick={() => handleHalfToggle(!halfMode)}
            className="flex min-h-11 w-full items-center justify-between gap-4 rounded-xl border border-border bg-background/40 px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <span>
              <span className="block text-sm font-semibold">Meio a meio</span>
              <span className="block text-xs text-muted-foreground">
                Escolha um segundo sabor e pague o valor do mais caro.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent shadow-sm transition-colors',
                halfMode ? 'bg-success' : 'bg-input',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                  halfMode ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>
        )}

        {isPizza && halfMode && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Escolha o segundo sabor</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                O primeiro sabor é <span className="font-medium">{product.name}</span>. Toque em
                outro sabor para combinar.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {pizzaFlavors.map((flavor) => {
                const isFirst = flavor.id === product.id;
                const selected = flavor.id === secondFlavorId;
                const flavorCategory = categories.find(
                  (item) => item.id === flavor.categoryId,
                );
                const sizePrice = flavor.sizePrices?.[selectedSizeId ?? ''] ?? 0;
                const displayPrice =
                  sizePrice > 0 ? sizePrice : getStartingPrice(flavor, flavorCategory);

                return (
                  <button
                    key={flavor.id}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-disabled={isFirst}
                    disabled={isFirst}
                    aria-label={
                      isFirst
                        ? `${flavor.name}, já escolhido como primeiro sabor`
                        : selected
                          ? `${flavor.name}, segundo sabor selecionado. Toque para remover.`
                          : `Escolher ${flavor.name} como segundo sabor`
                    }
                    onClick={() => selectSecondFlavor(flavor.id)}
                    className={cn(
                      'relative flex min-h-[96px] flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all duration-200',
                      isFirst
                        ? 'cursor-not-allowed border-border bg-muted/40 opacity-60'
                        : selected
                          ? 'border-primary bg-primary/15 ring-1 ring-primary'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10',
                    )}
                  >
                    <div className="relative size-[52px] shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={flavor.image}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                      />
                      {selected && (
                        <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full border border-primary bg-primary text-primary-foreground ring-1 ring-background">
                          <Check className="size-3" aria-hidden="true" />
                        </span>
                      )}
                      {isFirst && (
                        <span className="absolute inset-x-1 bottom-1 rounded bg-background/85 py-0.5 text-[10px] font-semibold">
                          1º sabor
                        </span>
                      )}
                    </div>
                    <span className="line-clamp-1 text-sm font-semibold">{flavor.name}</span>
                    <span className="text-xs font-bold text-accent tabular-nums">
                      {sizePrice > 0 ? (
                        formatCurrency(sizePrice)
                      ) : (
                        <>a partir de {formatCurrency(displayPrice)}</>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Preço por pizza (maior sabor + borda cobrada uma vez)
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                {!secondFlavor ? (
                  'Selecione o segundo sabor para ver o preço.'
                ) : availableSizes.length === 0 ? (
                  'Esses sabores não têm tamanho em comum. Escolha outro sabor.'
                ) : (
                  <>
                    <span className="font-semibold">{product.name}</span>
                    <span className="text-muted-foreground"> + </span>
                    <span className="font-semibold">{secondFlavor.name}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-bold text-accent">
                      Você paga: {formatCurrency(unitPrice)}
                    </span>
                  </>
                )}
              </p>
            </div>

            {secondFlavor && availableSizes.length === 0 && (
              <p className="text-xs text-destructive">
                Não há tamanho disponível para essa combinação.
              </p>
            )}
          </div>
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
                      'flex min-h-11 w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all',
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
          {actionLabel}
        </Button>
      </div>
    </Modal>
  );
}
