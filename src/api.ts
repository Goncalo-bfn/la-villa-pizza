import {
  fallbackCrust,
  createId,
  legacyCategories,
  legacyInitialProducts,
} from "./catalog";
import {
  FALLBACK_ADMIN_PIN,
  FALLBACK_PLATFORM_FEE,
  FALLBACK_RESTAURANT_NAME,
  FALLBACK_WHATSAPP_PHONE,
  MAX_IMAGE_BYTES,
  PRODUCT_IMAGE_BUCKET,
} from "./config";
import { isSupabaseConfigured, requireSupabase } from "./supabase";
import type {
  CatalogData,
  Category,
  CrustOption,
  MenuProduct,
  StoreSettings,
} from "./types";

interface CategoryRow {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
}

interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  description: string;
  image_url: string | null;
  active: boolean;
  base_price: number | string | null;
  size_prices: unknown;
  sort_order: number;
  created_at?: string;
}

interface CrustRow {
  id: string;
  name: string;
  price: number | string;
  active: boolean;
  sort_order: number;
  created_at?: string;
}

interface SettingsRow {
  id: string;
  restaurant_name: string;
  whatsapp_number: string;
  delivery_fee: number | string;
  platform_fee: number | string;
  admin_pin: string;
  legacy_migration_done: boolean;
  updated_at?: string;
}

function toNumber(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toSizePrices(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, price]) => [key, toNumber(price)] as const)
    .filter(([, price]) => Number.isFinite(price));
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind === "pizza" ? "pizza" : "simple",
    active: Boolean(row.active),
    sortOrder: toNumber(row.sort_order),
    createdAt: row.created_at,
  };
}

function mapProduct(row: ProductRow): MenuProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    categoryId: row.category_id,
    image: row.image_url ?? undefined,
    available: Boolean(row.active),
    price: row.base_price === null ? undefined : toNumber(row.base_price),
    sizePrices: toSizePrices(row.size_prices),
    sortOrder: toNumber(row.sort_order),
    createdAt: row.created_at,
  };
}

function mapCrust(row: CrustRow): CrustOption {
  return {
    id: row.id,
    name: row.name,
    price: toNumber(row.price),
    active: Boolean(row.active),
    sortOrder: toNumber(row.sort_order),
    createdAt: row.created_at,
  };
}

function mapSettings(row: SettingsRow): StoreSettings {
  return {
    restaurantName: row.restaurant_name?.trim() || FALLBACK_RESTAURANT_NAME,
    whatsappNumber: row.whatsapp_number?.trim() || FALLBACK_WHATSAPP_PHONE,
    deliveryFee: toNumber(row.delivery_fee),
    platformFee: toNumber(row.platform_fee, FALLBACK_PLATFORM_FEE),
    adminPin: row.admin_pin?.trim() || FALLBACK_ADMIN_PIN,
    legacyMigrationDone: Boolean(row.legacy_migration_done),
    updatedAt: row.updated_at,
  };
}

export function defaultSettings(): StoreSettings {
  return {
    restaurantName: FALLBACK_RESTAURANT_NAME,
    whatsappNumber: FALLBACK_WHATSAPP_PHONE,
    deliveryFee: 0,
    platformFee: FALLBACK_PLATFORM_FEE,
    adminPin: FALLBACK_ADMIN_PIN,
    legacyMigrationDone: false,
  };
}

function normalizeCrusts(crusts: CrustOption[]): CrustOption[] {
  const sorted = [...crusts].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR"),
  );
  const sem = sorted.find((crust) => crust.id === "sem");
  return [sem ?? fallbackCrust, ...sorted.filter((crust) => crust.id !== "sem")];
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function loadCatalog(): Promise<CatalogData> {
  const client = requireSupabase();
  const [categoriesResult, productsResult, crustsResult, settingsResult] = await Promise.all([
    client.from("categories").select("*").order("sort_order", { ascending: true }),
    client.from("products").select("*").order("sort_order", { ascending: true }),
    client.from("crusts").select("*").order("sort_order", { ascending: true }),
    client.from("settings").select("*").eq("id", "default").maybeSingle(),
  ]);

  fail(categoriesResult.error);
  fail(productsResult.error);
  fail(crustsResult.error);
  fail(settingsResult.error);

  const categories = ((categoriesResult.data ?? []) as CategoryRow[])
    .map(mapCategory)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR"));
  const products = ((productsResult.data ?? []) as ProductRow[])
    .map(mapProduct)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR"));
  const crusts = normalizeCrusts(((crustsResult.data ?? []) as CrustRow[]).map(mapCrust));
  const settings = settingsResult.data
    ? mapSettings(settingsResult.data as SettingsRow)
    : defaultSettings();

  return { categories, products, crusts, settings };
}

function categoryRow(category: Category) {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    active: category.active,
    sort_order: category.sortOrder,
  };
}

function productRow(product: MenuProduct) {
  const isPizza = product.sizePrices !== undefined;
  return {
    id: product.id,
    category_id: product.categoryId,
    name: product.name,
    description: product.description,
    image_url: product.image ?? null,
    active: product.available,
    base_price: isPizza ? null : (product.price ?? null),
    size_prices: isPizza ? product.sizePrices : null,
    sort_order: product.sortOrder,
  };
}

