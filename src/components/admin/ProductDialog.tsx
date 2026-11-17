import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { Product } from '@/types';
import { useMenu } from '@/context/MenuContext';
import { useToast } from '@/context/ToastContext';
import { FALLBACK_PRODUCT_IMAGE } from '@/lib/assets';
import { moneyToInput, parseMoney, slugify } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';

interface ProductDialogProps {
  product: Product;
  products: Product[];
  onClose: () => void;
  onSave: (product: Product) => Promise<boolean>;
}

export function ProductDialog({ product, products, onClose, onSave }: ProductDialogProps) {
  const { categories, settings } = useMenu();
  const { showToast } = useToast();
  const [form, setForm] = useState<Product>({
    ...product,
    image: product.image || FALLBACK_PRODUCT_IMAGE,
  });
  const [priceText, setPriceText] = useState(moneyToInput(product.price));
  const [sizeTexts, setSizeTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      settings.sizes.map((size) => [size.id, moneyToInput(product.sizePrices?.[size.id])]),
    ),
  );
  const [saving, setSaving] = useState(false);

  const isNew = !product.id;
  const category = categories.find((item) => item.id === form.categoryId);
  const isPizza = category?.kind === 'pizza';

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Dê um nome ao produto', 'error');
      return;
    }
    if (!form.categoryId) {
      showToast('Escolha uma categoria', 'error');
      return;
    }

    let id = form.id || slugify(form.name);
    if (isNew && products.some((item) => item.id === id)) {
      id = `${id}-${Date.now().toString(36).slice(-4)}`;
    }

    if (isPizza) {
      const validPrices = Object.values(sizeTexts).some((value) => parseMoney(value) > 0);
      if (!validPrices) {
        showToast('Informe o preço de pelo menos um tamanho', 'error');
        return;
      }
    } else if (parseMoney(priceText) <= 0) {
      showToast('Informe o preço do produto', 'error');
      return;
    }

    const price = parseMoney(priceText);
    const sizePrices = Object.fromEntries(
      settings.sizes
        .map((size) => [size.id, parseMoney(sizeTexts[size.id] ?? '')] as const)
        .filter(([, value]) => value > 0),
    );

    setSaving(true);
    const ok = await onSave({
      ...form,
      id,
      name: form.name.trim(),
      description: form.description.trim(),
      image: form.image.trim() || FALLBACK_PRODUCT_IMAGE,
      price: isPizza ? undefined : price,
      sizePrices: isPizza ? sizePrices : undefined,
    });
    setSaving(false);

    if (!ok) {
      showToast('Não foi possível salvar o produto', 'error');
      return;
    }

    showToast(isNew ? 'Produto criado' : 'Produto atualizado');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={isNew ? 'Novo produto' : 'Editar produto'}
      className="sm:max-w-lg"
    >
      <div className="border-b border-border px-6 py-4 pr-14">
        <h2 className="font-display text-xl font-bold">{isNew ? 'Novo produto' : 'Editar produto'}</h2>
        <p className="text-xs text-muted-foreground">
          As alterações aparecem imediatamente no cardápio.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
            <img
              src={form.image || FALLBACK_PRODUCT_IMAGE}
              alt=""
              className="size-full object-cover"
              onError={(event) => {
                event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
              }}
            />
            <span className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-md bg-background/80 text-foreground backdrop-blur">
              <ImageIcon className="size-3.5" />
            </span>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-image">Imagem (URL ou caminho)</Label>
              <Input
                id="p-image"
                value={form.image}
                onChange={(event) => setForm({ ...form, image: event.target.value })}
                placeholder="/images/pizza-...jpg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-category">Categoria</Label>
              <select
                id="p-category"
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Escolha uma categoria</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-name">Nome</Label>
          <Input
            id="p-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Ex.: Quatro Queijos"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-desc">Ingredientes / descrição</Label>
          <Textarea
            id="p-desc"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="min-h-20"
            placeholder="Molho, mussarela, …"
          />
        </div>

        {isPizza ? (
          <div className="space-y-1.5">
            <Label>Preço por tamanho (R$)</Label>
            <div className="grid grid-cols-3 gap-2">
              {settings.sizes.map((size) => (
                <label key={size.id} className="space-y-1">
                  <span className="text-xs text-muted-foreground">{size.name}</span>
                  <Input
                    inputMode="decimal"
                    value={sizeTexts[size.id] ?? ''}
                    onChange={(event) =>
                      setSizeTexts({ ...sizeTexts, [size.id]: event.target.value })
                    }
                    placeholder="0,00"
                    aria-label={`Preço ${size.name}`}
                  />
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="p-price">Preço (R$)</Label>
            <Input
              id="p-price"
              inputMode="decimal"
              value={priceText}
              onChange={(event) => setPriceText(event.target.value)}
              placeholder="0,00"
            />
          </div>
        )}

        <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="block font-medium">Disponível</span>
              <span className="block text-xs text-muted-foreground">Aparece para pedir</span>
            </span>
            <Switch
              checked={form.available}
              onCheckedChange={(checked) => setForm({ ...form, available: checked })}
              aria-label="Produto disponível"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="block font-medium">Destaque</span>
              <span className="block text-xs text-muted-foreground">Selo no cardápio</span>
            </span>
            <Switch
              checked={Boolean(form.featured)}
              onCheckedChange={(checked) => setForm({ ...form, featured: checked })}
              aria-label="Produto em destaque"
            />
          </label>
        </div>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card p-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="hero" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </Modal>
  );
}
