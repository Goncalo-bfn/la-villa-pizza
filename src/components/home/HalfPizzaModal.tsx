import { useEffect, useState } from 'react';
import { Check, Minus, Pizza, Plus } from 'lucide-react';
import type { CartFlavor } from '@/types';
import { useMenu } from '@/context/MenuContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import {
  cn,
  formatCurrency,
  getHalfPizzaUnitPrice,
  getStartingPrice,
  roundMoney,
} from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Sheet';
import { FALLBACK_PRODUCT_IMAGE } from '@/lib/assets';

interface HalfPizzaModalProps {
  open: boolean;
  onClose: () => void;
}

export function HalfPizzaModal({ open, onClose }: HalfPizzaModalProps) {
  const { settings, categories, products } = useMenu();
  const { add } = useCart();
  const { showToast } = useToast();

  const [flavorAId, setFlavorAId] = useState('');
  const [flavorBId, setFlavorBId] = useState('');
  const [sizeId, setSizeId] = useState<string | undefined>();
  const [bordaId, setBordaId] = useState<string | undefined>();
  const [qty, setQty] = useState(1);

  const pizzaCategoryIds = new Set(
    categories.filter((item) => item.kind === 'pizza').map((item) => item.id),
  );
  const pizzaFlavors = products.filter(
    (item) => item.available && pizzaCategoryIds.has(item.categoryId),
  );
  const flavorA = pizzaFlavors.find((item) => item.id === flavorAId);
  const flavorB = pizzaFlavors.find((item) => item.id === flavorBId);

  // Reset ao abrir o modal.
  useEffect(() => {
    if (!open) return;
    setFlavorAId('');
    setFlavorBId('');
    setSizeId(undefined);
    setBordaId(settings.bordas[0]?.id);
    setQty(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Tamanhos válidos apenas quando os dois sabores já foram escolhidos.
  const availableSizes =
    flavorA && flavorB
      ? settings.sizes.filter((size) => {
          const hasA = (flavorA.sizePrices?.[size.id] ?? 0) > 0;
          const hasB = (flavorB.sizePrices?.[size.id] ?? 0) > 0;
          return hasA && hasB;
        })
      : [];

  const selectedSizeId = availableSizes.some((size) => size.id === sizeId)
    ? sizeId
    : availableSizes[availableSizes.length - 1]?.id;
  const selectedSize = settings.sizes.find((size) => size.id === selectedSizeId);
  const selectedBorder = settings.bordas.find((borda) => borda.id === bordaId);
  const unitPrice = getHalfPizzaUnitPrice(flavorA, flavorB, selectedSizeId, selectedBorder);
  const total = roundMoney(unitPrice * qty);
  const bothFlavors = Boolean(flavorA && flavorB && flavorA.id !== flavorB.id);
  const canAdd = bothFlavors && Boolean(selectedSizeId);

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
    if (!flavorA || !flavorB) {
      showToast('Escolha 2 sabores para montar a pizza meio a meio', 'error');
      return;
    }
    if (flavorA.id === flavorB.id) {
      showToast('Escolha 2 sabores diferentes', 'error');
      return;
    }
    if (!selectedSizeId) return;

    const flavors: [CartFlavor, CartFlavor] = [
      { productId: flavorA.id, name: flavorA.name },
      { productId: flavorB.id, name: flavorB.name },
    ];

    add({
      productId: flavorA.id,
      name: 'Pizza Meio a Meio',
      flavors,
      sizeId: selectedSize?.id,
      sizeName: selectedSize?.name,
      bordaId:
        selectedBorder && selectedBorder.price > 0 ? selectedBorder.id : undefined,
      bordaName:
        selectedBorder && selectedBorder.price > 0 ? selectedBorder.name : undefined,
      unitPrice,
      qty,
    });
    showToast(`${qty}x Pizza Meio a Meio no carrinho`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Montar pizza meio a meio"
      className="sm:max-w-md"
    >
      <div className="border-b border-border p-5 pr-14">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Pizza className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold">Meio a Meio</h2>
            <p className="text-sm text-muted-foreground">Monte sua pizza com 2 sabores</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Toque em um sabor para escolher o Sabor 1, depois toque no Sabor 2. Não é possível
            escolher o mesmo sabor nos dois lados.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {pizzaFlavors.map((flavor) => {
              const selectedAs = flavorAId === flavor.id ? 1 : flavorBId === flavor.id ? 2 : 0;
              const flavorCategory = categories.find(
                (category) => category.id === flavor.categoryId,
              );
              const flavorPrice =
                flavor.sizePrices?.[selectedSizeId ?? ''] ??
                getStartingPrice(flavor, flavorCategory);
              return (
                <button
                  key={flavor.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selectedAs > 0 ? 'true' : 'false'}
                  aria-label={
                    selectedAs === 1
                      ? `${flavor.name}, selecionado como Sabor 1. Toque para remover.`
                      : selectedAs === 2
                        ? `${flavor.name}, selecionado como Sabor 2. Toque para remover.`
                        : `Escolher ${flavor.name} como sabor`
                  }
                  onClick={() => toggleFlavor(flavor.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all duration-200 min-h-[96px]',
                    selectedAs > 0
                      ? 'border-primary bg-primary/50 ring-1 ring-primary hover:border-primary/80'
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
                    {selectedAs > 0 && (
                      <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full border border-primary bg-primary text-[10px] font-bold text-primary-foreground ring-1 ring-background">
                        {selectedAs}
                      </span>
                    )}
                    {selectedAs > 0 && (
                      <Check
                        className="absolute bottom-1 right-1 size-4 text-primary drop-shadow-sm"
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
                  Sabor 1: {flavorA.name}{' '}
                  <span className="text-xs text-muted-foreground">({formatCurrency(priceA)})</span> +
                  Sabor 2: {flavorB.name}{' '}
                  <span className="text-xs text-muted-foreground">({formatCurrency(priceB)})</span> →{' '}
                  <span className="font-bold text-accent">
                    Você paga: {formatCurrency(unitPrice)}
                    {bordaLabel}
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

        {availableSizes.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Tamanho</legend>
            <div className="grid grid-cols-3 gap-2">
              {availableSizes.map((size) => {
                const selected = size.id === selectedSizeId;
                const sizePrice = getHalfPizzaUnitPrice(flavorA, flavorB, size.id, undefined);
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

        {settings.bordas.length > 0 && (
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