function crustRow(crust: CrustOption) {
  return {
    id: crust.id,
    name: crust.name,
    price: crust.price,
    active: crust.active,
    sort_order: crust.sortOrder,
  };
}

function settingsRow(settings: StoreSettings) {
  return {
    id: "default",
    restaurant_name: settings.restaurantName,
    whatsapp_number: settings.whatsappNumber.replace(/\D/g, ""),
    delivery_fee: settings.deliveryFee,
    platform_fee: settings.platformFee,
    admin_pin: settings.adminPin,
    legacy_migration_done: settings.legacyMigrationDone,
    updated_at: new Date().toISOString(),
  };
}

export async function saveCategory(category: Category): Promise<void> {
  const { error } = await requireSupabase().from("categories").upsert(categoryRow(category));
  fail(error);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await requireSupabase().from("categories").delete().eq("id", id);
  fail(error);
}

export async function saveProduct(product: MenuProduct): Promise<void> {
  const { error } = await requireSupabase().from("products").upsert(productRow(product));
  fail(error);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await requireSupabase().from("products").delete().eq("id", id);
  fail(error);
}

export async function saveCrust(crust: CrustOption): Promise<void> {
  const { error } = await requireSupabase().from("crusts").upsert(crustRow(crust));
  fail(error);
}

export async function deleteCrust(id: string): Promise<void> {
  if (id === "sem") throw new Error("A opção “Sem borda recheada” não pode ser removida.");
  const { error } = await requireSupabase().from("crusts").delete().eq("id", id);
  fail(error);
}

export async function saveSettings(settings: StoreSettings): Promise<void> {
  const { error } = await requireSupabase().from("settings").upsert(settingsRow(settings));
  fail(error);
}

export async function setSortOrders(
  table: "categories" | "products" | "crusts",
  items: { id: string; sortOrder: number }[],
): Promise<void> {
  if (!items.length) return;
  const client = requireSupabase();
  const results = await Promise.all(
    items.map((item) =>
      client.from(table).update({ sort_order: item.sortOrder }).eq("id", item.id),
    ),
  );
  results.forEach((result) => fail(result.error));
}

