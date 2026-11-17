import { useState } from 'react';
import type { Category, CategoryKind } from '@/types';
import { useToast } from '@/context/ToastContext';
import { cn, slugify } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Sheet';

interface CategoryDialogProps {
  category: Category;
  categories: Category[];
  onClose: () => void;
  onSave: (category: Category) => Promise<boolean>;
}

const kindOptions: { id: CategoryKind; label: string; hint: string }[] = [
  { id: 'pizza', label: 'Pizza', hint: 'Com tamanhos e bordas' },
  { id: 'simple', label: 'Item simples', hint: 'Preço único (bebidas, etc.)' },
];

export function CategoryDialog({ category, categories, onClose, onSave }: CategoryDialogProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<Category>(category);
  const [saving, setSaving] = useState(false);
  const isNew = !category.id;

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Dê um nome para a categoria', 'error');
      return;
    }

    let id = form.id || slugify(form.name);
    if (isNew && categories.some((item) => item.id === id)) {
      id = `${id}-${Date.now().toString(36).slice(-4)}`;
    }

    setSaving(true);
    const ok = await onSave({
      ...form,
      id,
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
    });
    setSaving(false);

    if (!ok) {
      showToast('Não foi possível salvar a categoria', 'error');
      return;
    }

    showToast(isNew ? 'Categoria criada' : 'Categoria atualizada');
    onClose();
  };

  return (
    <Modal open onClose={onClose} className="sm:max-w-md p-6" ariaLabel={isNew ? 'Nova categoria' : 'Editar categoria'}>
      <h2 className="font-display text-xl font-bold">{isNew ? 'Nova categoria' : 'Editar categoria'}</h2>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cat-name">Nome</Label>
          <Input
            id="cat-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Ex.: Pizzas Doces"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-desc">Frase curta (opcional)</Label>
          <Input
            id="cat-desc"
            value={form.description ?? ''}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Ex.: Para adoçar a noite"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <div className="grid grid-cols-2 gap-2">
            {kindOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setForm({ ...form, kind: option.id })}
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  form.kind === option.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.hint}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
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
