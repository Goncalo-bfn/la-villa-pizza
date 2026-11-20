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
  getUnitPrice,
  roundMoney,
} from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
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
  const [isHalf, setIsHalf] = useState(false);
  const [flavorAId, setFlavorAId] = useState('');
  const [flavorBId, setFlavorBId] = useState('');

  const pizzaCategoryIds = new Set(
    categories.filter((item) => item.kind === 'pizza').map((item) => item.id),
  );
  const pizzaFlavors = products.filter(
    (item) => item.available && pizzaCategoryIds.has(item.categoryId),
  );
  const flavorA = pizzaFlavors.find((item) => item.id === flavorAId);
  const flavorB = pizzaFlavors.find((item) => item.id === flavorBId);

  const availableSizes = product
    ? settings.sizes.filter((size) => {
        const first = isHalf ? (flavorA ?? product) : product;
        const firstHasSize = (first.sizePrices?.[size.id] ?? 0) > 0;
        if (!isHalf || !flavorB) return firstHasSize;
        return firstHasSize && (flavorB.sizePrices?.[size.id] ?? 0) > 0;
      })
    : [];

  useEffect(() => {
    if (!product) return;
    setIsHalf(false);
    setFlavorAId(product.id);
    setFlavorBId('');
    setSizeId(isPizza ? getDefaultSizeId(settings, product) : undefined);
    setBordaId(isPizza ? settings.bordas[0]?.id : undefined);
    setQty(1);
    setNote('');
    // Reset when a new product is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) return null;

  const selectedSizeId = availableSizes.some((size) => size.id === sizeId)
    ? sizeId
    : availableSizes[availableSizes.length - 1]?.id;
  const selectedSize = settings.sizes.find((size) => size.id === selectedSizeId);
  const selectedBorder = settings.bordas.find((borda) => borda.id === bordaId);
  const unitPrice = isHalf
    ? getHalfPizzaUnitPrice(flavorA ?? product, flavorB, selectedSizeId, selectedBorder)
    : getUnitPrice(product, category, selectedSizeId, selectedBorder);
  const total = roundMoney(unitPrice * qty);
  const canAdd = product.available && (!isPizza || Boolean(selectedSizeId));

  const priceA = flavorA?.sizePrices?.[selectedSizeId ?? ''] ?? 0;
  const priceB = flavorB?.sizePrices?.[selectedSizeId ?? ''] ?? 0;
  const bordaLabel = (selectedBorder?.price ?? 0) > 0 ? ' + borda' : '';

  function toggleFlavor(nextId: string) {
    if (flavorAId === nextId) {
      setFlavorAId('');
      return;
    }
    if (flavorBId === nextId) {
      setFlavorBId('');
      return;
    }
    if (!flavorAId) {
      setFlavorAId(nextId);
      return;
    }
    if (!flavorBId) {
      setFlavorBId(nextId);
      return;
    }
    // Ambos os lados já escolhidos: troca o Sabor 1 e mantém o Sabor 2.
    setFlavorAId(nextId);
  }

  const handleAdd = () => {
    if (isHalf && (!flavorA || !flavorB)) {
      showToast('Escolha 2 sabores para montar a pizza meio a meio', 'error');
      return;
    }
    if (isHalf && flavorA && flavorB && flavorA.id === flavorB.id) {
      showToast('Escolha 2 sabores diferentes', 'error');
      return;
    }
    if (!canAdd) return;

    const flavors: [CartFlavor, CartFlavor] | undefined =
      isHalf && flavorA && flavorB
        ? [
            { productId: flavorA.id, name: flavorA.name },
            { productId: flavorB.id, name: flavorB.name },
          ]
        : undefined;
    const itemName = isHalf
      ? 'Pizza Meio a Meio'
      : isPizza
        ? `Pizza ${product.name}`
        : product.name;

    add({
      productId: isHalf && flavorA ? flavorA.id : product.id,
      name: itemName,
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
    showToast(`${qty}x ${itemName} no carrinho`);
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

        {isPizza && pizzaFlavors.length >= 2 && (
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Pizza meio a meio</p>
                <p className="text-xs text-muted-foreground">Escolha 2 sabores</p>
              </div>
              <Switch
                checked={isHalf}
                onCheckedChange={(checked) => {
                  setIsHalf(checked);
                  if (checked && !flavorAId) setFlavorAId(product.id);
                }}
                aria-label="Pizza meio a meio"
              />
            </div>

            {isHalf && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Toque em um sabor para escolher o Sabor 1, depois toque no Sabor 2. Não é possível
                  escolher o mesmo sabor nos dois lados.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {pizzaFlavors.map((flavor) => {
                    const selectedAs =
                      flavorAId === flavor.id ? 1 : flavorBId === flavor.id ? 2 : 0;
                    const flavorPrice = flavor.sizePrices?.[selectedSizeId ?? ''] ?? 0;
                    return (
                      <button
                        key={flavor.id}
                        type="button"
                        role="checkbox"
                        aria-checked={selectedAs > 0 ? 'true' : 'false'}
                        aria-label={
                          selectedAs === 1
                            ? `${flavor.name}, selecionado como Sabor 1 por ${formatCurrency(
                                flavorPrice,
                              )}. Toque para remover.`
                            : selectedAs === 2
                              ? `${flavor.name}, selecionado como Sabor 2 por ${formatCurrency(
                                  flavorPrice,
                                )}. Toque para remover.`
                              : `Escolher ${flavor.name} como sabor por ${formatCurrency(
                                  flavorPrice,
                                )}`
                        }
                        onClick={() => toggleFlavor(flavor.id)}
                        className={cn(
                          'relative flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all duration-200 min-h-[96px]',
                          selectedAs > 0
                            ? 'border-primary bg-primary/50 ring-1 ring-primary hover:border-primary/80'
                            : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10',
                        )}
                      >
                        <div className="relative size-[52px] shrink-0 rounded-lg overflow-hidden bg-muted">
                          <img
                            src={flavor.image}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                            onError={(event) => {
                              event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                            }}
                          />
                          {selectedAs > 0 && (
                            <span
                              className="absolute right-1 top-1 grid size-5 place-items-center rounded-full border border-primary bg-primary text-[10px] font-bold text-primary-foreground ring-1 ring-background"
                            >
                              {selectedAs}
                            </span>
                          )}
                          {selectedAs > 0 && (
                            <Check
                              className="absolute right-1 bottom-1 size-4 text-primary drop-shadow-sm"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <span className="line-clamp-1 font-semibold">{flavor.name}</span>
                        <span className="text-xs font-bold text-accent tabular-nums">
                          {formatCurrency(flavorPrice)}
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
                    {!flavorA || !flavorB ? (
                      'Selecione dois sabores para ver o preço'
                    ) : (
                      <>
                        Sabor 1: {flavorA.name} <span className="text-muted-foreground text-xs">({formatCurrency(priceA)})</span> + Sabor 2: {flavorB.name} <span className="text-muted-foreground text-xs">({formatCurrency(priceB)})</span> →{' '}
                        <span className="font-bold text-accent">
                          Você paga: {formatCurrency(unitPrice)}{bordaLabel}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {flavorA && flavorB && availableSizes.length === 0 && (
                  <p className="text-xs text-destructive">
                    Esses sabores não têm tamanho em comum.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {isPizza && availableSizes.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Tamanho</legend>
            <div className="grid grid-cols-3 gap-2">
              {availableSizes.map((size) => {
                const selected = size.id === selectedSizeId;
                const sizePrice = isHalf
                  ? getHalfPizzaUnitPrice(flavorA ?? product, flavorB, size.id, undefined)
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
