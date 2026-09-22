-- ════════════════════════════════════════════════════════════════════════════
-- Gestionale Zest — schema database Supabase
-- Da eseguire una sola volta nel SQL Editor del progetto Supabase.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Profili utente (collegati agli account di Supabase Auth) ────────────────
create table public.profili (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null default '',
  email      text not null default '',
  ruolo      text not null default 'admin' check (ruolo in ('super_admin', 'admin')),
  created_at timestamptz not null default now()
);

-- Crea il profilo quando nasce un nuovo utente.
-- Il primo utente in assoluto diventa Super Admin, tutti gli altri Admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profili (id, nome, email, ruolo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.profili where ruolo = 'super_admin')
         then 'admin' else 'super_admin' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Helper per le regole di accesso ──────────────────────────────────────────
create or replace function public.is_utente()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profili where id = auth.uid());
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profili where id = auth.uid() and ruolo = 'super_admin');
$$;

-- ── Itinerari e turni ────────────────────────────────────────────────────────
create table public.itinerari (
  id         bigint generated always as identity primary key,
  ni         text not null,                 -- nome interno
  ns         text not null default '',      -- nome sito
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.turni (
  id            bigint generated always as identity primary key,
  itinerario_id bigint not null references public.itinerari(id) on delete cascade,
  n             int not null,
  data_in       date not null,
  data_out      date not null,
  cancelled     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index turni_itinerario_idx on public.turni (itinerario_id);

-- ── Spese booking ────────────────────────────────────────────────────────────
-- "on delete restrict": non si può eliminare un itinerario/turno che ha spese.
create table public.spese (
  id            bigint generated always as identity primary key,
  itinerario_id bigint not null references public.itinerari(id) on delete restrict,
  turno_id      bigint not null references public.turni(id) on delete restrict,
  cat           text not null check (cat in ('Strutture', 'Trasporto', 'Attività')),
  fornitore     text not null default '',
  descrizione   text not null default '',
  importo       numeric(12, 2) not null,
  data          date,
  fattura       text not null default '',
  modalita      text not null default '',
  effettuato_da text not null default '',
  note          text not null default '',
  drive_url     text,
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index spese_itinerario_idx on public.spese (itinerario_id);
create index spese_turno_idx on public.spese (turno_id);

-- ── Impostazioni condivise (es. Google OAuth Client ID) ──────────────────────
create table public.impostazioni (
  chiave text primary key,
  valore text not null default ''
);

-- ── Permessi ─────────────────────────────────────────────────────────────────
grant select on public.profili to authenticated;
grant select, insert, update, delete on public.itinerari, public.turni, public.spese to authenticated;
grant select, insert, update on public.impostazioni to authenticated;

alter table public.profili      enable row level security;
alter table public.itinerari    enable row level security;
alter table public.turni        enable row level security;
alter table public.spese        enable row level security;
alter table public.impostazioni enable row level security;

-- Profili: tutti gli utenti li leggono; si modificano solo via funzione admin-utenti.
create policy "profili_lettura" on public.profili
  for select to authenticated using (public.is_utente());

-- Dati operativi: accesso completo per ogni utente del gestionale.
create policy "itinerari_utenti" on public.itinerari
  for all to authenticated using (public.is_utente()) with check (public.is_utente());
create policy "turni_utenti" on public.turni
  for all to authenticated using (public.is_utente()) with check (public.is_utente());
create policy "spese_utenti" on public.spese
  for all to authenticated using (public.is_utente()) with check (public.is_utente());

-- Impostazioni: lettura per tutti, modifica solo Super Admin.
create policy "impostazioni_lettura" on public.impostazioni
  for select to authenticated using (public.is_utente());
create policy "impostazioni_insert" on public.impostazioni
  for insert to authenticated with check (public.is_super_admin());
create policy "impostazioni_update" on public.impostazioni
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
