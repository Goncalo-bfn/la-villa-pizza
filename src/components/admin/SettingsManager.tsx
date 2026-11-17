import { useState, type ReactNode } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { PizzaBorder, PizzaSize, Settings } from '@/types';
import {
  DEFAULT_BORDERS,
  DEFAULT_SETTINGS,
  DEFAULT_SIZES,
} from '@/data/seed';
import { useMenu } from '@/context/MenuContext';
import { useToast } from '@/context/ToastContext';
import {
  formatPhone,
  moneyToInput,
  normalizePhone,
  parseMoney,
  slugify,
} from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input, Label } from '@/components/ui/Input';

interface StoreForm {
  storeName: string;
  slogan: string;
  whatsapp: string;
  deliveryFee: string;
  adminPin: string;
  hoursText: string;
}

interface BorderDraft {
  id: string;
  name: string;
  priceText: string;
}

function toStoreForm(settings: Settings): StoreForm {
  return {
    storeName: settings.storeName,
    slogan: settings.slogan,
    whatsapp: formatPhone(settings.whatsapp),
    deliveryFee: moneyToInput(settings.deliveryFee),
    adminPin: settings.adminPin,
    hoursText: settings.hoursText,
  };
}

function toBorderDrafts(borders: PizzaBorder[]): BorderDraft[] {
  return borders.map((border) => ({
    ...border,
    priceText: moneyToInput(border.price),
  }));
}

