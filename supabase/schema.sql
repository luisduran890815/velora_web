-- =========================================================
-- VELORA · Esquema Supabase
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- =========================================================

-- 1) Publicaciones (fotos con carrusel, artículos y videos)
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('foto','articulo','video')),
  title       text not null,
  date        date not null default current_date,
  summary     text,                         -- descripción / resumen
  body        text,                         -- texto completo (artículos)
  images      jsonb not null default '[]',  -- [{ "url": "...", "alt": "..." }]
  youtube_url text,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2) Solicitudes de información / cotización
create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  celular        text not null,
  email          text,
  ciudad         text,
  tipo_seguro    text,
  mensaje        text,
  consentimiento boolean not null default false,
  estado         text not null default 'Nuevo',
  created_at     timestamptz not null default now()
);

-- 3) Seguridad (RLS)
alter table public.posts enable row level security;
alter table public.leads enable row level security;

drop policy if exists "posts_publicos" on public.posts;
create policy "posts_publicos" on public.posts
  for select to anon, authenticated using (published = true or auth.role() = 'authenticated');

drop policy if exists "posts_admin" on public.posts;
create policy "posts_admin" on public.posts
  for all to authenticated using (true) with check (true);

drop policy if exists "leads_insertar_publico" on public.leads;
create policy "leads_insertar_publico" on public.leads
  for insert to anon, authenticated with check (consentimiento = true);

drop policy if exists "leads_admin" on public.leads;
create policy "leads_admin" on public.leads
  for all to authenticated using (true) with check (true);

-- 4) Almacenamiento de imágenes (bucket público "media")
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_lectura" on storage.objects;
create policy "media_lectura" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_subir" on storage.objects;
create policy "media_subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');

drop policy if exists "media_borrar" on storage.objects;
create policy "media_borrar" on storage.objects
  for delete to authenticated using (bucket_id = 'media');
