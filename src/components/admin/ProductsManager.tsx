import { useState } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import type { Product } from '@/types';
import { useMenu } from '@/context/MenuContext';
import { useToast } from '@/context/ToastContext';
import { FALLBACK_PRODUCT_IMAGE } from '@/lib/assets';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Switch } from '@/components/ui/Switch';
import { ProductDialog } from './ProductDialog';

export function ProductsManager() {
  const { categories, products, settings, saveProduct, deleteProduct, toggleProduct } = useMenu();
  const { showToast } = useToast();
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const visibleProducts = products.filter(
    (product) => filter === 'all' || product.categoryId === filter,
  );

  const priceSummary = (product: Product) => {
    const category = categories.find((item) => item.id === product.categoryId);
    if (category?.kind === 'pizza') {
      return (
        settings.sizes
          .filter((size) => (product.sizePrices?.[size.id] ?? 0) > 0)
          .map((size) => `${size.id} ${formatCurrency(product.sizePrices?.[size.id] ?? 0)}`)
          .join(' · ') || 'Sem preço'
      );
    }
    return formatCurrency(product.price ?? 0);
  };

  const createProduct = () => {
    const defaultCategory =
      categories.find((category) => category.id === filter) ?? categories[0];
    setEditing({
      id: '',
      name: '',
      description: '',
      categoryId: defaultCategory?.id ?? '',
      image: defaultCategory?.kind === 'simple' ? '/images/bebidas.jpg' : FALLBACK_PRODUCT_IMAGE,
      available: true,
      featured: false,
      price: 0,
      sizePrices: {},
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Produtos</h2>
          <p className="text-sm text-muted-foreground">
            Alterações aparecem na hora no cardápio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filtrar por categoria"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Button variant="hero" onClick={createProduct} disabled={categories.length === 0}>
            <Plus /> Novo produto
          </Button>
        </div>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <p className="font-semibold">Nenhum produto nesta categoria</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre um produto para começar a vender.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {visibleProducts.map((product) => {
            const category = categories.find((item) => item.id === product.categoryId);
            return (
              <li
                key={product.id}
                className={`flex items-center gap-3 p-3 sm:p-4 ${
                  product.available ? '' : 'opacity-60'
                }`}
              >
                <img
                  src={product.image}
                  alt=""
                  loading="lazy"
                  className="size-14 shrink-0 rounded-xl object-cover"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold">
                    {product.name}
                    {product.featured && (
                      <Star
                        className="size-3.5 fill-primary text-primary"
                        aria-label="Destaque"
                      />
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {category?.name ?? 'Sem categoria'} · {priceSummary(product)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-1 hidden text-xs text-muted-foreground sm:inline">
                    {product.available ? 'Ativo' : 'Inativo'}
                  </span>
                  <Switch
                    checked={product.available}
                    onCheckedChange={() => {
                      void toggleProduct(product.id).then((ok) => {
                        if (!ok) showToast('Não foi possível atualizar o produto', 'error');
                      });
                    }}
                    aria-label={`Disponibilidade de ${product.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(product)}
                    aria-label={`Editar ${product.name}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleting(product)}
                    aria-label={`Excluir ${product.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <ProductDialog
          product={editing}
          products={products}
          onClose={() => setEditing(null)}
          onSave={(product) => saveProduct(product)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir produto"
        description={
          deleting
            ? `O produto "${deleting.name}" será removido do cardápio. Essa ação não pode ser desfeita.`
            : ''
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          void deleteProduct(deleting.id).then((ok) => {
            if (ok) showToast('Produto excluído');
            else showToast('Não foi possível excluir o produto', 'error');
          });
        }}
      />
    </div>
  );
}