function copySizes(sizes: PizzaSize[]) {
  return sizes.map((size) => ({ ...size }));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-lg font-bold">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SettingsManager() {
  const { settings, saveSettings, resetMenu } = useMenu();
  const { showToast } = useToast();
  const [form, setForm] = useState<StoreForm>(() => toStoreForm(settings));
  const [sizes, setSizes] = useState<PizzaSize[]>(() => copySizes(settings.sizes));
  const [borders, setBorders] = useState<BorderDraft[]>(() =>
    toBorderDrafts(settings.bordas),
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const updateBorder = (index: number, patch: Partial<BorderDraft>) => {
    setBorders((current) =>
      current.map((border, borderIndex) =>
        borderIndex === index ? { ...border, ...patch } : border,
      ),
    );
  };

  const handleSave = async () => {
    let whatsapp = normalizePhone(form.whatsapp);
    if ((whatsapp.length === 10 || whatsapp.length === 11) && !whatsapp.startsWith('55')) {
      whatsapp = `55${whatsapp}`;
    }
    if (whatsapp.length < 12) {
      showToast('WhatsApp inválido: use DDD + número', 'error');
      return;
    }

    const adminPin = form.adminPin.trim();
    if (adminPin.length < 4) {
      showToast('O PIN precisa ter pelo menos 4 dígitos', 'error');
      return;
    }

    const usedIds = new Set<string>();
    const nextBorders: PizzaBorder[] = borders
      .filter((border) => border.name.trim())
      .map((border) => {
        const base = border.id || slugify(border.name);
        let id = base;
        let suffix = 2;
        while (usedIds.has(id)) {
          id = `${base}-${suffix++}`;
        }
        usedIds.add(id);
        return {
          id,
          name: border.name.trim(),
          price: parseMoney(border.priceText),
        };
      });

    const nextSizes = sizes.map((size) => ({
      ...size,
      name: size.name.trim() || size.id,
      slices: Number(size.slices) || 0,
    }));

    const storeName = form.storeName.trim() || settings.storeName;
    const nextSettings: Partial<Settings> = {
      storeName,
      slogan: form.slogan.trim(),
      whatsapp,
      deliveryFee: parseMoney(form.deliveryFee),
      hoursText: form.hoursText.trim(),
      adminPin,
      sizes: nextSizes.length ? nextSizes : copySizes(DEFAULT_SIZES),
      bordas: nextBorders,
    };

    setSaving(true);
    const ok = await saveSettings(nextSettings);
    setSaving(false);

    if (!ok) {
      showToast('Não foi possível salvar as configurações', 'error');
      return;
    }

    setForm({
      storeName,
      slogan: nextSettings.slogan ?? '',
      whatsapp: formatPhone(whatsapp),
      deliveryFee: moneyToInput(nextSettings.deliveryFee),
      adminPin,
      hoursText: nextSettings.hoursText ?? '',
    });
    setBorders(toBorderDrafts(nextSettings.bordas ?? []));
    showToast('Configurações salvas');
  };

  const handleReset = async () => {
    setResetting(true);
    const ok = await resetMenu();
    setResetting(false);

    if (!ok) {
      showToast('Não foi possível restaurar o cardápio', 'error');
      return;
    }

    setForm(toStoreForm(DEFAULT_SETTINGS));
    setSizes(copySizes(DEFAULT_SIZES));
    setBorders(toBorderDrafts(DEFAULT_BORDERS));
    showToast('Cardápio restaurado ao padrão');
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Loja">
        <Field id="s-name" label="Nome da pizzaria">
          <Input
            id="s-name"
            value={form.storeName}
            onChange={(event) => setForm({ ...form, storeName: event.target.value })}
          />
        </Field>

        <Field id="s-slogan" label="Slogan">
          <Input
            id="s-slogan"
            value={form.slogan}
            onChange={(event) => setForm({ ...form, slogan: event.target.value })}
          />
        </Field>

        <Field
          id="s-wa"
          label="WhatsApp que recebe os pedidos"
          hint="DDD + número. Ex.: (98) 98702-0320"
        >
          <Input
            id="s-wa"
            inputMode="tel"
            value={form.whatsapp}
            onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="s-fee" label="Taxa de entrega (R$)">
            <Input
              id="s-fee"
              inputMode="decimal"
              value={form.deliveryFee}
              onChange={(event) => setForm({ ...form, deliveryFee: event.target.value })}
              placeholder="0,00"
            />
          </Field>
          <Field id="s-pin" label="PIN do painel">
            <Input
              id="s-pin"
              inputMode="numeric"
              value={form.adminPin}
              onChange={(event) => setForm({ ...form, adminPin: event.target.value })}
            />
          </Field>
        </div>

        <Field
          id="s-hours"
          label="Horário de funcionamento"
          hint="Aparece no rodapé do cardápio."
        >
          <Input
            id="s-hours"
            value={form.hoursText}
            onChange={(event) => setForm({ ...form, hoursText: event.target.value })}
            placeholder="Ex.: Ter a Dom · 18h às 23h"
          />
        </Field>
      </Section>

      <div className="space-y-5">
        <Section title="Tamanhos das pizzas">
          {sizes.map((size, index) => (
            <div
              key={size.id}
              className="grid grid-cols-[2.5rem_1fr_5.5rem] items-center gap-2"
            >
              <span className="grid h-9 place-items-center rounded-md bg-muted text-sm font-bold">
                {size.id}
              </span>
              <Input
                aria-label={`Nome do tamanho ${size.id}`}
                value={size.name}
                onChange={(event) =>
                  setSizes((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: event.target.value } : item,
                    ),
                  )
                }
              />
              <Input
                aria-label={`Fatias ${size.id}`}
                inputMode="numeric"
                value={String(size.slices)}
                onChange={(event) =>
                  setSizes((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            slices: Number(event.target.value.replace(/\D/g, '')) || 0,
                          }
                        : item,
                    ),
                  )
                }
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Nome e número de fatias. Os preços ficam em cada produto.
          </p>
        </Section>

        <Section title="Bordas">
          {borders.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma borda cadastrada. Adicione uma abaixo.
            </p>
          )}
          {borders.map((border, index) => (
            <div
              key={`${border.id}-${index}`}
              className="grid grid-cols-[1fr_5.5rem_2.25rem] items-center gap-2"
            >
              <Input
                aria-label="Nome da borda"
                value={border.name}
                placeholder="Ex.: Borda de catupiry"
                onChange={(event) => updateBorder(index, { name: event.target.value })}
              />
              <Input
                aria-label="Preço da borda"
                inputMode="decimal"
                value={border.priceText}
                placeholder="grátis"
                onChange={(event) => updateBorder(index, { priceText: event.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remover borda"
                onClick={() =>
                  setBorders((current) =>
                    current.filter((_, borderIndex) => borderIndex !== index),
                  )
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setBorders((current) => [
                ...current,
                { id: '', name: '', priceText: '' },
              ])
            }
          >
            <Plus /> Adicionar borda
          </Button>
        </Section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setConfirmReset(true)}
          disabled={saving || resetting}
        >
          <RotateCcw /> Restaurar cardápio original
        </Button>
        <Button
          variant="hero"
          size="xl"
          onClick={handleSave}
          disabled={saving || resetting}
        >
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Restaurar cardápio"
        description="Voltar o cardápio, categorias e configurações ao padrão inicial? Os pedidos e o carrinho não serão alterados."
        confirmLabel="Restaurar"
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
      />
    </div>
  );
}
