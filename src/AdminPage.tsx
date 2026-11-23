import { FormEvent, useRef, useState } from "react";
import {
  deleteCategory,
  deleteCrust,
  deleteProduct,
  deleteUploadedImage,
  discardLegacyCatalog,
  legacyCatalogSummary,
  migrateLegacyCatalog,
  saveCategory,
  saveCrust,
  saveProduct,
  saveSettings,
  setSortOrders,
  uploadProductImage,
} from "./api";
import { createId, formatCurrency, getProductPrice, parsePrice, toCents } from "./catalog";
import type {
  CatalogData,
  Category,
  CategoryKind,
  CrustOption,
  MenuProduct,
  StoreSettings,
} from "./types";

type Tab = "produtos" | "categorias" | "bordas" | "configuracoes";

interface Notice {
  kind: "success" | "error";
  text: string;
}

interface AdminPageProps {
  catalog: CatalogData;
  onRefresh: () => Promise<void>;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "produtos", label: "Produtos" },
  { id: "categorias", label: "Categorias" },
  { id: "bordas", label: "Bordas" },
  { id: "configuracoes", label: "Configurações" },
];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function sortByOrder<T extends { sortOrder: number; name: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR"),
  );
}

function nextSortOrder(items: { sortOrder: number }[]): number {
  return items.length ? Math.max(...items.map((item) => item.sortOrder)) + 1 : 0;
}