export async function uploadProductImage(file: File): Promise<string> {
  const client = requireSupabase();
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem (JPG, PNG, WEBP ou GIF).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }
  const extension =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${createId()}.${extension}`;
  const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  fail(error);
  return client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Remove do Storage uma foto enviada pelo admin (ignora imagens do /public). */
export async function deleteUploadedImage(url: string | undefined): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return;
  const path = decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
  if (!path) return;
  await requireSupabase().storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
}

/* -------------------------------------------------------------------------- */
/* Migração única do cardápio antigo (localStorage)                           */
/* -------------------------------------------------------------------------- */

const LEGACY_PRODUCTS_KEY = "la-villa.products.v1";
const LEGACY_SETTINGS_KEY = "la-villa.settings.v1";
const LEGACY_MARKER_KEY = "la-villa.migration.supabase.v1";

interface LegacySettings {
  deliveryFee?: unknown;
  platformFee?: unknown;
  bordas?: { id?: unknown; name?: unknown; price?: unknown }[];
}

interface LegacySnapshot {
  products: MenuProduct[];
  deliveryFee?: number;
  platformFee?: number;
  crusts: CrustOption[];
}

function hasValidPrice(product: MenuProduct): boolean {
  if (product.sizePrices) {
    return Object.values(product.sizePrices).some((price) => toNumber(price) > 0);
  }
  return toNumber(product.price) > 0;
}

function readLegacySnapshot(): LegacySnapshot | null {
  const productsRaw = window.localStorage.getItem(LEGACY_PRODUCTS_KEY);
  const settingsRaw = window.localStorage.getItem(LEGACY_SETTINGS_KEY);
  if (!productsRaw && !settingsRaw) return null;

  let legacyProducts: MenuProduct[] | null = null;
  if (productsRaw) {
    try {
      const parsed: unknown = JSON.parse(productsRaw);
      if (Array.isArray(parsed)) legacyProducts = parsed as MenuProduct[];
    } catch {
      throw new Error("Os dados antigos salvos neste navegador estão inválidos.");
    }
  }

  let legacySettings: LegacySettings | null = null;
  if (settingsRaw) {
    try {
      const parsed: unknown = JSON.parse(settingsRaw);
      if (parsed && typeof parsed === "object") legacySettings = parsed as LegacySettings;
    } catch {
      throw new Error("As configurações antigas salvas neste navegador estão inválidas.");
    }
  }

  const sourceProducts = legacyProducts ?? legacyInitialProducts;
  const products = sourceProducts
    .filter(
      (product) =>
        product &&
        typeof product.id === "string" &&
        typeof product.name === "string" &&
        hasValidPrice(product),
    )
    .map((product, index) => ({
      ...product,
      sortOrder: index,
      available: product.available !== false,
      description: product.description ?? "",
    }));

  const crusts: CrustOption[] = [];
  const seen = new Set<string>();
  for (const crust of legacySettings?.bordas ?? []) {
    if (!crust || typeof crust.id !== "string" || typeof crust.name !== "string") continue;
    if (seen.has(crust.id)) continue;
    seen.add(crust.id);
    crusts.push({
      id: crust.id,
      name: crust.name,
      price: toNumber(crust.price),
      active: true,
      sortOrder: crusts.length,
    });
  }
  if (!seen.has("sem")) {
    crusts.unshift({ ...fallbackCrust });
  }

  return {
    products,
    deliveryFee:
      legacySettings?.deliveryFee === undefined
        ? undefined
        : toNumber(legacySettings.deliveryFee),
    platformFee:
      legacySettings?.platformFee === undefined
        ? undefined
        : toNumber(legacySettings.platformFee),
    crusts,
  };
}

export function hasLegacyCatalogData(): boolean {
  const legacy =
    window.localStorage.getItem(LEGACY_PRODUCTS_KEY) ||
    window.localStorage.getItem(LEGACY_SETTINGS_KEY);
  return Boolean(legacy) && !window.localStorage.getItem(LEGACY_MARKER_KEY);
}

function clearLegacyCatalog(): void {
  window.localStorage.removeItem(LEGACY_PRODUCTS_KEY);
  window.localStorage.removeItem(LEGACY_SETTINGS_KEY);
  window.localStorage.setItem(LEGACY_MARKER_KEY, new Date().toISOString());
}

/**
 * Importa o cardápio que estava no localStorage deste navegador.
 * Executado apenas pelo admin e apenas uma vez (flag global no Supabase).
 */
export async function migrateLegacyCatalog(current: CatalogData): Promise<"imported" | "none"> {
  if (!isSupabaseConfigured) return "none";
  if (current.settings.legacyMigrationDone) {
    if (hasLegacyCatalogData()) clearLegacyCatalog();
    return "none";
  }
  const legacy = readLegacySnapshot();
  if (!legacy) return "none";

  const client = requireSupabase();

  const categories = legacyCategories.map((category, index) => {
    const existing = current.categories.find((item) => item.id === category.id);
    const base = existing ?? category;
    return {
      ...categoryRow(base),
      sort_order: existing?.sortOrder ?? index,
    };
  });

  const knownCategoryIds = new Set(categories.map((category) => category.id));
  const products = legacy.products.map((product, index) => {
    let categoryId =
      typeof product.categoryId === "string" && product.categoryId
        ? product.categoryId
        : "outros";
    if (!knownCategoryIds.has(categoryId)) {
      categories.push({
        id: categoryId,
        name: categoryId === "outros" ? "Outros" : categoryId,
        kind: product.sizePrices ? "pizza" : "simple",
        active: true,
        sort_order: categories.length,
      });
      knownCategoryIds.add(categoryId);
    }
    return {
      ...productRow({ ...product, categoryId, sortOrder: index }),
      category_id: categoryId,
    };
  });

  // Categorias primeiro (FK), depois os produtos.
  const categoriesResult = await client.from("categories").upsert(categories);
  fail(categoriesResult.error);

  const productsResult = await client.from("products").upsert(products);
  fail(productsResult.error);

  const crustRows = legacy.crusts.map((crust, index) => {
    const existing = current.crusts.find((item) => item.id === crust.id);
    const base = existing ?? crust;
    return {
      ...crustRow(base),
      sort_order: existing?.sortOrder ?? index,
    };
  });
  const crustsResult = await client.from("crusts").upsert(crustRows);
  fail(crustsResult.error);

  // Remove do banco os produtos do cardápio padrão que foram excluídos no
  // cardápio antigo, preservando qualquer produto criado fora do seed.
  const legacyIds = new Set(products.map((product) => product.id));
  const seededIds = legacyInitialProducts.map((product) => product.id);
  const removedSeedIds = seededIds.filter((id) => !legacyIds.has(id));
  if (removedSeedIds.length) {
    const deleteResult = await client.from("products").delete().in("id", removedSeedIds);
    fail(deleteResult.error);
  }

  const settingsResult = await client.from("settings").upsert({
    ...settingsRow({
      ...current.settings,
      deliveryFee: legacy.deliveryFee ?? current.settings.deliveryFee,
      platformFee: legacy.platformFee ?? current.settings.platformFee,
      legacyMigrationDone: true,
    }),
  });
  fail(settingsResult.error);

  clearLegacyCatalog();
  return "imported";
}

/** Descarta os dados antigos deste navegador sem importar (marca como migrado). */
export async function discardLegacyCatalog(current: CatalogData): Promise<void> {
  await saveSettings({ ...current.settings, legacyMigrationDone: true });
  clearLegacyCatalog();
}

/** Utilitário usado pelo admin para exibir um resumo antes da importação. */
export function legacyCatalogSummary(): { products: number; hasSettings: boolean } | null {
  if (!hasLegacyCatalogData()) return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_PRODUCTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const products = Array.isArray(parsed) ? parsed.length : 0;
    return { products, hasSettings: Boolean(window.localStorage.getItem(LEGACY_SETTINGS_KEY)) };
  } catch {
    return { products: 0, hasSettings: true };
  }
}
