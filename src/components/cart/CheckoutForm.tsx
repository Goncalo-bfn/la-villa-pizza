import { useEffect, useState } from 'react';
import { Bike, Store } from 'lucide-react';
import type { Customer, Fulfillment, PaymentMethod } from '@/types';
import { cn, parseMoney } from '@/lib/utils';
import { Input, Label, Textarea } from '@/components/ui/Input';

export type CheckoutErrors = Partial<
  Record<'name' | 'phone' | 'street' | 'number' | 'district', string>
>;

interface CheckoutFormProps {
  customer: Customer;
  update: (patch: Partial<Customer>) => void;
  errors: CheckoutErrors;
}

function Field({
  label,
  error,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className={cn('text-xs', error && 'text-destructive')}>
        {label}
      </Label>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </div>
  );
}

const fulfillmentOptions: { id: Fulfillment; label: string; icon: typeof Bike }[] = [
  { id: 'entrega', label: 'Entrega', icon: Bike },
  { id: 'retirada', label: 'Retirar no local', icon: Store },
];

const paymentOptions: { id: PaymentMethod; label: string }[] = [
  { id: 'pix', label: 'Pix' },
  { id: 'cartao', label: 'Cartão' },
  { id: 'dinheiro', label: 'Dinheiro' },
];

export function CheckoutForm({ customer, update, errors }: CheckoutFormProps) {
  const [changeText, setChangeText] = useState(
    customer.changeFor ? String(customer.changeFor).replace('.', ',') : '',
  );

  useEffect(() => {
    if (customer.payment !== 'dinheiro') setChangeText('');
  }, [customer.payment]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {fulfillmentOptions.map((option) => {
          const Icon = option.icon;
          const selected = customer.fulfillment === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => update({ fulfillment: option.id })}
              aria-pressed={selected}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-semibold transition-all',
                selected
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
              {option.label}
            </button>
          );
        })}
      </div>

      <Field label="Seu nome" error={errors.name} htmlFor="customer-name">
        <Input
          id="customer-name"
          value={customer.name}
          onChange={(event) => update({ name: event.target.value })}
          autoComplete="name"
          placeholder="Como podemos te chamar?"
        />
      </Field>

      <Field label="Telefone / WhatsApp" error={errors.phone} htmlFor="customer-phone">
        <Input
          id="customer-phone"
          value={customer.phone}
          onChange={(event) => update({ phone: event.target.value })}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(98) 90000-0000"
        />
      </Field>

      {customer.fulfillment === 'entrega' && (
        <div className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold">Endereço de entrega</p>
          <div className="grid grid-cols-[1fr_5.5rem] gap-2">
            <Field label="Rua" error={errors.street} htmlFor="customer-street">
              <Input
                id="customer-street"
                value={customer.street ?? ''}
                onChange={(event) => update({ street: event.target.value })}
                autoComplete="address-line1"
              />
            </Field>
            <Field label="Número" error={errors.number} htmlFor="customer-number">
              <Input
                id="customer-number"
                value={customer.number ?? ''}
                onChange={(event) => update({ number: event.target.value })}
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="Bairro" error={errors.district} htmlFor="customer-district">
            <Input
              id="customer-district"
              value={customer.district ?? ''}
              onChange={(event) => update({ district: event.target.value })}
            />
          </Field>
          <Field label="Ponto de referência (opcional)" htmlFor="customer-reference">
            <Input
              id="customer-reference"
              value={customer.reference ?? ''}
              onChange={(event) => update({ reference: event.target.value })}
            />
          </Field>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">Pagamento</p>
        <div className="grid grid-cols-3 gap-2">
          {paymentOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                update({
                  payment: option.id,
                  changeFor: option.id === 'dinheiro' ? customer.changeFor : undefined,
                })
              }
              aria-pressed={customer.payment === option.id}
              className={cn(
                'min-h-11 rounded-xl border py-2.5 text-sm font-semibold transition-all',
                customer.payment === option.id
                  ? 'border-primary bg-primary/15'
                  : 'border-border text-muted-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {customer.payment === 'dinheiro' && (
          <div className="mt-3">
            <Field label="Troco para quanto? (opcional)" htmlFor="customer-change">
              <Input
                id="customer-change"
                value={changeText}
                onChange={(event) => {
                  setChangeText(event.target.value);
                  update({ changeFor: parseMoney(event.target.value) || undefined });
                }}
                inputMode="decimal"
                placeholder="Ex.: 100"
              />
            </Field>
          </div>
        )}
      </div>

      <Field label="Observações do pedido (opcional)" htmlFor="customer-notes">
        <Textarea
          id="customer-notes"
          value={customer.notes ?? ''}
          onChange={(event) => update({ notes: event.target.value })}
          className="min-h-16 resize-none"
          maxLength={200}
        />
      </Field>
    </div>
  );
}
