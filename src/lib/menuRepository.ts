import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from '@/data/seed';
import { FALLBACK_PRODUCT_IMAGE } from '@/lib/assets';
import type {
  Category,
  MenuState,
  PizzaBorder,
  PizzaSize,
  Product,
  Settings,
} from '@/types';
import { requireSupabase } from './supabase';

export const SETTINGS_ID = 'default';

interface CategoryRow {
  id: string;
  name: string;
  kind: string | null;
  description: string | null;
  sort_order: number | null;
}

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  image: string | null;
  available: boolean | null;
  featured: boolean | null;
  price: number | string | null;
  size_prices: unknown;
  sort_order: number | null;
}

interface SettingsRow {
  id: string;
  store_name: string | null;
  slogan: string | null;
  whatsapp: string | null;
  delivery_fee: number | string | null;
  store_open: boolean | null;
  hours_text: string | null;
  admin_pin: string | null;
  sizes: unknown;
  bordas: unknown;
}

interface QueryError {
  message: string;
  details?: string;
  hint?: string;
}

function fail(prefix: string, error: QueryError | null) {
  if (!error) return;
  throw new Error(`${prefix}: ${error.message}`);
}

function loadError(error: QueryError) {
  return new Error(
    `Falha ao carregar o cardápio do Supabase: ${error.message}. ` +
      'Confirme se o SQL de supabase/schema.sql foi executado no painel do Supabase.',
  );
}

function cloneSettings(settings: Settings): Settings {
  return {
    ...settings,
    sizes: settings.sizes.map((size) => ({ ...size })),
    bordas: settings.bordas.map((border) => ({ ...border })),
  };
}

function cloneMenu(menu: MenuState): MenuState {
  return {
    categories: menu.categories.map((category) => ({ ...category })),
    products: menu.products.map((product) => ({
      ...product,
      sizePrices: product.sizePrices ? { ...product.sizePrices } : undefined,
    })),
    settings: cloneSettings(menu.settings),
  };
}

export function defaultMenuSnapshot(): MenuState {
  return cloneMenu({
    categories: DEFAULT_CATEGORIES,
    products: DEFAULT_PRODUCTS,
    settings: DEFAULT_SETTINGS,
  });
}

function parseSizes(value: unknown): PizzaSize[] {
  if (!Array.isArray(value)) return cloneSettings(DEFAULT_SETTINGS).sizes;

  const sizes = value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Partial<PizzaSize>;
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return [];
    return [
      {
        id: candidate.id,
        name: candidate.name,
        slices: Number(candidate.slices) || 0,
      },
    ];
  });

  return sizes.length ? sizes : cloneSettings(DEFAULT_SETTINGS).sizes;
}

function parseBordas(value: unknown): PizzaBorder[] {
  if (!Array.isArray(value)) return cloneSettings(DEFAULT_SETTINGS).bordas;

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Partial<PizzaBorder>;
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return [];
    return [
      {
        id: candidate.id,
        name: candidate.name,
        price: Number(candidate.price) || 0,
      },
    ];
  });
}

function parseSizePrices(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const entries = Object.entries(value as Record<string, unknown>).flatMap(
    ([sizeId, price]) => {
      const numeric = Number(price);
      return Number.isFinite(numeric) ? [[sizeId, numeric] as const] : [];
    },
  );

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind === 'simple' ? 'simple' : 'pizza',
    description: row.description ?? undefined,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    categoryId: row.category_id,
    image: row.image || FALLBACK_PRODUCT_IMAGE,
    available: row.available !== false,
    featured: Boolean(row.featured),
    price: row.price === null || row.price === undefined ? undefined : Number(row.price),
    sizePrices: parseSizePrices(row.size_prices),
  };
}

function mapSettings(row: SettingsRow | null): Settings {
  if (!row) return cloneSettings(DEFAULT_SETTINGS);

  return {
    storeName: row.store_name || DEFAULT_SETTINGS.storeName,
    slogan: row.slogan ?? '',
    whatsapp: row.whatsapp || DEFAULT_SETTINGS.whatsapp,
    deliveryFee: Number(row.delivery_fee) || 0,
    storeOpen: row.store_open !== false,
    hoursText: row.hours_text ?? '',
    adminPin: row.admin_pin || DEFAULT_SETTINGS.adminPin,
    sizes: parseSizes(row.sizes),
    bordas: parseBordas(row.bordas),
  };
}

function categoryPayload(category: Category, sortOrder?: number) {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    description: category.description ?? null,
    ...(sortOrder === undefined ? {} : { sort_order: sortOrder }),
  };
}

function productPayload(product: Product, sortOrder?: number) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category_id: product.categoryId,
    image: product.image,
    available: product.available,
    featured: Boolean(product.featured),
    price: product.price ?? null,
    size_prices: product.sizePrices ?? {},
    ...(sortOrder === undefined ? {} : { sort_order: sortOrder }),
  };
}

function settingsPayload(settings: Settings) {
  return {
    id: SETTINGS_ID,
    store_name: settings.storeName,
    slogan: settings.slogan,
    whatsapp: settings.whatsapp,
    delivery_fee: settings.deliveryFee,
    store_open: settings.storeOpen,
    hours_text: settings.hoursText,
    admin_pin: settings.adminPin,
    sizes: settings.sizes,
    bordas: settings.bordas,
  };
}

async function nextSortOrder(table: 'categories' | 'products') {
  const client = requireSupabase();
  const { data, error } = await client
    .from(table)
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  fail('Não foi possível calcular a ordem do item', error);
  const last = (data?.[0] as { sort_order: number | null } | undefined)?.sort_order;
  return Number(last ?? -1) + 1;
}

