import { Bike, Crown, MessageCircle } from 'lucide-react';
import { useMenu } from '@/context/MenuContext';
import { HERO_IMAGE, LOGO_IMAGE } from '@/lib/assets';

export function Hero() {
  const { settings } = useMenu();

  return (
    <section className="relative isolate overflow-hidden">
      <img
        src={HERO_IMAGE}
        alt="Pizza saindo do forno"
        width={1920}
        height={1088}
          fetchPriority="high"
        className="absolute inset-0 -z-20 size-full object-cover object-[70%_center]"
      />
      <div className="absolute inset-0 -z-10 bg-hero-overlay" />
      <div className="absolute inset-0 -z-10 bg-hero-fade" />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-10 sm:pt-16 md:grid-cols-[1.2fr_1fr] md:pb-28 md:pt-24">
        <div className="animate-fade-up">
          <div className="mb-5 h-1.5 w-24 rounded-full bg-flag" />
          <h1 className="text-balance text-5xl font-black leading-[0.95] sm:text-6xl lg:text-7xl">
            {settings.storeName}
          </h1>
          <p className="mt-3 font-script text-3xl text-accent sm:text-4xl">{settings.slogan}</p>
          <p className="mt-5 max-w-md text-base text-foreground/80 sm:text-lg">
            Monte seu pedido em poucos toques e envie direto pelo WhatsApp. A gente prepara e leva
            até você.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/75">
            <li className="flex items-center gap-2">
              <Bike className="size-4 text-accent" /> Delivery
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="size-4 text-accent" /> Pedido pelo WhatsApp
            </li>
            <li className="flex items-center gap-2">
              <Crown className="size-4 text-accent" /> Pizza de qualidade
            </li>
          </ul>
        </div>

        <div className="hidden justify-center md:flex">
          <img
            src={LOGO_IMAGE}
            alt={`Logo ${settings.storeName}`}
            width={340}
            height={340}
            className="size-72 rounded-full object-cover shadow-glow ring-8 ring-background/40 animate-float lg:size-80"
          />
        </div>
      </div>
    </section>
  );
}
