import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type { CartItem, Customer } from '@/types';
import { useMenu } from '@/context/MenuContext';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useToast } from '@/context/ToastContext';
import { useCustomerDraft } from '@/hooks/useCustomerDraft';
import { FALLBACK_PRODUCT_IMAGE } from '@/lib/assets';
import {
  describeCartItem,
  formatCurrency,
  formatOrderNumber,
  getCartTotals,
  normalizePhone,
} from '@/lib/utils';
import {
  buildWhatsAppUrl,
  formatOrderMessage,
} from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Sheet';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { CheckoutForm, type CheckoutErrors } from './CheckoutForm';

type Step = 'cart' | 'checkout' | 'done';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function CartRow({
  item,
  image,
  onQty,
  onRemove,
}: {
  item: CartItem;
  image: string;
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const details = describeCartItem(item);

  return (
    <li className="flex gap-3 rounded-2xl border border-border bg-background/40 p-3 animate-fade-up">
      <img
        src={image}
        alt=""
        onError={(event) => {
          event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
        }}
        className="size-16 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold leading-tight">{item.name}</p>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground transition-colors hover:text-destructive"
            aria-label={`Remover ${item.name}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        {details && <p className="text-xs text-muted-foreground">{details}</p>}
        {item.note && <p className="text-xs italic text-muted-foreground">“{item.note}”</p>}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQty(Math.max(0, item.qty - 1))}
              className="grid size-7 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
              aria-label="Diminuir quantidade"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-6 text-center text-sm font-bold tabular-nums">{item.qty}</span>
            <button
              type="button"
              onClick={() => onQty(item.qty + 1)}
              className="grid size-7 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
              aria-label="Aumentar quantidade"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <p className="font-bold text-accent">{formatCurrency(item.unitPrice * item.qty)}</p>
        </div>
      </div>
    </li>
  );
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { settings, products } = useMenu();
  const { items, setQty, remove, clear } = useCart();
  const { create } = useOrders();
  const { showToast } = useToast();
  const { customer, update, resetAfterOrder } = useCustomerDraft();

  const [step, setStep] = useState<Step>('cart');
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [sentOrderNumber, setSentOrderNumber] = useState(0);
  const [sentUrl, setSentUrl] = useState('');

  const totals = getCartTotals(items, customer.fulfillment, settings.deliveryFee);
  const itemCount = items.reduce((total, item) => total + item.qty, 0);

  useEffect(() => {
    if (!open && step !== 'cart') {
      const timeout = window.setTimeout(() => setStep('cart'), 300);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [open, step]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setErrors({});
    }
  };

  const validate = () => {
    const nextErrors: CheckoutErrors = {};
    if (customer.name.trim().length < 2) nextErrors.name = 'Informe seu nome';
    if (normalizePhone(customer.phone).length < 10) nextErrors.phone = 'Telefone com DDD';
    if (customer.fulfillment === 'entrega') {
      if (!customer.street?.trim()) nextErrors.street = 'Informe a rua';
      if (!customer.number?.trim()) nextErrors.number = 'Nº';
      if (!customer.district?.trim()) nextErrors.district = 'Informe o bairro';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSend = () => {
    if (!settings.storeOpen || !validate()) return;

    const orderCustomer: Customer = {
      ...customer,
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      notes: customer.notes?.trim() || undefined,
      changeFor: customer.payment === 'dinheiro' ? customer.changeFor : undefined,
    };

    const order = create({
      items,
      customer: orderCustomer,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
    });

    const message = formatOrderMessage(order, settings.storeName);
    const url = buildWhatsAppUrl(settings.whatsapp, message);

    setSentOrderNumber(order.number);
    setSentUrl(url);
    setStep('done');
    resetAfterOrder();
    clear();

    const opened = window.open(url, '_blank');
    if (opened) {
      opened.opener = null;
    } else {
      window.location.href = url;
    }

    showToast(`Pedido #${formatOrderNumber(order.number)} enviado`);
  };

  const goToCheckout = () => {
    setErrors({});
    setStep('checkout');
  };

  const title =
    step === 'cart' ? 'Seu pedido' : step === 'checkout' ? 'Finalizar pedido' : 'Pedido enviado!';
  const subtitle =
    step === 'cart'
      ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
      : step === 'checkout'
        ? 'Entrega e pagamento'
        : 'Confirme o envio no WhatsApp';

  return (
    <Drawer
      open={open}
      onClose={() => handleOpenChange(false)}
      ariaLabel="Seu pedido"
      className="gap-0 p-0"
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-4 pr-14">
        {step === 'checkout' && (
          <button
            type="button"
            onClick={() => setStep('cart')}
            className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-muted"
            aria-label="Voltar ao carrinho"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {step === 'done' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <CheckCircle2 className="size-16 text-success animate-pop" />
          <div>
            <p className="font-display text-2xl font-bold">
              Pedido #{formatOrderNumber(sentOrderNumber)}
            </p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Abrimos o WhatsApp com o resumo do seu pedido. É só tocar em enviar para a gente
              começar a preparar.
            </p>
          </div>
          <Button asChild variant="whatsapp" size="xl" className="w-full">
            <a href={sentUrl} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-5" />
              Abrir WhatsApp novamente
            </a>
          </Button>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Voltar ao cardápio
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="grid size-20 place-items-center rounded-full bg-muted">
            <ShoppingBag className="size-9 text-muted-foreground" />
          </div>
          <p className="font-display text-xl font-semibold">Carrinho vazio</p>
          <p className="text-sm text-muted-foreground">
            Escolha uma pizza no cardápio para começar.
          </p>
          <Button variant="hero" onClick={() => handleOpenChange(false)} className="mt-2">
            Ver cardápio
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {step === 'cart' ? (
              <ul className="space-y-3">
                {items.map((item) => {
                  const product = products.find((candidate) => candidate.id === item.productId);
                  return (
                    <CartRow
                      key={item.id}
                      item={item}
                      image={product?.image ?? FALLBACK_PRODUCT_IMAGE}
                      onQty={(qty) => setQty(item.id, qty)}
                      onRemove={() => remove(item.id)}
                    />
                  );
                })}
              </ul>
            ) : (
              <CheckoutForm customer={customer} update={update} errors={errors} />
            )}
          </div>

          <div className="space-y-3 border-t border-border bg-card px-5 py-4 safe-bottom">
            <div className="space-y-1 text-sm">
              <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
              {customer.fulfillment === 'entrega' && (
                <SummaryRow label="Taxa de entrega" value={formatCurrency(totals.deliveryFee)} />
              )}
              <div className="flex items-center justify-between pt-1 text-lg font-bold">
                <span>Total</span>
                <span className="text-accent">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            {!settings.storeOpen && (
              <p className="rounded-lg bg-destructive/15 px-3 py-2 text-center text-sm text-destructive">
                Estamos fechados agora. Volte mais tarde!
              </p>
            )}

            {step === 'cart' ? (
              <Button
                variant="hero"
                size="xl"
                className="w-full"
                onClick={goToCheckout}
                disabled={!settings.storeOpen}
              >
                Continuar
              </Button>
            ) : (
              <Button
                variant="whatsapp"
                size="xl"
                className="w-full"
                onClick={handleSend}
                disabled={!settings.storeOpen}
              >
                <WhatsAppIcon className="size-5" />
                Enviar pedido pelo WhatsApp
              </Button>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}
