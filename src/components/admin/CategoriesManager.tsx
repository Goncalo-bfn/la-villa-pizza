import { useState } from 'react';
import { ChevronDown, ChevronUp, CupSoda, Pencil, Pizza, Plus, Trash2 } from 'lucide-react';
import type { Category } from '@/types';
import { useMenu } from '@/context/MenuContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CategoryDialog } from './CategoryDialog';

export function CategoriesManager() {
  const { categories, products, saveCategory, deleteCategory, moveCategory } = useMenu();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const countProducts = (categoryId: string) =>
    products.filter((product) => product.categoryId === categoryId).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Categorias</h2>
          <p className="text-sm text-muted-foreground">
            Organize as seções que aparecem no cardápio.
          </p>
        </div>
        <Button
          variant="hero"
          onClick={() =>
            setEditing({ id: '', name: '', description: '', kind: 'pizza' })
          }
        >
          <Plus /> Nova categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <p className="font-semibold">Nenhuma categoria cadastrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie a primeira categoria para começar a montar o cardápio.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {categories.map((category, index) => {
            const itemCount = countProducts(category.id);
            const Icon = category.kind === 'pizza' ? Pizza : CupSoda;
            return (
              <li key={category.id} className="flex items-center gap-3 p-3 sm:p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{category.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {category.description || 'Sem descrição'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {category.kind === 'pizza' ? 'Pizza (tamanhos e bordas)' : 'Item simples'}
                    </span>
                    <span>
                      {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveCategory(category.id, -1)}
                    disabled={index === 0}
                    aria-label={`Mover ${category.name} para cima`}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveCategory(category.id, 1)}
                    disabled={index === categories.length - 1}
                    aria-label={`Mover ${category.name} para baixo`}
                  >
                    <ChevronDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(category)}
                    aria-label={`Editar ${category.name}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleting(category)}
                    aria-label={`Excluir ${category.name}`}
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
        <CategoryDialog
          category={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={(category) => saveCategory(category)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir categoria"
        description={
          deleting
            ? `A categoria "${deleting.name}" e seus ${countProducts(deleting.id)} ${
                countProducts(deleting.id) === 1 ? 'item' : 'itens'
              } serão removidos do cardápio.`
            : ''
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          void deleteCategory(deleting.id).then((ok) => {
            if (ok) showToast('Categoria excluída');
            else showToast('Não foi possível excluir a categoria', 'error');
          });
        }}
      />
    </div>
  );
}
