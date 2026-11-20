import type { CartItem, Customer, Order } from '@/types';
import { describeCartItem, formatCurrency, formatOrderNumber, formatPhone, normalizePhone } from './utils';

export const PAYMENT_LABELS: Record<Customer['payment'], string> = {
  pix: 'Pix',
  cartao: 'Cartão (na entrega)',
  dinheiro: 'Dinheiro',
};

export function whatsappNumber(value: string) {
  let digits = normalizePhone(value);
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    digits = `55${digits}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, message?: string) {
  const base = `https://wa.me/${whatsappNumber(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function formatOrderMessage(order: Order, storeName: string) {
  const { customer } = order;
  const lines: string[] = [];

  lines.push(`*Novo pedido — ${storeName}*`);
  lines.push(`Pedido #${formatOrderNumber(order.number)}`);
  lines.push('');
  lines.push('*Itens*');

  for (const item of order.items) {
    const details = describeCartItem(item);
    lines.push(
      `• ${item.qty}x ${item.name}${details ? ` (${details})` : ''} — ${formatCurrency(
        item.unitPrice * item.qty,
      )}`,
    );
    if (item.note) lines.push(`   Obs: ${item.note}`);
  }

  lines.push('');
  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}`);
  if (customer.fulfillment === 'entrega') {
    lines.push(`Entrega: ${formatCurrency(order.deliveryFee)}`);
  }
  if (order.serviceFee > 0) {
    lines.push(`Taxa da plataforma: ${formatCurrency(order.serviceFee)}`);
  }
  lines.push(`*Total: ${formatCurrency(order.total)}*`);
  lines.push('');
  lines.push(`*Cliente:* ${customer.name}`);
  lines.push(`*Telefone:* ${formatPhone(customer.phone)}`);

  if (customer.fulfillment === 'entrega') {
    const address = [
      `${customer.street ?? ''}${customer.number ? `, ${customer.number}` : ''}`,
      customer.district,
    ]
      .filter((part) => part && part.trim())
      .join(' — ');
    lines.push(`*Entrega:* ${address}`);
    if (customer.reference) lines.push(`*Referência:* ${customer.reference}`);
  } else {
    lines.push('*Retirada no local*');
  }

  let payment = PAYMENT_LABELS[customer.payment];
  if (customer.payment === 'dinheiro' && customer.changeFor && customer.changeFor > order.total) {
    payment += ` — troco para ${formatCurrency(customer.changeFor)}`;
  }
  lines.push(`*Pagamento:* ${payment}`);

  if (customer.notes) lines.push(`*Observações:* ${customer.notes}`);

  return lines.join('\n');
}

export function buildCustomerContactUrl(customer: Customer, storeName: string) {
  const firstName = customer.name.trim().split(' ')[0] || 'cliente';
  return buildWhatsAppUrl(
    customer.phone,
    `Olá, ${firstName}! Falamos da ${storeName} sobre o seu pedido.`,
  );
}

export function summarizeItems(items: CartItem[]) {
  return items.map((item) => `${item.qty}x ${item.name}`).join(', ');
}
