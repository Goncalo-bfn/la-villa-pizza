import { useState } from 'react';
import { ClipboardList, Info, Trash2 } from 'lucide-react';
import type { Order, OrderStatus } from '@/types';
import { useMenu } from '@/context/MenuContext';
import { useOrders } from '@/context/OrdersContext';
import { useToast } from '@/context/ToastContext';
import { ORDER_STATUS, ORDER_STATUS_OPTIONS } from '@/lib/orderStatus';
import {
  describeCartItem,
  formatCurrency,
  formatOrderNumber,
  formatPhone,
} from '@/lib/utils';
import {
  PAYMENT_LABELS,
  buildCustomerContactUrl,
} from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';

function formatOrderDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(',', ' às');
}

function OrderCard({
  order,
  storeName,
  onStatusChange,
  onDelete,
}: {
  order: Order;
  storeName: string;
  onStatusChange: (status: OrderStatus) => void;
  onDelete: () => void;
}) {
  const customer = order.customer;
  const status = ORDER_STATUS[order.status];

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold">
            Pedido #{formatOrderNumber(order.number)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatOrderDate(order.createdAt)} ·{' '}
            {customer.fulfillment === 'entrega' ? 'Entrega' : 'Retirada'} ·{' '}
            {PAYMENT_LABELS[customer.payment]}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <ul className="mt-3 space-y-1 border-y border-border py-3 text-sm">
        {order.items.map((item) => {
          const details = describeCartItem(item);
          return (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                <strong>{item.qty}x</strong> {item.name}
                {details && <span className="text-muted-foreground"> · {details}</span>}
                {item.note && (
                  <span className="block text-xs italic text-muted-foreground">
                    “{item.note}”
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatCurrency(item.unitPrice * item.qty)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="font-semibold">{customer.name}</p>
          <p className="text-muted-foreground">{formatPhone(customer.phone)}</p>
          {customer.fulfillment === 'entrega' ? (
            <p className="text-muted-foreground">
              {customer.street}, {customer.number} — {customer.district}
              {customer.reference && ` (${customer.reference})`}
            </p>
          ) : (
            <p className="text-muted-foreground">Retirada no local</p>
          )}
          {customer.notes && (
            <p className="mt-1 text-xs italic text-muted-foreground">“{customer.notes}”</p>
          )}
        </div>
        <p className="text-xl font-bold">{formatCurrency(order.total)}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={order.status}
          onChange={(event) => onStatusChange(event.target.value as OrderStatus)}
          className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Status do pedido"
        >
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {ORDER_STATUS[option].label}
            </option>
          ))}
        </select>

        <Button asChild variant="outline" size="sm">
          <a
            href={buildCustomerContactUrl(customer, storeName)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon className="size-4 text-success" />
            Chamar cliente
          </a>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label={`Excluir pedido #${formatOrderNumber(order.number)}`}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}

export function OrdersManager() {
  const { settings } = useMenu();
  const { orders, setStatus, remove } = useOrders();
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState<Order | null>(null);

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/60 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        Os pedidos chegam pelo WhatsApp. Aqui aparecem os pedidos feitos neste aparelho, para
        você acompanhar o andamento.
      </p>

      {orders.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <ClipboardList className="size-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Nenhum pedido ainda</p>
          <p className="text-sm text-muted-foreground">
            Quando um pedido for finalizado, ele aparece aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              storeName={settings.storeName}
              onStatusChange={(status) => {
                setStatus(order.id, status);
                showToast(`Pedido #${formatOrderNumber(order.number)} · ${ORDER_STATUS[status].label}`);
              }}
              onDelete={() => setDeleting(order)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir pedido"
        description={
          deleting
            ? `O pedido #${formatOrderNumber(deleting.number)} será removido do histórico deste aparelho.`
            : ''
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          remove(deleting.id);
          showToast('Pedido excluído');
        }}
      />
    </div>
  );
}
