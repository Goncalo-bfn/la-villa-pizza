import type { Category, MenuState, PizzaBorder, PizzaSize, Product, Settings } from '@/types';

export const DEFAULT_SIZES: PizzaSize[] = [
  { id: 'P', name: 'Pequena', slices: 4 },
  { id: 'M', name: 'Média', slices: 6 },
  { id: 'G', name: 'Grande', slices: 8 },
];

export const DEFAULT_BORDERS: PizzaBorder[] = [
  { id: 'sem', name: 'Sem borda recheada', price: 0 },
  { id: 'catupiry', name: 'Borda de catupiry', price: 8 },
  { id: 'cheddar', name: 'Borda de cheddar', price: 8 },
];

export const DEFAULT_SETTINGS: Settings = {
  storeName: 'La Villa Pizza',
  slogan: 'O sabor que conquista',
  whatsapp: '5598987020320',
  deliveryFee: 5,
  storeOpen: true,
  hoursText: '',
  adminPin: '1234',
  sizes: DEFAULT_SIZES,
  bordas: DEFAULT_BORDERS,
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'tradicionais',
    name: 'Pizzas Tradicionais',
    kind: 'pizza',
    description: 'Os clássicos da casa',
  },
  {
    id: 'especiais',
    name: 'Pizzas Especiais',
    kind: 'pizza',
    description: 'Recheio caprichado',
  },
  {
    id: 'bebidas',
    name: 'Bebidas',
    kind: 'simple',
    description: 'Para acompanhar',
  },
];

const TRADICIONAIS_PRICES = { P: 30, M: 40, G: 50 };
const ESPECIAIS_PRICES = { P: 35, M: 46, G: 56 };

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'calabresa',
    name: 'Calabresa',
    description: 'Molho, mussarela, calabresa, cebola e orégano.',
    categoryId: 'tradicionais',
    image: '/images/pizza-calabresa.jpg',
    available: true,
    sizePrices: TRADICIONAIS_PRICES,
    featured: true,
  },
  {
    id: 'frango-catupiry',
    name: 'Frango Catupiry',
    description: 'Molho, mussarela, frango desfiado e catupiry.',
    categoryId: 'tradicionais',
    image: '/images/pizza-frango-catupiry.jpg',
    available: true,
    sizePrices: TRADICIONAIS_PRICES,
    featured: true,
  },
  {
    id: 'mussarela',
    name: 'Mussarela',
    description: 'Molho, mussarela e orégano.',
    categoryId: 'tradicionais',
    image: '/images/pizza-mussarela.jpg',
    available: true,
    sizePrices: TRADICIONAIS_PRICES,
  },
  {
    id: 'margherita',
    name: 'Margherita',
    description: 'Molho, mussarela e orégano.',
    categoryId: 'tradicionais',
    image: '/images/pizza-margherita.jpg',
    available: true,
    sizePrices: TRADICIONAIS_PRICES,
  },
  {
    id: 'portuguesa',
    name: 'Portuguesa',
    description: 'Molho, mussarela, presunto, ovos, cebola e orégano.',
    categoryId: 'especiais',
    image: '/images/pizza-portuguesa.jpg',
    available: true,
    sizePrices: ESPECIAIS_PRICES,
  },
  {
    id: 'calabresa-especial',
    name: 'Calabresa Especial',
    description: 'Molho, mussarela, calabresa, bacon e cebola.',
    categoryId: 'especiais',
    image: '/images/pizza-calabresa-especial.jpg',
    available: true,
    sizePrices: ESPECIAIS_PRICES,
  },
  {
    id: 'carne-de-sol',
    name: 'Carne de Sol',
    description: 'Molho, mussarela, carne de sol, cebola e orégano.',
    categoryId: 'especiais',
    image: '/images/pizza-carne-de-sol.jpg',
    available: true,
    sizePrices: ESPECIAIS_PRICES,
  },
  {
    id: 'la-villa',
    name: 'La Villa',
    description: 'Molho, mussarela, presunto, calabresa, bacon, cebola e orégano.',
    categoryId: 'especiais',
    image: '/images/pizza-la-villa.jpg',
    available: true,
    sizePrices: { P: 38, M: 50, G: 60 },
    featured: true,
  },
  {
    id: 'coca-2l',
    name: 'Coca-Cola 2L',
    description: 'Bem gelada.',
    categoryId: 'bebidas',
    image: '/images/bebidas.jpg',
    available: true,
    price: 14,
  },
  {
    id: 'guarana-2l',
    name: 'Guaraná Antarctica 2L',
    description: 'Bem gelado.',
    categoryId: 'bebidas',
    image: '/images/bebidas.jpg',
    available: true,
    price: 12,
  },
  {
    id: 'refri-lata',
    name: 'Refrigerante lata 350ml',
    description: 'Coca-Cola, Guaraná, Sprite ou Fanta.',
    categoryId: 'bebidas',
    image: '/images/bebidas.jpg',
    available: true,
    price: 6,
  },
  {
    id: 'agua',
    name: 'Água mineral 500ml',
    description: 'Com ou sem gás.',
    categoryId: 'bebidas',
    image: '/images/bebidas.jpg',
    available: true,
    price: 3,
  },
];

export const DEFAULT_MENU: MenuState = {
  categories: DEFAULT_CATEGORIES,
  products: DEFAULT_PRODUCTS,
  settings: DEFAULT_SETTINGS,
};

export const STORAGE_KEYS = {
  menu: 'lavilla:menu:v1',
  cart: 'lavilla:cart:v1',
  orders: 'lavilla:orders:v1',
  customer: 'lavilla:customer:v1',
  adminSession: 'lavilla:admin-session',
} as const;
