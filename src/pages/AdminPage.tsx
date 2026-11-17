import { useLayoutEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  DollarSign,
  Lock,
  LogOut,
  Pizza,
  RefreshCw,
  Settings as SettingsIcon,
  Store,
  Tags,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { STORAGE_KEYS } from '@/data/seed';
import { useMenu } from '@/context/MenuContext';
import { useOrders } from '@/context/OrdersContext';
import { useToast } from '@/context/ToastContext';
import { LOGO_IMAGE } from '@/lib/assets';
import { formatCurrency, isToday } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { CategoriesManager } from '@/components/admin/CategoriesManager';
import { OrdersManager } from '@/components/admin/OrdersManager';
import { ProductsManager } from '@/components/admin/ProductsManager';
import { SettingsManager } from '@/components/admin/SettingsManager';

type Tab = 'pedidos' | 'produtos' | 'categorias' | 'config';

const TABS: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
  { id: 'produtos', label: 'Produtos', icon: Pizza },
  { id: 'categorias', label: 'Categorias', icon: Tags },
  { id: 'config', label: 'Configurações', icon: SettingsIcon },
];

function PinGate({ onSuccess }: { onSuccess: () => void }) {
  const { settings } = useMenu();
  const [pin, setPin] = useState('');
  const [invalid, setInvalid] = useState(false);

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <form
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-card animate-fade-up"
        onSubmit={(event) => {
          event.preventDefault();
          if (pin === settings.adminPin) {
            onSuccess();
          } else {
            setInvalid(true);
            setPin('');
          }
        }}
      >
        <img
          src={LOGO_IMAGE}
          alt={settings.storeName}
          width={80}
          height={80}
          className="mx-auto size-20 rounded-full object-cover ring-2 ring-primary/40"
        />
        <h1 className="mt-4 font-display text-2xl font-bold">Área do lojista</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Digite o PIN para gerenciar o cardápio.
        </p>

        <div className="relative mt-6">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            aria-label="PIN"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value);
              setInvalid(false);
            }}
            placeholder="••••"
            className="h-12 pl-9 text-center text-lg tracking-[0.5em]"
          />
        </div>
        {invalid && <p className="mt-2 text-sm text-destructive">PIN incorreto</p>}

        <Button type="submit" variant="hero" size="xl" className="mt-4 w-full">
          Entrar
        </Button>

        <Link
          to="/"
          className="mt-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Voltar ao cardápio
        </Link>
      </form>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 text-lg font-bold sm:text-2xl">{value}</p>
    </div>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const {
    settings,
    products,
    saveSettings,
    isLoading,
    syncError,
    clearSyncError,
    reloadMenu,
  } = useMenu();
  const { orders } = useOrders();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('pedidos');

  const todayOrders = orders.filter(
    (order) => isToday(order.createdAt) && order.status !== 'cancelado',
  );
  const todaySales = todayOrders.reduce((total, order) => total + order.total, 0);
  const activeItems = products.filter((product) => product.available).length;
  const pendingOrders = orders.filter(
    (order) =>
      order.status === 'novo' || order.status === 'preparo' || order.status === 'saiu',
  ).length;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={LOGO_IMAGE}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-full object-cover ring-2 ring-primary/30"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-lg font-bold">
                Painel {settings.storeName}
              </p>
              <p className="text-xs text-muted-foreground">
                {isLoading ? 'Sincronizando cardápio...' : 'Gestão do cardápio'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/" aria-label="Ver cardápio">
                <ArrowLeft />
                <span className="hidden sm:inline">Ver cardápio</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Sair">
              <LogOut />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {syncError && (
          <div className="mb-4 flex flex-wrap items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p className="min-w-0 flex-1">{syncError}</p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void reloadMenu()}
                disabled={isLoading}
              >
                <RefreshCw /> Tentar novamente
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={clearSyncError}
                aria-label="Fechar aviso de sincronização"
              >
                <X />
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="Pedidos hoje"
            value={String(todayOrders.length)}
          />
          <StatCard
            icon={DollarSign}
            label="Vendas hoje"
            value={formatCurrency(todaySales)}
          />
          <StatCard
            icon={Pizza}
            label="Itens ativos"
            value={`${activeItems}/${products.length}`}
          />
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Store className="size-3.5" /> Loja
              </p>
              <p
                className={`mt-1 text-lg font-bold ${
                  settings.storeOpen ? 'text-success' : 'text-destructive'
                }`}
              >
                {settings.storeOpen ? 'Aberta' : 'Fechada'}
              </p>
            </div>
            <Switch
              aria-label="Loja aberta"
              checked={settings.storeOpen}
              onCheckedChange={(checked) => {
                void saveSettings({ storeOpen: checked }).then((ok) => {
                  if (ok) {
                    showToast(checked ? 'Loja aberta para pedidos' : 'Loja fechada');
                  } else {
                    showToast('Não foi possível atualizar a loja', 'error');
                  }
                });
              }}
            />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Seções do painel"
          className="no-scrollbar mt-6 flex w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted p-1"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {label}
                {id === 'pedidos' && pendingOrders > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {pendingOrders}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {tab === 'pedidos' && <OrdersManager />}
          {tab === 'produtos' && <ProductsManager />}
          {tab === 'categorias' && <CategoriesManager />}
          {tab === 'config' && <SettingsManager />}
        </div>
      </main>
    </div>
  );
}

export function AdminPage() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(STORAGE_KEYS.adminSession) === '1',
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-admin');
    return () => root.classList.remove('theme-admin');
  }, []);

  const handleSuccess = () => {
    sessionStorage.setItem(STORAGE_KEYS.adminSession, '1');
    setAuthed(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEYS.adminSession);
    setAuthed(false);
  };

  return authed ? (
    <AdminDashboard onLogout={handleLogout} />
  ) : (
    <PinGate onSuccess={handleSuccess} />
  );
}