export async function seedMenuData() {
  const client = requireSupabase();

  const categories = DEFAULT_CATEGORIES.map((category, index) =>
    categoryPayload(category, index),
  );
  const { error: categoriesError } = await client
    .from('categories')
    .upsert(categories, { onConflict: 'id' });
  fail('Não foi possível criar as categorias iniciais', categoriesError);

  const products = DEFAULT_PRODUCTS.map((product, index) =>
    productPayload(product, index),
  );
  const { error: productsError } = await client
    .from('products')
    .upsert(products, { onConflict: 'id' });
  fail('Não foi possível criar os produtos iniciais', productsError);

  const { error: settingsError } = await client
    .from('store_settings')
    .upsert(settingsPayload(DEFAULT_SETTINGS), { onConflict: 'id' });
  fail('Não foi possível criar as configurações iniciais', settingsError);
}

export async function fetchMenuData(): Promise<MenuState> {
  const client = requireSupabase();

  const [categoriesResult, productsResult, settingsResult] = await Promise.all([
    client
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    client
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    client.from('store_settings').select('*').eq('id', SETTINGS_ID).maybeSingle(),
  ]);

  if (categoriesResult.error) throw loadError(categoriesResult.error);
  if (productsResult.error) throw loadError(productsResult.error);
  if (settingsResult.error) throw loadError(settingsResult.error);

  const categories = ((categoriesResult.data ?? []) as CategoryRow[]).map(mapCategory);
  const products = ((productsResult.data ?? []) as ProductRow[]).map(mapProduct);
  const settingsRow = settingsResult.data as SettingsRow | null;

  // Primeira execução: todas as tabelas vazias. Popula com o cardápio inicial.
  if (!categories.length && !products.length && !settingsRow) {
    await seedMenuData();
    return defaultMenuSnapshot();
  }

  // O cardápio pode existir sem a linha de configurações (ex.: seed parcial).
  if (!settingsRow) {
    const { error } = await client
      .from('store_settings')
      .upsert(settingsPayload(DEFAULT_SETTINGS), { onConflict: 'id' });
    fail('Não foi possível criar as configurações da loja', error);
  }

  return {
    categories,
    products,
    settings: mapSettings(settingsRow),
  };
}

let initialMenuRequest: Promise<MenuState> | null = null;

export function fetchMenuDataOnce(): Promise<MenuState> {
  if (!initialMenuRequest) {
    initialMenuRequest = fetchMenuData().finally(() => {
      initialMenuRequest = null;
    });
  }
  return initialMenuRequest;
}

export async function insertCategory(category: Category) {
  const client = requireSupabase();
  const sortOrder = await nextSortOrder('categories');
  const { error } = await client
    .from('categories')
    .insert(categoryPayload(category, sortOrder));
  fail('Não foi possível criar a categoria', error);
}

export async function updateCategory(category: Category) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('categories')
    .update(categoryPayload(category))
    .eq('id', category.id)
    .select('id');

  fail('Não foi possível atualizar a categoria', error);
  if (!data?.length) throw new Error('Categoria não encontrada no Supabase.');
}

export async function deleteCategoryById(categoryId: string) {
  const client = requireSupabase();

  const { error: productsError } = await client
    .from('products')
    .delete()
    .eq('category_id', categoryId);
  fail('Não foi possível excluir os produtos da categoria', productsError);

  const { error } = await client.from('categories').delete().eq('id', categoryId);
  fail('Não foi possível excluir a categoria', error);
}

export async function reorderCategories(orderedIds: string[]) {
  const client = requireSupabase();

  await Promise.all(
    orderedIds.map(async (id, index) => {
      const { data, error } = await client
        .from('categories')
        .update({ sort_order: index })
        .eq('id', id)
        .select('id');
      fail('Não foi possível reordenar as categorias', error);
      if (!data?.length) throw new Error('Categoria não encontrada no Supabase.');
    }),
  );
}

export async function insertProduct(product: Product) {
  const client = requireSupabase();
  const sortOrder = await nextSortOrder('products');
  const { error } = await client
    .from('products')
    .insert(productPayload(product, sortOrder));
  fail('Não foi possível criar o produto', error);
}

export async function updateProduct(product: Product) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .update(productPayload(product))
    .eq('id', product.id)
    .select('id');

  fail('Não foi possível atualizar o produto', error);
  if (!data?.length) throw new Error('Produto não encontrado no Supabase.');
}

export async function deleteProductById(productId: string) {
  const client = requireSupabase();
  const { error } = await client.from('products').delete().eq('id', productId);
  fail('Não foi possível excluir o produto', error);
}

export async function updateProductAvailability(productId: string, available: boolean) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .update({ available })
    .eq('id', productId)
    .select('id');

  fail('Não foi possível atualizar a disponibilidade do produto', error);
  if (!data?.length) throw new Error('Produto não encontrado no Supabase.');
}

export async function saveSettingsData(settings: Settings) {
  const client = requireSupabase();
  const { error } = await client
    .from('store_settings')
    .upsert(settingsPayload(settings), { onConflict: 'id' });
  fail('Não foi possível salvar as configurações', error);
}

export async function replaceMenuWithSeed() {
  const client = requireSupabase();

  const { error: productsError } = await client
    .from('products')
    .delete()
    .neq('id', '__never__');
  fail('Não foi possível limpar os produtos', productsError);

  const { error: categoriesError } = await client
    .from('categories')
    .delete()
    .neq('id', '__never__');
  fail('Não foi possível limpar as categorias', categoriesError);

  await seedMenuData();
}
