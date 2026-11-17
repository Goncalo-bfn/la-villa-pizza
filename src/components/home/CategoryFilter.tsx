import { useMenu } from '@/context/MenuContext';
import { Button } from '@/components/ui/Button';

interface CategoryFilterProps {
  active: string;
  onChange: (categoryId: string) => void;
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  const { categories, products } = useMenu();
  const visibleCategories = categories.filter((category) =>
    products.some((product) => product.categoryId === category.id),
  );

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-xl">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <Button
          variant="chip"
          size="pill"
          data-active={active === 'all'}
          onClick={() => onChange('all')}
          className="shrink-0"
        >
          Todos
        </Button>
        {visibleCategories.map((category) => (
          <Button
            key={category.id}
            variant="chip"
            size="pill"
            data-active={active === category.id}
            onClick={() => onChange(category.id)}
            className="shrink-0"
          >
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
