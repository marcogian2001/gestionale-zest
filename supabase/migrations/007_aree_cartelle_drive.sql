-- ════════════════════════════════════════════════════════════════════════════
-- 007 — Aree (Booking Viaggi, Eventi, ...) e cartelle Drive anno/mese
-- ════════════════════════════════════════════════════════════════════════════

create table public.aree (
  id              bigint generated always as identity primary key,
  nome            text not null unique,
  drive_folder_id text not null default '',
  created_at      timestamptz not null default now()
);

-- Cache delle cartelle create su Drive: mese = 0 indica la cartella dell'anno
create table public.drive_cartelle (
  id         bigint generated always as identity primary key,
  area_id    bigint not null references public.aree(id) on delete cascade,
  anno       int not null,
  mese       int not null default 0,
  folder_id  text not null,
  created_at timestamptz not null default now(),
  unique (area_id, anno, mese)
);

insert into public.aree (nome, drive_folder_id)
values ('Booking Viaggi', '1TYqHWPkkS0z1yaDeAej9mJ59ckshyNOh');

grant select, insert, update on public.aree to authenticated;
grant select, insert on public.drive_cartelle to authenticated;

alter table public.aree           enable row level security;
alter table public.drive_cartelle enable row level security;

create policy "aree_lettura" on public.aree
  for select to authenticated using (public.is_utente());
create policy "aree_insert" on public.aree
  for insert to authenticated with check (public.is_super_admin());
create policy "aree_update" on public.aree
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- La cache viene scritta dal gestionale quando crea una cartella su Drive
create policy "cartelle_lettura" on public.drive_cartelle
  for select to authenticated using (public.is_utente());
create policy "cartelle_insert" on public.drive_cartelle
  for insert to authenticated with check (public.is_utente());
