import { useMemo, useState } from 'react';
import { Loader2, Pizza } from 'lucide-react';
import { useMenu } from '@/context/MenuContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { Hero } from '@/components/home/Hero';
import { CategoryFilter } from '@/components/home/CategoryFilter';
import { CategorySection } from '@/components/home/CategorySection';
import { ProductModal } from '@/components/home/ProductModal';
import { HalfPizzaModal } from '@/components/home/HalfPizzaModal';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { FloatingCartBar } from '@/components/cart/FloatingCartBar';
import { Button } from '@/components/ui/Button';
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
  const [halfPizzaOpen, setHalfPizzaOpen] = useState(false);

  const pizzaFlavors = useMemo(
    () =>
      products.filter((product) => {
        const productCategory = categories.find(
          (category) => category.id === product.categoryId,
        );
        return product.available && productCategory?.kind === 'pizza';
      }),
    [products, categories],
  );

  const activeCategoryKind =
    activeCategory === 'all'
      ? 'all'
      : categories.find((category) => category.id === activeCategory)?.kind;

  const showHalfPizzaCta =
    pizzaFlavors.length >= 2 &&
    (activeCategoryKind === 'all' || activeCategoryKind === 'pizza');

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

        {showHalfPizzaCta && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-card/70 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-bold">Monte sua pizza meio a meio</p>
              <p className="text-sm text-muted-foreground">
                Escolha 2 sabores e pague o valor do mais caro.
              </p>
            </div>
            <Button
              variant="hero"
              size="xl"
              className="w-full sm:w-auto"
              onClick={() => setHalfPizzaOpen(true)}
            >
              <Pizza />
              Montar Meio a Meio
            </Button>
          </div>
        )}

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
                <p className="font-display text-xl font-semibold">Cardápio em breve</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Estamos preparando as melhores pizzas para você. Volte em instantes!
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
      <HalfPizzaModal open={halfPizzaOpen} onClose={() => setHalfPizzaOpen(false)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
