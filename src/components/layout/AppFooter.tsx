import { Link } from 'react-router-dom';
import { useMenu } from '@/context/MenuContext';
import { useCart } from '@/context/CartContext';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { cn, formatPhone } from '@/lib/utils';
import { LOGO_IMAGE } from '@/lib/assets';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';

export function AppFooter() {
  const { settings } = useMenu();
  const { count } = useCart();

  return (
    <footer className="border-t border-border bg-background">
      <div
        className={cn(
          'mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 pt-10 text-center sm:flex-row sm:justify-between sm:text-left',
          count > 0 ? 'pb-28' : 'pb-10',
        )}
      >
        <div className="flex items-center gap-3">
          <img
            src={LOGO_IMAGE}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="size-14 rounded-full object-cover"
          />
          <div>
            <p className="font-display text-lg font-bold">{settings.storeName}</p>
            <p className="font-script text-accent">{settings.slogan}</p>
            {settings.hoursText && (
              <p className="mt-0.5 text-xs text-muted-foreground">{settings.hoursText}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 sm:items-end">
          <a
            href={buildWhatsAppUrl(settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <WhatsAppIcon className="size-4" />
            WhatsApp {formatPhone(settings.whatsapp)}
          </a>
          <Link
            to="/admin"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Área do lojista
          </Link>
        </div>
      </div>
      <div className="h-1.5 w-full bg-flag" />
    </footer>
  );
}
