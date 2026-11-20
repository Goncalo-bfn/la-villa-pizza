import { useMenu } from '@/context/MenuContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

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
      <div
        className={cn(
          'no-scrollbar flex gap-2 overflow-x-auto',
          'after:absolute after:inset-y-0 after:right-0 after:w-10 after:bg-gradient-to-l after:from-background/90 after:to-transparent after:pointer-events-none after:z-10',
        )}
      >
        <Button
          variant="chip"
          size="pill"
          data-active={active === 'all'}
          aria-pressed={active === 'all'}
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
            aria-pressed={active === category.id}
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
