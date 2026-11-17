-- ============================================================================
-- La Villa Pizza — schema do cardápio no Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase.
--
-- Segurança: as políticas abaixo liberam leitura e escrita para a chave
-- anônima (anon), porque o painel atual usa um PIN validado no navegador.
-- Para produção, migre o painel para Supabase Auth e restrinja as operações
-- de INSERT/UPDATE/DELETE a usuários autenticados.
-- ============================================================================

create table if not exists public.categories (
  id text primary key,
  name text not null,
  kind text not null default 'pizza' check (kind in ('pizza', 'simple')),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default '',
  category_id text not null references public.categories(id) on delete cascade,
  image text not null default '',
  available boolean not null default true,
  featured boolean not null default false,
  price numeric(10, 2) check (price is null or price >= 0),
  size_prices jsonb not null default '{}'::jsonb
    check (jsonb_typeof(size_prices) = 'object'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_category_id_idx
  on public.products (category_id);

create index if not exists products_sort_order_idx
  on public.products (sort_order);

create index if not exists categories_sort_order_idx
  on public.categories (sort_order);

create table if not exists public.store_settings (
  id text primary key default 'default',
  store_name text not null default 'La Villa Pizza',
  slogan text not null default '',
  whatsapp text not null default '',
  delivery_fee numeric(10, 2) not null default 0
    check (delivery_fee >= 0),
  store_open boolean not null default true,
  hours_text text not null default '',
  admin_pin text not null default '1234',
  sizes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sizes) = 'array'),
  bordas jsonb not null default '[]'::jsonb
    check (jsonb_typeof(bordas) = 'array'),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists store_settings_set_updated_at on public.store_settings;

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

-- RLS + acesso público (veja o aviso de segurança no topo do arquivo)
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "categories_public_access" on public.categories;
create policy "categories_public_access"
  on public.categories
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "products_public_access" on public.products;
create policy "products_public_access"
  on public.products
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "store_settings_public_access" on public.store_settings;
create policy "store_settings_public_access"
  on public.store_settings
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.categories, public.products, public.store_settings
  to anon, authenticated;
