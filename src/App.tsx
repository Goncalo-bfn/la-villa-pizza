import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminPage from "./AdminPage";
import { defaultSettings, loadCatalog } from "./api";
import {
  fallbackCrust,
  formatCurrency,
  getCrustPrice,
  getProductPrice,
  toCents,
  createId,
} from "./catalog";
import { FALLBACK_RESTAURANT_NAME, FALLBACK_WHATSAPP_PHONE } from "./config";
import { isSupabaseConfigured, supabase } from "./supabase";
import { useStoredState } from "./storage";
import type { CartItem, CatalogData, MenuProduct } from "./types";

type Fulfillment = "entrega" | "retirada";

interface CheckoutDetails {
  name: string;
  phone: string;
  fulfillment: Fulfillment;
  address: string;
  reference: string;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function App() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [loadError, setLoadError] = useState("");
  const [storageError, setStorageError] = useState("");
  const reportStorageError = useCallback((message: string) => setStorageError(message), []);
  const [cart, setCart] = useStoredState<CartItem[]>(
    "la-villa.cart.v1",
    [],
    reportStorageError,
  );
  const [activeCategory, setActiveCategory] = useState("todos");
  const [selectedCrust, setSelectedCrust] = useState("sem");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [details, setDetails] = useState<CheckoutDetails>({
    name: "",
    phone: "",
    fulfillment: "entrega",
    address: "",
    reference: "",
  });
  const isAdminPage = window.location.pathname.replace(/\/+$/, "") === "/admin";

  const refreshCatalog = useCallback(async (silent = false) => {
    if (!isSupabaseConfigured) return;
    try {
      const data = await loadCatalog();
      setCatalog(data);
      setLoadError("");
    } catch (error) {
      if (!silent) {
        setLoadError(errorMessage(error, "Não foi possível carregar o cardápio."));
      }
      throw error;
    }
  }, []);

