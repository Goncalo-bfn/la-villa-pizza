import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CartItem, Category, Product, Settings } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId(prefix = '') {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return prefix ? `${prefix}-${random}` : random;
}

export function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || createId().slice(0, 8)
  );
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
    .format(Number.isFinite(value) ? value : 0)
    .replace(/\u00a0/g, ' ');
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseMoney(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

export function moneyToInput(value?: number) {
  return value && value > 0 ? value.toFixed(2).replace('.', ',') : '';
}

export function getStartingPrice(product: Product, category?: Category) {
  if (category?.kind === 'pizza' && product.sizePrices) {
    const prices = Object.values(product.sizePrices).filter((price) => price > 0);
    return prices.length ? Math.min(...prices) : 0;
  }
  return product.price ?? 0;
}

export function getUnitPrice(
  product: Product,
  category: Category | undefined,
  sizeId: string | undefined,
  border: { price: number } | undefined,
) {
  const base =
    category?.kind === 'pizza'
      ? product.sizePrices?.[sizeId ?? ''] ?? 0
      : product.price ?? 0;
  return roundMoney(base + (category?.kind === 'pizza' && border ? border.price : 0));
}

export function getCartSubtotal(items: CartItem[]) {
  return roundMoney(items.reduce((total, item) => total + item.unitPrice * item.qty, 0));
}

export function getCartTotals(
  items: CartItem[],
  fulfillment: 'entrega' | 'retirada',
  deliveryFee: number,
) {
  const subtotal = getCartSubtotal(items);
  const fee = fulfillment === 'entrega' && items.length > 0 ? roundMoney(deliveryFee) : 0;
  return {
    subtotal,
    deliveryFee: fee,
    total: roundMoney(subtotal + fee),
  };
}

export function getCartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.qty, 0);
}

export function describeCartItem(item: CartItem) {
  return [item.sizeName, item.bordaName].filter(Boolean).join(' · ');
}

export function getDefaultSizeId(settings: Settings, product: Product) {
  const available = settings.sizes.filter((size) => (product.sizePrices?.[size.id] ?? 0) > 0);
  return available[available.length - 1]?.id;
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export function formatPhone(value: string) {
  let digits = normalizePhone(value);
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
}

export function formatOrderNumber(number: number) {
  return String(number).padStart(4, '0');
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}