export default function AdminPage({ catalog, onRefresh }: AdminPageProps) {
  const { categories, products, crusts, settings } = catalog;
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [tab, setTab] = useState<Tab>("produtos");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [legacyInfo, setLegacyInfo] = useState(() => legacyCatalogSummary());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState<CategoryKind>("pizza");
  const [categoryActive, setCategoryActive] = useState(true);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productCategoryId, setProductCategoryId] = useState(categories[0]?.id ?? "");
  const [productPriceInput, setProductPriceInput] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productActive, setProductActive] = useState(true);

  const [editingCrustId, setEditingCrustId] = useState<string | null>(null);
  const [crustName, setCrustName] = useState("");
  const [crustPriceInput, setCrustPriceInput] = useState("");
  const [crustActive, setCrustActive] = useState(true);

  const [restaurantName, setRestaurantName] = useState(settings.restaurantName);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [deliveryFeeInput, setDeliveryFeeInput] = useState(settings.deliveryFee.toFixed(2));
  const [adminPin, setAdminPin] = useState(settings.adminPin);
  const [pixKey, setPixKey] = useState(settings.pixKey ?? "");

  const sortedCategories = sortByOrder(categories);
  const sortedProducts = sortByOrder(products);
  const categoryName_byId = new Map(categories.map((category) => [category.id, category.name]));
  const selectedCategory = categories.find((category) => category.id === productCategoryId);
  const productIsPizza = selectedCategory?.kind === "pizza";

  async function run(action: () => Promise<void>, success?: string) {
    setSaving(true);
    setNotice(null);
    try {
      await action();
      await onRefresh();
      if (success) setNotice({ kind: "success", text: success });
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error, "Não foi possível salvar.") });
    } finally {
      setSaving(false);
    }
  }

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin === settings.adminPin) {
      setUnlocked(true);
      setPinError("");
      setNotice(null);
      setPixKey(settings.pixKey ?? "");
      setLegacyInfo(legacyCatalogSummary());
      return;
    }
    setPinError("PIN incorreto. Tente novamente.");
  }

  function changeTab(next: Tab) {
    setTab(next);
    setNotice(null);
  }

  /* ------------------------------- categorias ------------------------------ */

  function resetCategoryForm() {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryKind("pizza");
    setCategoryActive(true);
  }

  function editCategory(category: Category) {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryKind(category.kind);
    setCategoryActive(category.active);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) {
      setNotice({ kind: "error", text: "Informe o nome da categoria." });
      return;
    }
    const existing = categories.find((category) => category.id === editingCategoryId);
    const category: Category = {
      id: existing?.id ?? createId(),
      name,
      kind: categoryKind,
      active: categoryActive,
      sortOrder: existing?.sortOrder ?? nextSortOrder(categories),
    };
    void run(async () => {
      await saveCategory(category);
      resetCategoryForm();
    }, existing ? "Categoria atualizada." : "Categoria criada.");
  }

  function toggleCategory(category: Category) {
    void run(
      () => saveCategory({ ...category, active: !category.active }),
      category.active ? "Categoria desativada." : "Categoria ativada.",
    );
  }

  function removeCategory(category: Category) {
    const linked = products.filter((product) => product.categoryId === category.id);
    if (linked.length) {
      setNotice({
        kind: "error",
        text: `Mova ou exclua os ${linked.length} produto(s) desta categoria antes de removê-la.`,
      });
      return;
    }
    if (!window.confirm(`Remover a categoria "${category.name}"?`)) return;
    void run(async () => {
      await deleteCategory(category.id);
      if (editingCategoryId === category.id) resetCategoryForm();
    }, "Categoria removida.");
  }

  function moveCategory(category: Category, direction: -1 | 1) {
    const list = sortByOrder(categories);
    const index = list.findIndex((item) => item.id === category.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const updates = list.map((item, order) => ({ id: item.id, sortOrder: order }));
    void run(() => setSortOrders("categories", updates));
  }

  /* -------------------------------- produtos ------------------------------- */

  function resetProductForm() {
    setEditingProductId(null);
    setProductName("");
    setProductDescription("");
    setProductCategoryId(categories[0]?.id ?? "");
    setProductPriceInput("");
    setProductImage("");
    setProductActive(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function editProduct(product: MenuProduct) {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductDescription(product.description);
    setProductCategoryId(product.categoryId);
    setProductPriceInput(getProductPrice(product)?.toFixed(2) ?? "");
    setProductImage(product.image ?? "");
    setProductActive(product.available);
    setNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = productName.trim();
    const category = categories.find((item) => item.id === productCategoryId);
    const price = parsePrice(productPriceInput);
    if (!name || !category || price === undefined || price <= 0) {
      setNotice({ kind: "error", text: "Informe o nome, a categoria e um preço maior que zero." });
      return;
    }
    const existing = products.find((product) => product.id === editingProductId);
    const isPizza = category.kind === "pizza";
    const image = productImage.trim() || undefined;
    const product: MenuProduct = {
      id: existing?.id ?? createId(),
      name,
      description: productDescription.trim(),
      categoryId: category.id,
      image,
      available: productActive,
      ...(isPizza
        ? { sizePrices: { ...(existing?.sizePrices ?? {}), unico: price } }
        : { price }),
      sortOrder: existing?.sortOrder ?? nextSortOrder(products),
    };
    const previousImage = existing?.image;
    void run(async () => {
      await saveProduct(product);
      if (previousImage && previousImage !== image) {
        await deleteUploadedImage(previousImage).catch(() => {});
      }
      resetProductForm();
    }, existing ? "Produto atualizado." : "Produto criado.");
  }

  function toggleProduct(product: MenuProduct) {
    void run(
      () => saveProduct({ ...product, available: !product.available }),
      product.available ? "Produto desativado." : "Produto ativado.",
    );
  }

  function removeProduct(product: MenuProduct) {
    if (!window.confirm(`Remover permanentemente "${product.name}" do cardápio?`)) return;
    void run(async () => {
      await deleteProduct(product.id);
      if (product.image) await deleteUploadedImage(product.image).catch(() => {});
      if (editingProductId === product.id) resetProductForm();
    }, "Produto removido.");
  }

  function moveProduct(product: MenuProduct, direction: -1 | 1) {
    const group = sortByOrder(products.filter((item) => item.categoryId === product.categoryId));
    const index = group.findIndex((item) => item.id === product.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= group.length) return;
    const slots = group.map((item) => item.sortOrder);
    [group[index], group[target]] = [group[target], group[index]];
    const updates = group.map((item, position) => ({
      id: item.id,
      sortOrder: slots[position],
    }));
    void run(() => setSortOrders("products", updates));
  }

  async function handleImageFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setNotice(null);
    try {
      const url = await uploadProductImage(file);
      setProductImage(url);
      setNotice({ kind: "success", text: "Foto enviada. Salve o produto para publicar." });
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error, "Não foi possível enviar a foto.") });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* --------------------------------- bordas -------------------------------- */

  function resetCrustForm() {
    setEditingCrustId(null);
    setCrustName("");
    setCrustPriceInput("");
    setCrustActive(true);
  }

  function editCrust(crust: CrustOption) {
    setEditingCrustId(crust.id);
    setCrustName(crust.name);
    setCrustPriceInput(crust.price.toFixed(2));
    setCrustActive(crust.active);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitCrust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = crustName.trim();
    const price = parsePrice(crustPriceInput);
    if (!name || price === undefined) {
      setNotice({ kind: "error", text: "Informe o nome e um preço válido para a borda." });
      return;
    }
    const existing = crusts.find((crust) => crust.id === editingCrustId);
    const crust: CrustOption = {
      id: existing?.id ?? createId(),
      name,
      price,
      active: crustActive,
      sortOrder: existing?.sortOrder ?? nextSortOrder(crusts),
    };
    void run(async () => {
      await saveCrust(crust);
      resetCrustForm();
    }, existing ? "Borda atualizada." : "Borda criada.");
  }

  function toggleCrust(crust: CrustOption) {
    void run(
      () => saveCrust({ ...crust, active: !crust.active }),
      crust.active ? "Borda desativada." : "Borda ativada.",
    );
  }

  function removeCrust(crust: CrustOption) {
    if (crust.id === "sem") return;
    if (!window.confirm(`Remover a borda "${crust.name}"?`)) return;
    void run(async () => {
      await deleteCrust(crust.id);
      if (editingCrustId === crust.id) resetCrustForm();
    }, "Borda removida.");
  }

  /* ----------------------------- configurações ----------------------------- */

  function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = restaurantName.trim();
    const whatsapp = whatsappNumber.replace(/\D/g, "");
    const deliveryFee = parsePrice(deliveryFeeInput);
    const newPin = adminPin.trim();
    if (!name) {
      setNotice({ kind: "error", text: "Informe o nome da pizzaria." });
      return;
    }
    if (whatsapp.length < 10) {
      setNotice({ kind: "error", text: "Informe o WhatsApp com DDI e DDD (somente números)." });
      return;
    }
    if (deliveryFee === undefined) {
      setNotice({ kind: "error", text: "Informe uma taxa de entrega válida (zero ou maior)." });
      return;
    }
    if (!newPin) {
      setNotice({ kind: "error", text: "O PIN do admin não pode ficar vazio." });
      return;
    }
    const next: StoreSettings = {
      ...settings,
      restaurantName: name,
      whatsappNumber: whatsapp,
      deliveryFee,
      platformFee: 0,
      adminPin: newPin,
      pixKey: pixKey.trim(),
    };
    void run(async () => {
      await saveSettings(next);
      setRestaurantName(name);
      setWhatsappNumber(whatsapp);
      setDeliveryFeeInput(deliveryFee.toFixed(2));
      setAdminPin(newPin);
      setPixKey(pixKey.trim());
    }, "Configurações salvas.");
  }

  async function importLegacy() {
    if (
      !window.confirm(
        "Importar o cardápio salvo neste navegador para o Supabase? Produtos com o mesmo ID serão atualizados.",
      )
    ) {
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const result = await migrateLegacyCatalog(catalog);
      await onRefresh();
      setLegacyInfo(null);
      setNotice({
        kind: "success",
        text:
          result === "imported"
            ? "Cardápio antigo importado com sucesso."
            : "Não havia dados antigos para importar.",
      });
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error, "Não foi possível importar.") });
    } finally {
      setSaving(false);
    }
  }

  async function ignoreLegacy() {
    if (
      !window.confirm(
        "Ignorar os dados antigos deste navegador? Eles serão apagados e não poderão ser importados depois.",
      )
    ) {
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await discardLegacyCatalog(catalog);
      await onRefresh();
      setLegacyInfo(null);
      setNotice({ kind: "success", text: "Dados antigos descartados." });
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error, "Não foi possível descartar.") });
    } finally {
      setSaving(false);
    }
  }

  if (!unlocked) {
    return (
      <main className="admin-login">
        <a className="back-link" href="/">
          ← Voltar ao cardápio
        </a>
        <section className="admin-login-card">
          <img className="admin-logo" src="/images/la-villa-logo.jpg" alt={settings.restaurantName} />
          <p className="eyebrow">Área administrativa</p>
          <h1>Acesso do administrador</h1>
          <p>Digite o PIN para gerenciar o cardápio.</p>
          <form onSubmit={unlock}>
            <label htmlFor="admin-pin">PIN</label>
            <input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              required
            />
            {pinError && <p className="form-error" role="alert">{pinError}</p>}
            <button className="button button-primary full-width" type="submit">
              Entrar
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="back-link" href="/">← Voltar ao cardápio</a>
        <div>
          <p className="eyebrow">{settings.restaurantName}</p>
          <h1>Gerenciar cardápio</h1>
          <p className="admin-header-note">
            Tudo que você salvar aqui aparece para os clientes.
          </p>
        </div>
      </header>

      {notice && (
        <p
          className={notice.kind === "success" ? "inline-message" : "form-error"}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      )}

      {legacyInfo && !settings.legacyMigrationDone && (
        <section className="admin-section admin-migration">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Migração</p>
              <h2>Importar cardápio antigo</h2>
            </div>
          </div>
          <p className="settings-note">
            Encontramos dados do cardápio salvos neste navegador
            {legacyInfo.products > 0 ? ` (${legacyInfo.products} produto(s))` : ""}.
            Importe uma única vez para levar o cardápio atual para o Supabase. Produtos do
            cardápio padrão que não existirem no cardápio antigo serão removidos.
          </p>
          <div className="admin-product-actions migration-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => void importLegacy()}
              disabled={saving}
            >
              Importar cardápio antigo
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void ignoreLegacy()}
              disabled={saving}
            >
              Ignorar
            </button>
          </div>
        </section>
      )}

      <nav className="admin-tabs" aria-label="Seções do painel">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "admin-tab selected" : "admin-tab"}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "categorias" && (
        <>
          <section className="admin-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Categorias</p>
                <h2>{editingCategoryId ? "Editar categoria" : "Nova categoria"}</h2>
              </div>
              {editingCategoryId && (
                <button className="button button-secondary" type="button" onClick={resetCategoryForm}>
                  Cancelar edição
                </button>
              )}
            </div>
            <form className="admin-form" onSubmit={submitCategory}>
              <label>
                Nome
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Ex.: Sobremesas"
                  required
                />
              </label>
              <label>
                Tipo
                <select
                  value={categoryKind}
                  onChange={(event) => setCategoryKind(event.target.value as CategoryKind)}
                >
                  <option value="pizza">Pizza (aceita meio a meio e borda)</option>
                  <option value="simple">Produto simples (bebida, sobremesa…)</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={categoryActive}
                  onChange={(event) => setCategoryActive(event.target.checked)}
                />
                Categoria ativa no cardápio
              </label>
              <button className="button button-primary" type="submit" disabled={saving}>
                {editingCategoryId ? "Salvar alterações" : "Criar categoria"}
              </button>
            </form>
          </section>

          <section className="admin-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ordem do cardápio</p>
                <h2>Categorias cadastradas</h2>
              </div>
              <span className="product-count">{categories.length} categorias</span>
            </div>
            {sortedCategories.length === 0 ? (
              <p className="empty-state">Nenhuma categoria cadastrada.</p>
            ) : (
              <div className="admin-product-list">
                {sortedCategories.map((category, index) => (
                  <article className="admin-product-row" key={category.id}>
                    <div className="admin-product-info">
                      <strong>{category.name}</strong>
                      <span>
                        {category.kind === "pizza" ? "Pizza" : "Produto simples"} ·{" "}
                        {products.filter((product) => product.categoryId === category.id).length}{" "}
                        produto(s)
                      </span>
                      <span className={category.active ? "status status-active" : "status"}>
                        {category.active ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <div className="admin-product-actions">
                      <button
                        className="button button-secondary icon-action"
                        type="button"
                        aria-label={`Mover ${category.name} para cima`}
                        disabled={index === 0 || saving}
                        onClick={() => moveCategory(category, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className="button button-secondary icon-action"
                        type="button"
                        aria-label={`Mover ${category.name} para baixo`}
                        disabled={index === sortedCategories.length - 1 || saving}
                        onClick={() => moveCategory(category, 1)}
                      >
                        ↓
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => editCategory(category)}
                      >
                        Editar
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => toggleCategory(category)}
                        disabled={saving}
                      >
                        {category.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        className="button button-danger"
                        type="button"
                        onClick={() => removeCategory(category)}
                        disabled={saving}
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === "produtos" && (
        <>
          <section className="admin-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Produtos</p>
                <h2>{editingProductId ? "Editar produto" : "Novo produto"}</h2>
              </div>
              {editingProductId && (
                <button className="button button-secondary" type="button" onClick={resetProductForm}>
                  Cancelar edição
                </button>
              )}
            </div>
            {categories.length === 0 ? (
              <p className="empty-state">
                Crie uma categoria antes de cadastrar produtos.
              </p>
            ) : (
              <form className="admin-form" onSubmit={submitProduct}>
                <label>
                  Nome
                  <input
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Descrição
                  <textarea
                    rows={3}
                    value={productDescription}
                    onChange={(event) => setProductDescription(event.target.value)}
                  />
                </label>
                <label>
                  Categoria
                  <select
                    value={productCategoryId}
                    onChange={(event) => setProductCategoryId(event.target.value)}
                  >
                    {sortedCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {productIsPizza ? "Preço da pizza (R$)" : "Preço (R$)"}
                  <input
                    inputMode="decimal"
                    placeholder="Ex.: 39,90"
                    value={productPriceInput}
                    onChange={(event) => setProductPriceInput(event.target.value)}
                    required
                  />
                </label>
                <div className="admin-image-field">
                  <span className="field-label">Foto do produto</span>
                  {productImage ? (
                    <div className="admin-image-current">
                      <img className="admin-image-preview" src={productImage} alt="Prévia da foto" />
                      <button
                        className="button button-danger"
                        type="button"
                        onClick={() => setProductImage("")}
                        disabled={saving}
                      >
                        Remover foto
                      </button>
                    </div>
                  ) : (
                    <p className="settings-note">Nenhuma foto selecionada.</p>
                  )}
                  <label className="file-button">
                    {uploading ? "Enviando foto…" : productImage ? "Trocar foto" : "Adicionar foto"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) => void handleImageFile(event.target.files?.[0])}
                      disabled={uploading || saving}
                    />
                  </label>
                  <p className="settings-note">JPG, PNG, WEBP ou GIF, até 5 MB.</p>
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={productActive}
                    onChange={(event) => setProductActive(event.target.checked)}
                  />
                  Produto ativo e visível no cardápio
                </label>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={saving || uploading}
                >
                  {editingProductId ? "Salvar alterações" : "Criar produto"}
                </button>
              </form>
            )}
          </section>

          <section className="admin-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Cardápio</p>
                <h2>Produtos cadastrados</h2>
              </div>
              <span className="product-count">{products.length} produtos</span>
            </div>
            {products.length === 0 ? (
              <p className="empty-state">Nenhum produto cadastrado.</p>
            ) : (
              sortedCategories.map((category) => {
                const list = sortedProducts.filter(
                  (product) => product.categoryId === category.id,
                );
                if (!list.length) return null;
                return (
                  <div className="admin-product-group" key={category.id}>
                    <h3 className="subheading">{category.name}</h3>
                    <div className="admin-product-list">
                      {list.map((product, index) => (
                        <article className="admin-product-row" key={product.id}>
                          <div className="admin-product-info">
                            <strong>{product.name}</strong>
                            <span>
                              {formatCurrency(toCents(getProductPrice(product) ?? 0))} ·{" "}
                              {categoryName_byId.get(product.categoryId)}
                            </span>
                            <span className={product.available ? "status status-active" : "status"}>
                              {product.available ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          <div className="admin-product-actions">
                            <button
                              className="button button-secondary icon-action"
                              type="button"
                              aria-label={`Mover ${product.name} para cima`}
                              disabled={index === 0 || saving}
                              onClick={() => moveProduct(product, -1)}
                            >
                              ↑
                            </button>
                            <button
                              className="button button-secondary icon-action"
                              type="button"
                              aria-label={`Mover ${product.name} para baixo`}
                              disabled={index === list.length - 1 || saving}
                              onClick={() => moveProduct(product, 1)}
                            >
                              ↓
                            </button>
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => editProduct(product)}
                            >
                              Editar
                            </button>
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => toggleProduct(product)}
                              disabled={saving}
                            >
                              {product.available ? "Desativar" : "Ativar"}
                            </button>
                            <button
                              className="button button-danger"
                              type="button"
                              onClick={() => removeProduct(product)}
                              disabled={saving}
                            >
                              Remover
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </>
      )}

      {tab === "bordas" && (
        <>
          <section className="admin-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Bordas</p>
                <h2>{editingCrustId ? "Editar borda" : "Nova borda"}</h2>
              </div>
              {editingCrustId && (
                <button className="button button-secondary" type="button" onClick={resetCrustForm}>
                  Cancelar edição
                </button>
              )}
            </div>
            <form className="admin-form" onSubmit={submitCrust}>
              <label>
                Nome da borda
                <input
                  value={crustName}
                  onChange={(event) => setCrustName(event.target.value)}
                  placeholder="Ex.: Catupiry"
                  required
                />
              </label>
              <label>
                Preço (R$)
                <input
                  inputMode="decimal"
                  value={crustPriceInput}
                  onChange={(event) => setCrustPriceInput(event.target.value)}
                  placeholder="Ex.: 8,00"
                  required
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={crustActive}
                  onChange={(event) => setCrustActive(event.target.checked)}
                />
                Borda ativa no cardápio
              </label>
              <button className="button button-primary" type="submit" disabled={saving}>
                {editingCrustId ? "Salvar alterações" : "Criar borda"}
              </button>
            </form>
          </section>

          <section className="admin-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recheios</p>
                <h2>Bordas cadastradas</h2>
              </div>
              <span className="product-count">{crusts.length} bordas</span>
            </div>
            <div className="crust-list">
              {crusts.map((crust) => (
                <div className="crust-row" key={crust.id}>
                  <span>
                    {crust.name}
                    {crust.id !== "sem" && (
                      <small className={crust.active ? "status-active" : ""}>
                        {crust.active ? " · ativa" : " · inativa"}
                      </small>
                    )}
                  </span>
                  <strong>{crust.price > 0 ? formatCurrency(toCents(crust.price)) : "Grátis"}</strong>
                  {crust.id === "sem" ? (
                    <span className="settings-note">Obrigatória</span>
                  ) : (
                    <div className="crust-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => editCrust(crust)}
                      >
                        Editar
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => toggleCrust(crust)}
                        disabled={saving}
                      >
                        {crust.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        className="button button-danger"
                        type="button"
                        onClick={() => removeCrust(crust)}
                        disabled={saving}
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === "configuracoes" && (
        <section className="admin-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Configurações</p>
              <h2>Dados da pizzaria</h2>
            </div>
          </div>
          <form className="admin-form settings-form" onSubmit={submitSettings}>
            <label>
              Nome da pizzaria
              <input
                value={restaurantName}
                onChange={(event) => setRestaurantName(event.target.value)}
                required
              />
            </label>
            <label>
              WhatsApp (com DDI e DDD, somente números)
              <input
                inputMode="tel"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="5598987020320"
                required
              />
            </label>
            <label>
              Taxa de entrega (R$)
              <input
                inputMode="decimal"
                value={deliveryFeeInput}
                onChange={(event) => setDeliveryFeeInput(event.target.value)}
                required
              />
            </label>
            <label>
              Chave PIX
              <input
                value={pixKey}
                onChange={(event) => setPixKey(event.target.value)}
                placeholder="Telefone, CPF ou E-mail"
              />
            </label>
            <label>
              PIN do admin
              <input
                inputMode="numeric"
                value={adminPin}
                onChange={(event) => setAdminPin(event.target.value)}
                required
              />
            </label>
            <button className="button button-primary" type="submit" disabled={saving}>
              Salvar configurações
            </button>
          </form>
        </section>
      )}

      <footer className="admin-footer">As alterações são salvas no Supabase.</footer>
    </main>
  );
}
