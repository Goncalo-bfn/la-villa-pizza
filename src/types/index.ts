export type CategoryKind = 'pizza' | 'simple';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  image: string;
  available: boolean;
  featured?: boolean;
  /** Preço único para itens simples (bebidas, etc.) */
  price?: number;
  /** Preço por tamanho para pizzas. Ex.: { P: 30, M: 40, G: 50 } */
  sizePrices?: Record<string, number>;
}

export interface PizzaSize {
  id: string;
  name: string;
  slices: number;
}

export interface PizzaBorder {
  id: string;
  name: string;
  price: number;
}

export interface Settings {
  storeName: string;
  slogan: string;
  whatsapp: string;
  deliveryFee: number;
  storeOpen: boolean;
  hoursText: string;
  adminPin: string;
  sizes: PizzaSize[];
  bordas: PizzaBorder[];
}

export interface MenuState {
  categories: Category[];
  products: Product[];
  settings: Settings;
}

export interface CartFlavor {
  productId: string;
  name: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  /** Presente apenas em pizzas meio a meio, sempre com 2 sabores. */
  flavors?: [CartFlavor, CartFlavor];
  sizeId?: string;
  sizeName?: string;
  bordaId?: string;
  bordaName?: string;
  unitPrice: number;
  qty: number;
  note?: string;
}

export type Fulfillment = 'entrega' | 'retirada';
export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro';

export interface Customer {
  name: string;
  phone: string;
  fulfillment: Fulfillment;
  street?: string;
  number?: string;
  district?: string;
  reference?: string;
  payment: PaymentMethod;
  changeFor?: number;
  notes?: string;
}

export type OrderStatus = 'novo' | 'preparo' | 'saiu' | 'concluido' | 'cancelado';

export interface Order {
  id: string;
  number: number;
  createdAt: string;
  status: OrderStatus;
  items: CartItem[];
  customer: Customer;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
}

export interface CartTotals {
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
}

export interface AddToCartInput {
  productId: string;
  name: string;
  /** Presente apenas em pizzas meio a meio, sempre com 2 sabores. */
  flavors?: [CartFlavor, CartFlavor];
  sizeId?: string;
  sizeName?: string;
  bordaId?: string;
  bordaName?: string;
  unitPrice: number;
  qty: number;
  note?: string;
}
