import { useRef, type MouseEvent } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMenu } from '@/context/MenuContext';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { LOGO_IMAGE } from '@/lib/assets';

const ADMIN_TAP_COUNT = 5;
const ADMIN_TAP_WINDOW = 1500;

interface AppHeaderProps {
  onOpenCart: () => void;
}

export function AppHeader({ onOpenCart }: AppHeaderProps) {
  const { settings } = useMenu();
  const { count } = useCart();
  const navigate = useNavigate();
  const tapsRef = useRef<number[]>([]);

  const handleLogoTap = (event: MouseEvent<HTMLAnchorElement>) => {
    const now = Date.now();
    const taps = [...tapsRef.current.filter((time) => now - time < ADMIN_TAP_WINDOW), now];
    tapsRef.current = taps;

    if (taps.length >= ADMIN_TAP_COUNT) {
      tapsRef.current = [];
      event.preventDefault();
      navigate('/admin');
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          to="/"
          onClick={handleLogoTap}
          className="flex min-h-11 touch-manipulation items-center gap-2.5 select-none"
          aria-label={`${settings.storeName} — início`}
        >
          <img
            src={LOGO_IMAGE}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover ring-2 ring-primary/60"
          />
          <div className="leading-tight">
            <p className="font-display text-lg font-bold">{settings.storeName}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  settings.storeOpen ? 'bg-success' : 'bg-destructive',
                )}
              />
              {settings.storeOpen ? 'Aberto para pedidos' : 'Fechado no momento'}
            </p>
          </div>
        </Link>

        <Button
          variant="hero"
          size="pill"
          onClick={onOpenCart}
          className="relative"
          aria-label={`Abrir carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
        >
          <ShoppingBag />
          <span className="hidden sm:inline">Carrinho</span>
          {count > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground animate-pop">
              {count}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
