export type CategoryKind = "pizza" | "simple";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  image?: string;
  available: boolean;
  /** Usado por produtos simples (bebidas, sobremesas). */
  price?: number;
  /** Usado por pizzas. */
  sizePrices?: Record<string, number>;
  sortOrder: number;
  createdAt?: string;
}

export interface CrustOption {
  id: string;
  name: string;
  price: number;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
}

export interface StoreSettings {
  restaurantName: string;
  whatsappNumber: string;
  deliveryFee: number;
  platformFee: number;
  adminPin: string;
  /** Controle interno da migração única do localStorage. */
  legacyMigrationDone: boolean;
  updatedAt?: string;
}

export interface CatalogData {
  categories: Category[];
  products: MenuProduct[];
  crusts: CrustOption[];
  settings: StoreSettings;
}

export interface PizzaHalf {
  productId: string;
  name: string;
  priceCents: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  qty: number;
  sizeId: string;
  sizeName: string;
  bordaId: string;
  bordaName: string;
  bordaPriceCents: number;
  basePriceCents: number;
  unitPriceCents: number;
  halves?: PizzaHalf[];
}
