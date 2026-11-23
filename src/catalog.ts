import type { Category, CrustOption, MenuProduct } from "./types";

/**
 * Cardápio original. Usado apenas pela migração única do localStorage para o
 * Supabase (nunca é renderizado quando o Supabase já tem dados).
 */
export const legacyCategories: Category[] = [
  { id: "tradicionais", name: "Pizzas Tradicionais", kind: "pizza", active: true, sortOrder: 0 },
  { id: "especiais", name: "Pizzas Especiais", kind: "pizza", active: true, sortOrder: 1 },
  { id: "bebidas", name: "Bebidas", kind: "simple", active: true, sortOrder: 2 },
];

export const legacyInitialProducts: MenuProduct[] = [
  {
    id: "calabresa",
    name: "Calabresa",
    description: "Molho de tomate, mussarela, calabresa, cebola e orégano.",
    categoryId: "tradicionais",
    image: "/images/pizza-calabresa.jpg",
    available: true,
    sizePrices: { unico: 39.99 },
    sortOrder: 0,
  },
  {
    id: "portuguesa",
    name: "Portuguesa",
    description:
      "Molho de tomate, mussarela, presunto, peito de peru, ovo, cebola e orégano.",
    categoryId: "tradicionais",
    image: "/images/pizza-portuguesa.jpg",
    available: true,
    sizePrices: { unico: 39.99 },
    sortOrder: 1,
  },
  {
    id: "marguerita",
    name: "Marguerita",
    description: "Molho de tomate, mussarela, tomate fatiado, manjericão e orégano.",
    categoryId: "tradicionais",
    image: "/images/pizza-margherita.jpg",
    available: true,
    sizePrices: { unico: 39.99 },
    sortOrder: 2,
  },
  {
    id: "frango-catupiry",
    name: "Frango com Catupiry",
    description: "Molho de tomate, mussarela, frango desfiado, Catupiry e orégano.",
    categoryId: "especiais",
    image: "/images/pizza-frango-catupiry.jpg",
    available: true,
    sizePrices: { unico: 46.99 },
    sortOrder: 0,
  },
  {
    id: "calabresa-especial",
    name: "Calabresa Especial",
    description: "Molho especial, mussarela, bacon, calabresa, ovo e orégano.",
    categoryId: "especiais",
    image: "/images/pizza-calabresa-especial.jpg",
    available: true,
    sizePrices: { unico: 47.99 },
    sortOrder: 1,
  },
  {
    id: "carne-de-sol",
    name: "Carne de Sol",
    description:
      "Molho de tomate, mussarela, carne de sol desfiada, molho especial da casa, manteiga da terra e orégano.",
    categoryId: "especiais",
    image: "/images/pizza-carne-de-sol.jpg",
    available: true,
    sizePrices: { unico: 48.99 },
    sortOrder: 2,
  },
  {
    id: "la-villa",
    name: "La Villa",
    description:
      "Molho especial, mussarela, presunto, peito de peru, calabresa, bacon, ovo, cebola e orégano.",
    categoryId: "especiais",
    image: "/images/pizza-la-villa.jpg",
    available: true,
    sizePrices: { unico: 44.99 },
    sortOrder: 3,
  },
];

export const fallbackCrust: CrustOption = {
  id: "sem",
  name: "Sem borda recheada",
  price: 0,
  active: true,
  sortOrder: 0,
};

export function getProductPrice(product: MenuProduct): number | undefined {
  if (product.sizePrices?.unico !== undefined) return product.sizePrices.unico;
  return product.price;
}

export function parsePrice(value: string): number | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getCrustPrice(bordas: CrustOption[], id: string): number {
  return bordas.find((borda) => borda.id === id)?.price ?? 0;
}

export function isBeverageCategory(category: { id: string; name: string }): boolean {
  const id = category.id.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const name = category.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return (
    id.includes("bebida") ||
    name.includes("bebida") ||
    id.includes("refrigerante") ||
    name.includes("refrigerante") ||
    id.includes("suco") ||
    name.includes("suco") ||
    id.includes("cerveja") ||
    name.includes("cerveja")
  );
}

