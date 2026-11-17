import type { Category, Product } from '@/types';
import { ProductCard } from './ProductCard';

interface CategorySectionProps {
  category: Category;
  products: Product[];
  onSelect: (product: Product) => void;
}

export function CategorySection({ category, products, onSelect }: CategorySectionProps) {
  return (
    <section className="pt-10" aria-labelledby={`cat-${category.id}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id={`cat-${category.id}`} className="text-3xl font-bold sm:text-4xl">
            {category.name}
          </h2>
          {category.description && (
            <p className="mt-1 font-script text-xl text-accent">{category.description}</p>
          )}
        </div>
        <span className="hidden h-1 w-20 rounded-full bg-flag sm:block" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            category={category}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
