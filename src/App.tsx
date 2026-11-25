import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminPage from "./AdminPage";
import { defaultSettings, loadCatalog } from "./api";
import {
  fallbackCrust,
  formatCurrency,
  getCrustPrice,
  getProductPrice,
  isBeverageCategory,
  parsePrice,
  toCents,
  createId,
} from "./catalog";
import { FALLBACK_RESTAURANT_NAME, FALLBACK_WHATSAPP_PHONE } from "./config";
import { isSupabaseConfigured, supabase } from "./supabase";
import { useStoredState } from "./storage";
import type {
  CardType,
  CartItem,
  CatalogData,
  CrustOption,
  MenuProduct,
  NeedsChange,
  PaymentMethod,
  PizzaHalf,
} from "./types";

type Fulfillment = "entrega" | "retirada";

interface CheckoutDetails {
  name: string;
  phone: string;
  fulfillment: Fulfillment;
  address: string;
  reference: string;
  paymentMethod: PaymentMethod | "";
  cardType: CardType | "";
  needsChange: NeedsChange;
  changeFor: string;
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
  const [configuringPizza, setConfiguringPizza] = useState<{
    type: "whole";
    product: MenuProduct;
    selectedCrustId: string;
  } | {
    type: "half";
    waitingIndex: number;
    firstHalf: PizzaHalf;
    secondProduct: MenuProduct;
    selectedCrustId: string;
  } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [details, setDetails] = useState<CheckoutDetails>({
    name: "",
    phone: "",
    fulfillment: "entrega",
    address: "",
    reference: "",
    paymentMethod: "",
    cardType: "",
    needsChange: "nao",
    changeFor: "",
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

  const foodCategories = useMemo(
    () => activeCategories.filter((category) => !isBeverageCategory(category)),
    [activeCategories],
  );
  const beverageCategories = useMemo(
    () => activeCategories.filter((category) => isBeverageCategory(category)),
    [activeCategories],
  );
  const beverageCategoryIds = useMemo(
    () => new Set(beverageCategories.map((category) => category.id)),
    [beverageCategories],
  );

  const foodProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.available &&
          activeCategoryIds.has(product.categoryId) &&
          !beverageCategoryIds.has(product.categoryId) &&
          (activeCategory === "todos" || product.categoryId === activeCategory),
      ),
    [activeCategory, activeCategoryIds, beverageCategoryIds, products],
  );