  const retryLoad = useCallback(() => {
    setLoading(true);
    setLoadError("");
    refreshCatalog()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshCatalog]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    loadCatalog()
      .then((data) => {
        if (!active) return;
        setCatalog(data);
        setLoadError("");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(errorMessage(error, "Não foi possível carregar o cardápio."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const realtimeTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client.channel("catalog-live");
    const scheduleRefresh = () => {
      if (realtimeTimer.current) window.clearTimeout(realtimeTimer.current);
      realtimeTimer.current = window.setTimeout(() => {
        refreshCatalog(true).catch(() => {});
      }, 150);
    };
    (["categories", "products", "crusts", "settings"] as const).forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    });
    channel.subscribe();
    return () => {
      if (realtimeTimer.current) window.clearTimeout(realtimeTimer.current);
      client.removeChannel(channel);
    };
  }, [refreshCatalog]);

  const settings = catalog?.settings ?? defaultSettings();
  const categories = catalog?.categories ?? [];
  const products = catalog?.products ?? [];
  const crusts = catalog?.crusts ?? [fallbackCrust];

  const activeCategories = useMemo(
    () => categories.filter((category) => category.active),
    [categories],
  );
  const activeCategoryIds = useMemo(
    () => new Set(activeCategories.map((category) => category.id)),
    [activeCategories],
  );
  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.available &&
          activeCategoryIds.has(product.categoryId) &&
          (activeCategory === "todos" || product.categoryId === activeCategory),
      ),
    [activeCategory, activeCategoryIds, products],
  );
  const usableCrusts = useMemo(() => {
    const active = crusts.filter((crust) => crust.active || crust.id === "sem");
    return active.length ? active : [fallbackCrust];
  }, [crusts]);

  useEffect(() => {
    if (activeCategory !== "todos" && !activeCategories.some((item) => item.id === activeCategory)) {
      setActiveCategory("todos");
    }
  }, [activeCategory, activeCategories]);

  const selectedCrustOption =
    usableCrusts.find((crust) => crust.id === selectedCrust) ?? usableCrusts[0];
  const restaurantName = settings.restaurantName || FALLBACK_RESTAURANT_NAME;
  const whatsappNumber = (settings.whatsappNumber || FALLBACK_WHATSAPP_PHONE).replace(/\D/g, "");
  const platformFeeCents = toCents(settings.platformFee);
  const deliveryFeeCents =
    details.fulfillment === "entrega" ? toCents(settings.deliveryFee) : 0;

  const subtotalCents = cart.reduce(
    (total, item) => total + item.unitPriceCents * item.qty,
    0,
  );
  const totalCents = subtotalCents + deliveryFeeCents + platformFeeCents;
  const incompletePizza = cart.some((item) => item.halves?.length === 1);
  const cartCount = cart.reduce((total, item) => total + item.qty, 0);

  function addWholeProduct(product: MenuProduct) {
    const rawPrice = getProductPrice(product);
    if (rawPrice === undefined || rawPrice <= 0) return;
    const basePriceCents = toCents(rawPrice);
    const isPizza = categories.find((category) => category.id === product.categoryId)?.kind === "pizza";
    const crust = isPizza
      ? usableCrusts.find((item) => item.id === selectedCrustOption.id) ?? usableCrusts[0]
      : fallbackCrust;
    const crustPriceCents = isPizza ? toCents(getCrustPrice(usableCrusts, crust.id)) : 0;
    const newItem: CartItem = {
      id: createId(),
      productId: product.id,
      name: product.name,
      qty: 1,
      sizeId: "unico",
      sizeName: "Único",
      bordaId: crust.id,
      bordaName: crust.name,
      bordaPriceCents: crustPriceCents,
      basePriceCents,
      unitPriceCents: basePriceCents + crustPriceCents,
    };
    setCart((current) => {
      const existing = current.find(
        (item) =>
          !item.halves &&
          item.productId === newItem.productId &&
          item.bordaId === newItem.bordaId,
      );
      return existing
        ? current.map((item) =>
            item.id === existing.id ? { ...item, qty: item.qty + 1 } : item,
          )
        : [...current, newItem];
    });
  }

  function addHalfProduct(product: MenuProduct) {
    const rawPrice = getProductPrice(product);
    if (rawPrice === undefined || rawPrice <= 0) return;
    const priceCents = toCents(rawPrice);
    const crust =
      usableCrusts.find((item) => item.id === selectedCrustOption.id) ?? usableCrusts[0];
    const crustPriceCents = toCents(getCrustPrice(usableCrusts, crust.id));

    setCart((current) => {
      const waitingIndex = current.findIndex(
        (item) =>
          item.halves?.length === 1 &&
          item.sizeId === "unico" &&
          item.bordaId === crust.id,
      );
      const secondHalf = { productId: product.id, name: product.name, priceCents };
      if (waitingIndex >= 0) {
        const waitingItem = current[waitingIndex];
        const halves = [...(waitingItem.halves ?? []), secondHalf];
        const basePriceCents = Math.max(...halves.map((half) => half.priceCents));
        const merged: CartItem = {
          ...waitingItem,
          name: "Pizza Meio a Meio",
          halves,
          basePriceCents,
          unitPriceCents: basePriceCents + waitingItem.bordaPriceCents,
        };
        return current.map((item, index) => (index === waitingIndex ? merged : item));
      }

      return [
        ...current,
        {
          id: createId(),
          productId: product.id,
          name: `Meia pizza • ${product.name}`,
          qty: 1,
          sizeId: "unico",
          sizeName: "Único",
          bordaId: crust.id,
          bordaName: crust.name,
          bordaPriceCents: crustPriceCents,
          basePriceCents: priceCents,
          unitPriceCents: priceCents + crustPriceCents,
          halves: [{ productId: product.id, name: product.name, priceCents }],
        },
      ];
    });
  }

  function changeQuantity(item: CartItem, delta: number) {
    setCart((current) =>
      current.flatMap((cartItem) => {
        if (cartItem.id !== item.id) return [cartItem];
        const qty = cartItem.qty + delta;
        return qty > 0 ? [{ ...cartItem, qty }] : [];
      }),
    );
  }

  function removeItem(item: CartItem) {
    setCart((current) => current.filter((cartItem) => cartItem.id !== item.id));
  }

  function sendOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError("");
    if (incompletePizza) {
      setCheckoutError("Escolha o segundo sabor da pizza meio a meio antes de continuar.");
      return;
    }
    if (!cart.length) {
      setCheckoutError("Adicione pelo menos um produto ao pedido.");
      return;
    }

    const lines = [
      `*Pedido — ${restaurantName}*`,
      "",
      ...cart.flatMap((item) => {
        const flavors = item.halves?.length === 2
          ? `\n   ½ ${item.halves[0].name}\n   ½ ${item.halves[1].name}`
          : item.halves?.length === 1
            ? `\n   ½ ${item.halves[0].name} (falta escolher a outra metade)`
            : [];
        return [
          `• ${item.qty}x ${item.name}${flavors}`,
          ...(item.bordaId !== "sem" ? [`   Borda: ${item.bordaName}`] : []),
          `   ${formatCurrency(item.unitPriceCents * item.qty)}`,
        ];
      }),
      "",
      `Subtotal: ${formatCurrency(subtotalCents)}`,
      ...(details.fulfillment === "entrega"
        ? [`Taxa de entrega: ${formatCurrency(deliveryFeeCents)}`]
        : []),
      `Taxa da plataforma: ${formatCurrency(platformFeeCents)}`,
      `*Total: ${formatCurrency(totalCents)}*`,
      "",
      `*Cliente:* ${details.name.trim()}`,
      `*Telefone:* ${details.phone.trim()}`,
      ...(details.fulfillment === "entrega"
        ? [
            `*Entrega:* ${details.address.trim()}`,
            ...(details.reference.trim() ? [`*Referência:* ${details.reference.trim()}`] : []),
          ]
        : ["*Retirada no local*"]),
    ];
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="status-screen">
        <section className="status-card">
          <p className="eyebrow">Configuração necessária</p>
          <h1>Supabase não configurado</h1>
          <p>
            Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> nas
            variáveis de ambiente e execute o arquivo <code>supabase/schema.sql</code> no
            Supabase.
          </p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="status-screen">
        <p className="status-text" role="status">Carregando cardápio…</p>
      </main>
    );
  }

  if (loadError && !catalog) {
    return (
      <main className="status-screen">
        <section className="status-card">
          <p className="eyebrow">Não foi possível carregar</p>
          <h1>Cardápio indisponível</h1>
          <p role="alert">{loadError}</p>
          <button className="button button-primary" type="button" onClick={retryLoad}>
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  if (isAdminPage && catalog) {
    return <AdminPage catalog={catalog} onRefresh={refreshCatalog} />;
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label={`${restaurantName}, início`}>
          <img src="/images/la-villa-logo.jpg" alt="" />
          <span>
            <strong>{restaurantName}</strong>
            <small>O sabor que conquista</small>
          </span>
        </a>
        <button className="header-cart-link" type="button" onClick={() => setCartOpen(true)}>
          Meu pedido <span className="cart-count">{cartCount}</span>
        </button>
      </header>

      {storageError && <p className="storage-warning" role="alert">{storageError}</p>}

      <main>
        <section className="hero">
          <img className="hero-image" src="/images/hero-forno.jpg" alt="Pizza assando no forno a lenha" />
          <div className="hero-shade" />
          <div className="hero-copy">
            <p className="eyebrow">Feita com carinho, do nosso forno para você</p>
            <h1>Uma pizza especial deixa qualquer momento melhor.</h1>
            <a className="button button-primary" href="#cardapio">Ver cardápio</a>
          </div>
        </section>

        <section className="menu-section" id="cardapio">
          <div className="menu-heading">
            <p className="eyebrow">Escolha seus sabores</p>
            <h2>Nosso cardápio</h2>
            <p>Monte seu pedido e envie direto pelo WhatsApp.</p>
          </div>

          <nav className="category-nav" aria-label="Categorias do cardápio">
            <button
              className={activeCategory === "todos" ? "category-chip selected" : "category-chip"}
              type="button"
              onClick={() => setActiveCategory("todos")}
            >
              Todos
            </button>
            {activeCategories.map((category) => (
              <button
                className={activeCategory === category.id ? "category-chip selected" : "category-chip"}
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </nav>

          <div className="crust-picker">
            <label htmlFor="crust-choice">Borda da pizza</label>
            <select
              id="crust-choice"
              value={selectedCrustOption.id}
              onChange={(event) => setSelectedCrust(event.target.value)}
            >
              {usableCrusts.map((crust) => (
                <option key={crust.id} value={crust.id}>
                  {crust.name}{crust.price > 0 ? ` (+${formatCurrency(toCents(crust.price))})` : ""}
                </option>
              ))}
            </select>
          </div>

          {visibleProducts.length === 0 ? (
            <p className="empty-menu">
              Nenhum produto disponível nesta categoria no momento.
            </p>
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product) => {
                const price = getProductPrice(product);
                const isPizza = categories.find((category) => category.id === product.categoryId)?.kind === "pizza";
                return (
                  <article className="product-card" key={product.id}>
                    {product.image ? (
                      <img className="product-image" src={product.image} alt={product.name} loading="lazy" />
                    ) : (
                      <div className="product-image image-empty" aria-hidden="true">La Villa</div>
                    )}
                    <div className="product-content">
                      <h3>{product.name}</h3>
                      {product.description && <p>{product.description}</p>}
                      <strong className="product-price">
                        {price === undefined ? "Preço sob consulta" : formatCurrency(toCents(price))}
                      </strong>
                      <div className="product-actions">
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={price === undefined || price <= 0}
                          onClick={() => addWholeProduct(product)}
                        >
                          Adicionar
                        </button>
                        {isPizza && (
                          <button
                            className="button button-secondary"
                            type="button"
                            disabled={price === undefined || price <= 0}
                            onClick={() => addHalfProduct(product)}
                          >
                            ½ sabor
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p>{restaurantName} · O sabor que conquista</p>
        <a href="/admin">Área administrativa</a>
      </footer>

      {cartCount > 0 && !cartOpen && (
        <button className="cart-bar" type="button" onClick={() => setCartOpen(true)}>
          <span>Ver pedido · {cartCount} {cartCount === 1 ? "item" : "itens"}</span>
          <strong>{formatCurrency(totalCents)}</strong>
        </button>
      )}

      {cartOpen && (
        <div className="modal-backdrop" onMouseDown={() => setCartOpen(false)}>
          <section
            className="cart-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Seu pedido</p>
                <h2 id="cart-title">Carrinho</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Fechar carrinho" onClick={() => setCartOpen(false)}>×</button>
            </div>
            {cart.length === 0 ? (
              <p className="empty-state">Seu carrinho está vazio.</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <article className="cart-item" key={item.id}>
                      <div className="cart-item-details">
                        <strong>{item.name}</strong>
                        {item.halves?.length === 1 && (
                          <span className="missing-half">Falta escolher a segunda metade</span>
                        )}
                        {item.halves?.length === 2 && (
                          <span>½ {item.halves[0].name} + ½ {item.halves[1].name}</span>
                        )}
                        {item.bordaId !== "sem" && <span>Borda: {item.bordaName}</span>}
                        <span>{formatCurrency(item.unitPriceCents)} cada</span>
                      </div>
                      <div className="cart-item-actions">
                        <div className="quantity-control">
                          <button type="button" aria-label={`Diminuir ${item.name}`} onClick={() => changeQuantity(item, -1)}>−</button>
                          <span>{item.qty}</span>
                          <button
                            type="button"
                            aria-label={`Aumentar ${item.name}`}
                            disabled={item.halves?.length === 1}
                            onClick={() => changeQuantity(item, 1)}
                          >
                            +
                          </button>
                        </div>
                        <button className="text-button" type="button" onClick={() => removeItem(item)}>Remover</button>
                      </div>
                    </article>
                  ))}
                </div>
                {incompletePizza && (
                  <p className="cart-warning" role="alert">
                    Escolha o segundo sabor da pizza meio a meio para continuar.
                  </p>
                )}
                <div className="totals">
                  <div><span>Subtotal</span><strong>{formatCurrency(subtotalCents)}</strong></div>
                  <div><span>Taxa de entrega</span><strong>{formatCurrency(deliveryFeeCents)}</strong></div>
                  <div><span>Taxa da plataforma</span><strong>{formatCurrency(platformFeeCents)}</strong></div>
                  <div className="grand-total"><span>Total</span><strong>{formatCurrency(totalCents)}</strong></div>
                </div>
                <button
                  className="button button-primary full-width"
                  type="button"
                  disabled={incompletePizza || cart.length === 0}
                  onClick={() => {
                    setCheckoutError("");
                    setCheckoutOpen(true);
                  }}
                >
                  Continuar para o pedido
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {checkoutOpen && (
        <div className="modal-backdrop" onMouseDown={() => setCheckoutOpen(false)}>
          <section
            className="checkout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Só mais um passo</p>
                <h2 id="checkout-title">Enviar pelo WhatsApp</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setCheckoutOpen(false)}>×</button>
            </div>
            <form className="checkout-form" onSubmit={sendOrder}>
              <label>
                Seu nome
                <input
                  autoComplete="name"
                  value={details.name}
                  onChange={(event) => setDetails({ ...details, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Telefone
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={details.phone}
                  onChange={(event) => setDetails({ ...details, phone: event.target.value })}
                  required
                />
              </label>
              <fieldset>
                <legend>Como prefere receber?</legend>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="fulfillment"
                    value="entrega"
                    checked={details.fulfillment === "entrega"}
                    onChange={() => setDetails({ ...details, fulfillment: "entrega" })}
                  />
                  Entrega
                </label>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="fulfillment"
                    value="retirada"
                    checked={details.fulfillment === "retirada"}
                    onChange={() => setDetails({ ...details, fulfillment: "retirada" })}
                  />
                  Retirada no local
                </label>
              </fieldset>
              {details.fulfillment === "entrega" && (
                <>
                  <label>
                    Endereço de entrega
                    <input
                      autoComplete="street-address"
                      value={details.address}
                      onChange={(event) => setDetails({ ...details, address: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Ponto de referência (opcional)
                    <input
                      value={details.reference}
                      onChange={(event) => setDetails({ ...details, reference: event.target.value })}
                    />
                  </label>
                </>
              )}
              {checkoutError && <p className="form-error" role="alert">{checkoutError}</p>}
              <div className="checkout-total">
                <span>Total do pedido</span>
                <strong>{formatCurrency(totalCents)}</strong>
              </div>
              <button className="button button-primary full-width" type="submit">
                Abrir conversa no WhatsApp
              </button>
              <p className="checkout-note">O pedido será enviado para confirmação pela pizzaria.</p>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
