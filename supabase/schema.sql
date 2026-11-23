-- ============================================================================
-- La Villa Pizza — CMS de cardápio no Supabase
-- Execute este arquivo inteiro no SQL Editor do Supabase (uma única vez).
--
-- Estrutura: categories, products, crusts, settings
-- Storage: bucket público "product-images"
-- Realtime: alterações aparecem nos clientes abertos sem recarregar
--
-- OBSERVAÇÃO DE SEGURANÇA: o acesso é anônimo (sem login/JWT), conforme a
-- especificação. Por isso as políticas permitem leitura e escrita com a
-- chave anon. O PIN é apenas uma proteção de interface, não autenticação.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tabelas
-- ----------------------------------------------------------------------------

create table if not exists public.categories (
  id text primary key,
  name text not null,
  kind text not null default 'simple' check (kind in ('pizza', 'simple')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  category_id text not null references public.categories (id) on delete restrict,
  name text not null,
  description text not null default '',
  image_url text,
  active boolean not null default true,
  base_price numeric(10, 2),
  size_prices jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint products_price_required check (base_price is not null or size_prices is not null)
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_sort_idx on public.products (sort_order);

create table if not exists public.crusts (
  id text primary key,
  name text not null,
  price numeric(10, 2) not null default 0 check (price >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key default 'default' check (id = 'default'),
  restaurant_name text not null default 'La Villa Pizza',
  whatsapp_number text not null default '5598987020320',
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  platform_fee numeric(10, 2) not null default 0 check (platform_fee >= 0),
  admin_pin text not null default '1234',
  legacy_migration_done boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Compatibilidade com uma instalação anterior desta mesma tabela.
alter table public.settings
  add column if not exists legacy_migration_done boolean not null default false;

-- ----------------------------------------------------------------------------
-- Row Level Security (somente anon, sem autenticação — conforme escopo)
-- ----------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.crusts     enable row level security;
alter table public.settings   enable row level security;

drop policy if exists "categories_full_access" on public.categories;
create policy "categories_full_access" on public.categories
  for all using (true) with check (true);

drop policy if exists "products_full_access" on public.products;
create policy "products_full_access" on public.products
  for all using (true) with check (true);

drop policy if exists "crusts_full_access" on public.crusts;
create policy "crusts_full_access" on public.crusts
  for all using (true) with check (true);

drop policy if exists "settings_full_access" on public.settings;
create policy "settings_full_access" on public.settings
  for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- Storage de fotos dos produtos
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_read" on storage.objects;
create policy "product_images_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_insert" on storage.objects;
create policy "product_images_insert" on storage.objects
  for insert with check (bucket_id = 'product-images');

drop policy if exists "product_images_update" on storage.objects;
create policy "product_images_update" on storage.objects
  for update using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "product_images_delete" on storage.objects;
create policy "product_images_delete" on storage.objects
  for delete using (bucket_id = 'product-images');

-- ----------------------------------------------------------------------------
-- Realtime (atualização imediata nos clientes abertos)
-- ----------------------------------------------------------------------------

do $$
declare
  target_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach target_table in array array['categories', 'products', 'crusts', 'settings']
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = target_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', target_table);
      end if;
    end loop;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Cardápio inicial (não sobrescreve dados existentes)
-- ----------------------------------------------------------------------------

insert into public.categories (id, name, kind, active, sort_order) values
  ('tradicionais', 'Pizzas Tradicionais', 'pizza', true, 0),
  ('especiais', 'Pizzas Especiais', 'pizza', true, 1),
  ('bebidas', 'Bebidas', 'simple', true, 2)
on conflict (id) do nothing;

insert into public.products
  (id, category_id, name, description, image_url, active, base_price, size_prices, sort_order)
values
  ('calabresa', 'tradicionais', 'Calabresa',
   'Molho de tomate, mussarela, calabresa, cebola e orégano.',
   '/images/pizza-calabresa.jpg', true, null, '{"unico":39.99}'::jsonb, 0),
  ('portuguesa', 'tradicionais', 'Portuguesa',
   'Molho de tomate, mussarela, presunto, peito de peru, ovo, cebola e orégano.',
   '/images/pizza-portuguesa.jpg', true, null, '{"unico":39.99}'::jsonb, 1),
  ('marguerita', 'tradicionais', 'Marguerita',
   'Molho de tomate, mussarela, tomate fatiado, manjericão e orégano.',
   '/images/pizza-margherita.jpg', true, null, '{"unico":39.99}'::jsonb, 2),
  ('frango-catupiry', 'especiais', 'Frango com Catupiry',
   'Molho de tomate, mussarela, frango desfiado, Catupiry e orégano.',
   '/images/pizza-frango-catupiry.jpg', true, null, '{"unico":46.99}'::jsonb, 3),
  ('calabresa-especial', 'especiais', 'Calabresa Especial',
   'Molho especial, mussarela, bacon, calabresa, ovo e orégano.',
   '/images/pizza-calabresa-especial.jpg', true, null, '{"unico":47.99}'::jsonb, 4),
  ('carne-de-sol', 'especiais', 'Carne de Sol',
   'Molho de tomate, mussarela, carne de sol desfiada, molho especial da casa, manteiga da terra e orégano.',
   '/images/pizza-carne-de-sol.jpg', true, null, '{"unico":48.99}'::jsonb, 5),
  ('la-villa', 'especiais', 'La Villa',
   'Molho especial, mussarela, presunto, peito de peru, calabresa, bacon, ovo, cebola e orégano.',
   '/images/pizza-la-villa.jpg', true, null, '{"unico":44.99}'::jsonb, 6)
on conflict (id) do nothing;

insert into public.crusts (id, name, price, active, sort_order) values
  ('sem', 'Sem borda recheada', 0, true, 0)
on conflict (id) do nothing;

insert into public.settings (id, restaurant_name, whatsapp_number, delivery_fee, platform_fee, admin_pin)
values ('default', 'La Villa Pizza', '5598987020320', 0, 0, '1234')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