  const beverageProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.available &&
          activeCategoryIds.has(product.categoryId) &&
          beverageCategoryIds.has(product.categoryId),
      ),
    [activeCategoryIds, beverageCategoryIds, products],
  );

  const usableCrusts = useMemo(() => {
    const active = crusts.filter((crust) => crust.active || crust.id === "sem");
    return active.length ? active : [fallbackCrust];
  }, [crusts]);

  useEffect(() => {
    if (
      activeCategory !== "todos" &&
      !foodCategories.some((item) => item.id === activeCategory)
    ) {
      setActiveCategory("todos");
    }
  }, [activeCategory, foodCategories]);

  const scrollToBeverages = useCallback(() => {
    const element = document.getElementById("bebidas");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const isPizzaItem = useCallback(
    (item: CartItem) => {
      if (item.halves && item.halves.length > 0) return true;
      const product = products.find((p) => p.id === item.productId);
      if (!product) return false;
      const category = categories.find((c) => c.id === product.categoryId);
      return category?.kind === "pizza";
    },
    [categories, products],
  );

  const restaurantName = settings.restaurantName || FALLBACK_RESTAURANT_NAME;
  const whatsappNumber = (settings.whatsappNumber || FALLBACK_WHATSAPP_PHONE).replace(/\D/g, "");
  const deliveryFeeCents =
    details.fulfillment === "entrega" ? toCents(settings.deliveryFee) : 0;

  const subtotalCents = cart.reduce(
    (total, item) => total + item.unitPriceCents * item.qty,
    0,
  );
  const totalCents = subtotalCents + deliveryFeeCents;
  const incompletePizza = cart.some((item) => item.halves?.length === 1);
  const cartCount = cart.reduce((total, item) => total + item.qty, 0);

  function addWholeProduct(product: MenuProduct, crust: CrustOption) {
    const rawPrice = getProductPrice(product);
    if (rawPrice === undefined || rawPrice <= 0) return;
    const basePriceCents = toCents(rawPrice);
    const isPizza = categories.find((category) => category.id === product.categoryId)?.kind === "pizza";
    const appliedCrust = isPizza ? crust : fallbackCrust;
    const crustPriceCents = isPizza ? toCents(getCrustPrice(usableCrusts, appliedCrust.id)) : 0;
    const newItem: CartItem = {
      id: createId(),
      productId: product.id,
      name: product.name,
      qty: 1,
      sizeId: "unico",
      sizeName: "Único",
      bordaId: appliedCrust.id,
      bordaName: appliedCrust.name,
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

  function addFirstHalf(product: MenuProduct) {
    const rawPrice = getProductPrice(product);
    if (rawPrice === undefined || rawPrice <= 0) return;
    const priceCents = toCents(rawPrice);
    setCart((current) => [
      ...current,
      {
        id: createId(),
        productId: product.id,
        name: `Meia pizza • ${product.name}`,
        qty: 1,
        sizeId: "unico",
        sizeName: "Único",
        bordaId: fallbackCrust.id,
        bordaName: fallbackCrust.name,
        bordaPriceCents: 0,
        basePriceCents: priceCents,
        unitPriceCents: priceCents,
        halves: [{ productId: product.id, name: product.name, priceCents }],
      },
    ]);
  }

  function completeHalfPizza(
    waitingIndex: number,
    firstHalf: PizzaHalf,
    secondProduct: MenuProduct,
    crust: CrustOption,
  ) {
    const rawPrice = getProductPrice(secondProduct);
    if (rawPrice === undefined || rawPrice <= 0) return;
    const secondHalfPriceCents = toCents(rawPrice);
    const secondHalf = {
      productId: secondProduct.id,
      name: secondProduct.name,
      priceCents: secondHalfPriceCents,
    };
    const halves = [firstHalf, secondHalf];
    const basePriceCents = Math.max(...halves.map((half) => half.priceCents));
    const crustPriceCents = toCents(getCrustPrice(usableCrusts, crust.id));

    setCart((current) => {
      const waitingItem = current[waitingIndex];
      if (!waitingItem) return current;
      const merged: CartItem = {
        ...waitingItem,
        name: "Pizza Meio a Meio",
        halves,
        bordaId: crust.id,
        bordaName: crust.name,
        bordaPriceCents: crustPriceCents,
        basePriceCents,
        unitPriceCents: basePriceCents + crustPriceCents,
      };
      return current.map((item, index) => (index === waitingIndex ? merged : item));
    });
  }

  function changeItemCrust(item: CartItem, crustId: string) {
    const crust = usableCrusts.find((c) => c.id === crustId) ?? fallbackCrust;
    const crustPriceCents = toCents(getCrustPrice(usableCrusts, crust.id));
    setCart((current) =>
      current.map((cartItem) => {
        if (cartItem.id !== item.id) return cartItem;
        return {
          ...cartItem,
          bordaId: crust.id,
          bordaName: crust.name,
          bordaPriceCents: crustPriceCents,
          unitPriceCents: cartItem.basePriceCents + crustPriceCents,
        };
      }),
    );
  }

  function handleAddProduct(product: MenuProduct) {
    const isPizza = categories.find((c) => c.id === product.categoryId)?.kind === "pizza";
    if (isPizza) {
      setConfiguringPizza({
        type: "whole",
        product,
        selectedCrustId: "sem",
      });
    } else {
      addWholeProduct(product, fallbackCrust);
    }
  }

  function handleAddHalf(product: MenuProduct) {
    const waitingIndex = cart.findIndex((item) => item.halves?.length === 1);
    if (waitingIndex >= 0) {
      const waitingItem = cart[waitingIndex];
      const firstHalf = waitingItem.halves![0];
      setConfiguringPizza({
        type: "half",
        waitingIndex,
        firstHalf,
        secondProduct: product,
        selectedCrustId: waitingItem.bordaId || "sem",
      });
    } else {
      addFirstHalf(product);
    }
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

  function handleClearCart() {
    setCart([]);
    setCheckoutError("");
    setConfirmClearOpen(false);
    setCartOpen(false);
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
    if (!details.name.trim()) {
      setCheckoutError("Informe seu nome.");
      return;
    }
    if (!details.phone.trim()) {
      setCheckoutError("Informe seu telefone.");
      return;
    }
    if (details.fulfillment === "entrega" && !details.address.trim()) {
      setCheckoutError("Informe o endereço de entrega.");
      return;
    }
    if (!details.paymentMethod) {
      setCheckoutError("Selecione uma forma de pagamento.");
      return;
    }
    if (details.paymentMethod === "cartao" && !details.cardType) {
      setCheckoutError("Selecione o tipo de cartão (Débito ou Crédito).");
      return;
    }
    if (details.paymentMethod === "dinheiro" && details.needsChange === "sim") {
      if (!details.changeFor.trim()) {
        setCheckoutError("Informe o valor para troco.");
        return;
      }
      const changeNum = parsePrice(details.changeFor.replace(/[^\d.,]/g, ""));
      if (changeNum === undefined || changeNum <= 0) {
        setCheckoutError("Informe um valor válido para troco.");
        return;
      }
    }

    let paymentLines: string[] = [];
    if (details.paymentMethod === "pix") {
      paymentLines = ["Pagamento: PIX"];
    } else if (details.paymentMethod === "cartao") {
      paymentLines = [
        `Pagamento: Cartão de ${details.cardType === "credito" ? "Crédito" : "Débito"}`,
      ];
    } else if (details.paymentMethod === "dinheiro") {
      paymentLines = ["Pagamento: Dinheiro"];
      if (details.needsChange === "sim") {
        const changeNum = parsePrice(details.changeFor.replace(/[^\d.,]/g, ""));
        const formattedChange =
          changeNum !== undefined
            ? formatCurrency(toCents(changeNum))
            : details.changeFor.trim();
        paymentLines.push(`Troco para: ${formattedChange}`);
      } else {
        paymentLines.push("Sem necessidade de troco");
      }
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
      ...(details.fulfillment === "entrega" && deliveryFeeCents > 0
        ? [`Taxa de entrega: ${formatCurrency(deliveryFeeCents)}`]
        : []),
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
      "",
      ...paymentLines,
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
            <small>Forno a lenha</small>
          </span>
        </a>
        <button className="header-cart-link" type="button" onClick={() => setCartOpen(true)}>
          Meu pedido <span className="cart-count">{cartCount}</span>
        </button>
      </header>

      {storageError && <p className="storage-warning" role="alert">{storageError}</p>}

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <img
            className="hero-image"
            src="/images/hero-forno.jpg"
            alt="Pizza assando no forno a lenha"
            fetchPriority="high"
          />
          <div className="hero-shade" />
          <div className="hero-copy">
            <p className="eyebrow">Forno a lenha · Entrega e retirada</p>
            <h1 id="hero-title">Pizzas de forno a lenha</h1>
            <p className="hero-description">
              Monte sua pizza, escolha a borda e envie o pedido pelo WhatsApp.
            </p>
            <div className="hero-actions">
              <a className="button button-primary hero-cta" href="#cardapio">
                Ver cardápio
              </a>
            </div>
          </div>
        </section>

        <section className="menu-section" id="cardapio">
          <div className="menu-heading">
            <h2>Cardápio</h2>
            <p>Pizzas, bebidas e bordas. Pedidos pelo WhatsApp.</p>
          </div>

          <nav className="category-nav" aria-label="Categorias do cardápio">
            <button
              className={activeCategory === "todos" ? "category-chip selected" : "category-chip"}
              type="button"
              onClick={() => setActiveCategory("todos")}
            >
              Todos
            </button>
            {foodCategories.map((category) => (
              <button
                className={activeCategory === category.id ? "category-chip selected" : "category-chip"}
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
            {beverageProducts.length > 0 && beverageCategories.map((category) => (
              <button
                className="category-chip category-chip-beverage"
                key={category.id}
                type="button"
                onClick={scrollToBeverages}
              >
                {category.name.includes("🥤") ? category.name : `🥤 ${category.name}`}
              </button>
            ))}
          </nav>

          {foodProducts.length === 0 ? (
            <p className="empty-menu">
              Nenhum produto disponível nesta categoria no momento.
            </p>
          ) : (
            <div className="product-grid">
              {foodProducts.map((product) => {
                const price = getProductPrice(product);
                const isPizza = categories.find((category) => category.id === product.categoryId)?.kind === "pizza";
                return (
                  <article className="product-card" key={product.id}>
                    {product.image ? (
                      <div className="product-media">
                        <img
                          className="product-image"
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : (
                      <div className="product-media">
                        <div className="product-image image-empty" aria-hidden="true">La Villa</div>
                      </div>
                    )}
                    <div className="product-content">
                      <h3>{product.name}</h3>
                      {product.description && <p>{product.description}</p>}
                      <strong className="product-price">
                        {price === undefined ? "Preço sob consulta" : formatCurrency(toCents(price))}
                      </strong>
                      <div className={isPizza ? "product-actions product-actions-pizza" : "product-actions"}>
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={price === undefined || price <= 0}
                          onClick={() => handleAddProduct(product)}
                        >
                          <span className="add-icon" aria-hidden="true">+</span>
                          Adicionar
                        </button>
                        {isPizza && (
                          <button
                            className="button button-secondary"
                            type="button"
                            disabled={price === undefined || price <= 0}
                            onClick={() => handleAddHalf(product)}
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

          {beverageProducts.length > 0 && (
            <section className="beverages-section" id="bebidas" aria-labelledby="beverages-heading">
              <div className="beverages-divider">
                <h3 id="beverages-heading" className="beverages-title">
                  Bebidas
                </h3>
              </div>

              <div className="product-grid beverages-grid">
                {beverageProducts.map((product) => {
                  const price = getProductPrice(product);
                  return (
                    <article className="product-card beverage-card" key={product.id}>
                      {product.image ? (
                        <div className="product-media">
                          <img
                            className="product-image"
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : (
                        <div className="product-media">
                          <div className="product-image image-empty beverage-image-empty" aria-hidden="true">
                            🥤
                          </div>
                        </div>
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
                            onClick={() => handleAddProduct(product)}
                          >
                            <span className="add-icon" aria-hidden="true">+</span>
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="/" aria-label={`${restaurantName}, início`}>
          <img src="/images/la-villa-logo.jpg" alt="" loading="lazy" />
          <span>
            <strong>{restaurantName}</strong>
            <small>Forno a lenha</small>
          </span>
        </a>
        <a className="footer-menu-link" href="#cardapio">Ver cardápio</a>
        <p className="footer-note">Pedidos pelo WhatsApp</p>
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
                        {isPizzaItem(item) && item.halves?.length !== 1 && usableCrusts.length > 1 ? (
                          <div className="cart-item-crust">
                            <label htmlFor={`cart-crust-${item.id}`}>Borda:</label>
                            <select
                              id={`cart-crust-${item.id}`}
                              value={item.bordaId}
                              onChange={(e) => changeItemCrust(item, e.target.value)}
                            >
                              {usableCrusts.map((crust) => (
                                <option key={crust.id} value={crust.id}>
                                  {crust.name}{crust.price > 0 ? ` (+${formatCurrency(toCents(crust.price))})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          item.bordaId !== "sem" && <span>Borda: {item.bordaName}</span>
                        )}
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
                  {deliveryFeeCents > 0 && (
                    <div><span>Taxa de entrega</span><strong>{formatCurrency(deliveryFeeCents)}</strong></div>
                  )}
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
                <button
                  className="clear-cart-button"
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                >
                  🗑️ Limpar Carrinho
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
                <h2 id="checkout-title">Finalizar Pedido</h2>
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
              <fieldset>
                <legend>Forma de pagamento</legend>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pix"
                    checked={details.paymentMethod === "pix"}
                    onChange={() =>
                      setDetails({
                        ...details,
                        paymentMethod: "pix",
                        cardType: "",
                      })
                    }
                  />
                  PIX
                </label>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cartao"
                    checked={details.paymentMethod === "cartao"}
                    onChange={() =>
                      setDetails({
                        ...details,
                        paymentMethod: "cartao",
                      })
                    }
                  />
                  Cartão
                </label>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="dinheiro"
                    checked={details.paymentMethod === "dinheiro"}
                    onChange={() =>
                      setDetails({
                        ...details,
                        paymentMethod: "dinheiro",
                        cardType: "",
                      })
                    }
                  />
                  Dinheiro
                </label>
              </fieldset>
              {details.paymentMethod === "pix" && settings.pixKey && (
                <div className="pix-info-card">
                  <span className="pix-info-label">Chave PIX da loja</span>
                  <div className="pix-key-display">
                    <code>{settings.pixKey}</code>
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => {
                        void navigator.clipboard?.writeText(settings.pixKey || "");
                        setPixCopied(true);
                        setTimeout(() => setPixCopied(false), 2000);
                      }}
                    >
                      {pixCopied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
              {details.paymentMethod === "cartao" && (
                <fieldset className="sub-fieldset">
                  <legend>Tipo de cartão</legend>
                  <label className="radio-row">
                    <input
                      type="radio"
                      name="cardType"
                      value="debito"
                      checked={details.cardType === "debito"}
                      onChange={() => setDetails({ ...details, cardType: "debito" })}
                    />
                    Débito
                  </label>
                  <label className="radio-row">
                    <input
                      type="radio"
                      name="cardType"
                      value="credito"
                      checked={details.cardType === "credito"}
                      onChange={() => setDetails({ ...details, cardType: "credito" })}
                    />
                    Crédito
                  </label>
                </fieldset>
              )}
              {details.paymentMethod === "dinheiro" && (
                <fieldset className="sub-fieldset">
                  <legend>Precisa de troco?</legend>
                  <label className="radio-row">
                    <input
                      type="radio"
                      name="needsChange"
                      value="nao"
                      checked={details.needsChange === "nao"}
                      onChange={() =>
                        setDetails({ ...details, needsChange: "nao", changeFor: "" })
                      }
                    />
                    Não
                  </label>
                  <label className="radio-row">
                    <input
                      type="radio"
                      name="needsChange"
                      value="sim"
                      checked={details.needsChange === "sim"}
                      onChange={() => setDetails({ ...details, needsChange: "sim" })}
                    />
                    Sim
                  </label>
                  {details.needsChange === "sim" && (
                    <label className="sub-label">
                      Valor para troco
                      <input
                        inputMode="decimal"
                        placeholder="Ex.: 100"
                        value={details.changeFor}
                        onChange={(event) =>
                          setDetails({ ...details, changeFor: event.target.value })
                        }
                      />
                    </label>
                  )}
                </fieldset>
              )}
              {checkoutError && <p className="form-error" role="alert">{checkoutError}</p>}
              <div className="checkout-total">
                <span>Total do pedido</span>
                <strong>{formatCurrency(totalCents)}</strong>
              </div>
              <button className="button button-primary full-width" type="submit">
                Finalizar Pedido
              </button>
              <p className="checkout-note">O pedido será enviado para confirmação pela pizzaria.</p>
            </form>
          </section>
        </div>
      )}

      {confirmClearOpen && (
        <div
          className="modal-backdrop confirm-modal-backdrop"
          onMouseDown={() => setConfirmClearOpen(false)}
        >
          <section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-clear-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Atenção</p>
                <h2 id="confirm-clear-title">Limpar carrinho</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={() => setConfirmClearOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="confirm-message">Tem certeza que deseja limpar o carrinho?</p>
            <div className="confirm-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setConfirmClearOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="button button-danger"
                type="button"
                onClick={handleClearCart}
              >
                Limpar Carrinho
              </button>
            </div>
          </section>
        </div>
      )}

      {configuringPizza && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setConfiguringPizza(null)}
        >
          <section
            className="pizza-config-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pizza-config-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Personalizar pizza</p>
                <h2 id="pizza-config-title">
                  {configuringPizza.type === "whole"
                    ? configuringPizza.product.name
                    : "Pizza Meio a Meio"}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={() => setConfiguringPizza(null)}
              >
                ×
              </button>
            </div>

            {configuringPizza.type === "whole" ? (
              configuringPizza.product.description ? (
                <p className="pizza-config-desc">{configuringPizza.product.description}</p>
              ) : null
            ) : (
              <p className="pizza-config-desc">
                ½ {configuringPizza.firstHalf.name} + ½ {configuringPizza.secondProduct.name}
              </p>
            )}

            <div className="pizza-config-section">
              <label htmlFor="modal-crust-select" className="pizza-config-label">
                Borda recheada
              </label>
              <select
                id="modal-crust-select"
                value={configuringPizza.selectedCrustId}
                onChange={(e) =>
                  setConfiguringPizza({
                    ...configuringPizza,
                    selectedCrustId: e.target.value,
                  })
                }
              >
                {usableCrusts.map((crust) => (
                  <option key={crust.id} value={crust.id}>
                    {crust.name}
                    {crust.price > 0 ? ` (+${formatCurrency(toCents(crust.price))})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const basePrice =
                configuringPizza.type === "whole"
                  ? toCents(getProductPrice(configuringPizza.product) ?? 0)
                  : Math.max(
                      configuringPizza.firstHalf.priceCents,
                      toCents(getProductPrice(configuringPizza.secondProduct) ?? 0),
                    );
              const crustPrice = toCents(
                getCrustPrice(usableCrusts, configuringPizza.selectedCrustId),
              );
              const totalPrice = basePrice + crustPrice;

              return (
                <div className="pizza-config-footer">
                  <div className="pizza-config-price">
                    <span>Valor unitário</span>
                    <strong>{formatCurrency(totalPrice)}</strong>
                  </div>
                  <button
                    className="button button-primary full-width"
                    type="button"
                    onClick={() => {
                      const crust =
                        usableCrusts.find((c) => c.id === configuringPizza.selectedCrustId) ??
                        fallbackCrust;
                      if (configuringPizza.type === "whole") {
                        addWholeProduct(configuringPizza.product, crust);
                      } else {
                        completeHalfPizza(
                          configuringPizza.waitingIndex,
                          configuringPizza.firstHalf,
                          configuringPizza.secondProduct,
                          crust,
                        );
                      }
                      setConfiguringPizza(null);
                    }}
                  >
                    Adicionar ao pedido · {formatCurrency(totalPrice)}
                  </button>
                </div>
              );
            })()}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
