import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useMenu } from '@/context/MenuContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { Hero } from '@/components/home/Hero';
import { CategoryFilter } from '@/components/home/CategoryFilter';
import { CategorySection } from '@/components/home/CategorySection';
import { ProductModal } from '@/components/home/ProductModal';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { FloatingCartBar } from '@/components/cart/FloatingCartBar';
import { SyncNotice } from '@/components/ui/SyncNotice';
import type { Product } from '@/types';

export function HomePage() {
  const {
    categories,
    products,
    isLoading,
    syncError,
    syncIssue,
    clearSyncError,
    reloadMenu,
  } = useMenu();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const sections = useMemo(
    () =>
      categories
        .filter((category) => activeCategory === 'all' || category.id === activeCategory)
        .map((category) => ({
          category,
          products: products.filter((product) => product.categoryId === category.id),
        }))
        .filter((section) => section.products.length > 0),
    [categories, products, activeCategory],
  );

  const selectedCategory = selectedProduct
    ? categories.find((category) => category.id === selectedProduct.categoryId)
    : undefined;

  return (
    <div className="min-h-screen bg-wood">
      <AppHeader onOpenCart={() => setCartOpen(true)} />
      <Hero />

      <main id="cardapio" className="mx-auto max-w-6xl scroll-mt-16 px-4 pb-32">
        {syncError && syncIssue && (
          <SyncNotice
            className="mb-4 mt-4"
            issue={syncIssue}
            message={syncError}
            isRetrying={isLoading}
            onRetry={() => void reloadMenu()}
            onDismiss={clearSyncError}
          />
        )}

        {isLoading && !syncError && (
          <p
            role="status"
            className="mb-3 mt-4 flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Loader2 className="size-3.5 animate-spin" /> Sincronizando cardápio...
          </p>
        )}

        <CategoryFilter active={activeCategory} onChange={setActiveCategory} />

        {sections.map(({ category, products: categoryProducts }) => (
          <CategorySection
            key={category.id}
            category={category}
            products={categoryProducts}
            onSelect={setSelectedProduct}
          />
        ))}

        {sections.length === 0 && (
          <div className="mt-16 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            {syncError ? (
              <>
                <p className="font-display text-xl font-semibold">
                  Cardápio temporariamente indisponível
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Não foi possível carregar os itens agora. Tente novamente em instantes.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-semibold">Nenhum item por aqui ainda</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cadastre produtos no painel do lojista para montar o cardápio.
                </p>
              </>
            )}
          </div>
        )}
      </main>

      <AppFooter />

      <FloatingCartBar onOpenCart={() => setCartOpen(true)} hidden={cartOpen} />

      <ProductModal
        product={selectedProduct}
        category={selectedCategory}
        onClose={() => setSelectedProduct(null)}
      />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
