-- ════════════════════════════════════════════════════════════════════════════
-- 008 — Ruoli creabili dal Super Admin, con moduli scelti, e più ruoli per utente
-- ════════════════════════════════════════════════════════════════════════════

create table public.ruoli (
  id          bigint generated always as identity primary key,
  chiave      text not null unique,
  nome        text not null,
  permessi    text[] not null default '{}',
  super_admin boolean not null default false,   -- poteri di amministrazione
  sistema     boolean not null default false,   -- ruolo di base, non eliminabile
  created_at  timestamptz not null default now()
);

insert into public.ruoli (chiave, nome, permessi, super_admin, sistema) values
  ('super_admin', 'Super Admin',
   '{itinerari,booking,budget,riepilogo,contabilita,utenti,ruoli,registro,cestino,impostazioni}', true, true),
  ('admin', 'Admin / Supervisore', '{itinerari,booking,budget,riepilogo}', false, true),
  ('contabilita', 'Contabilità', '{contabilita,budget,riepilogo}', false, false),
  ('finance', 'Finance', '{contabilita,budget,riepilogo}', false, false);

-- Un utente può avere più ruoli: i permessi si sommano
create table public.profili_ruoli (
  profilo_id uuid   not null references public.profili(id) on delete cascade,
  ruolo_id   bigint not null references public.ruoli(id)   on delete cascade,
  primary key (profilo_id, ruolo_id)
);

insert into public.profili_ruoli (profilo_id, ruolo_id)
select p.id, r.id from public.profili p join public.ruoli r on r.chiave = p.ruolo;

-- Super Admin = ha almeno un ruolo con poteri di amministrazione
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profili_ruoli pr
    join public.ruoli r on r.id = pr.ruolo_id
    where pr.profilo_id = auth.uid() and r.super_admin
  );
$$;

-- Il nuovo utente riceve anche la riga in profili_ruoli
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ruolo text;
begin
  v_ruolo := case when exists (select 1 from public.profili where ruolo = 'super_admin')
                  then 'admin' else 'super_admin' end;

  insert into public.profili (id, nome, email, ruolo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    v_ruolo
  );

  insert into public.profili_ruoli (profilo_id, ruolo_id)
  select new.id, id from public.ruoli where chiave = v_ruolo;

  return new;
end $$;

-- I ruoli non sono più una lista fissa
alter table public.profili drop constraint profili_ruolo_check;

grant select on public.ruoli, public.profili_ruoli to authenticated;

alter table public.ruoli          enable row level security;
alter table public.profili_ruoli  enable row level security;

create policy "ruoli_lettura" on public.ruoli
  for select to authenticated using (public.is_utente());
create policy "profili_ruoli_lettura" on public.profili_ruoli
  for select to authenticated using (public.is_utente());
-- Creazione e modifica dei ruoli passano dalla Edge Function admin-utenti
