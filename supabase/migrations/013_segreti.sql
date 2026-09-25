-- ════════════════════════════════════════════════════════════════════════════
-- 013 — Cassaforte per i permessi salvati (es. collegamento Google Drive)
-- ════════════════════════════════════════════════════════════════════════════
-- Nessuna policy: la tabella è leggibile e scrivibile solo dalle Edge Function,
-- che usano la chiave di servizio. Nemmeno un utente collegato può vederla.

create table public.segreti (
  chiave     text primary key,
  valore     text not null,
  note       text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.segreti enable row level security;
revoke all on public.segreti from authenticated, anon;

-- Stato del collegamento, visibile a tutti gli utenti (senza il permesso vero)
create or replace function public.stato_collegamento_drive()
returns table (collegato boolean, account text, aggiornato timestamptz)
language sql stable security definer set search_path = '' as $$
  select
    exists (select 1 from public.segreti where chiave = 'google_refresh_token'),
    (select note from public.segreti where chiave = 'google_refresh_token'),
    (select updated_at from public.segreti where chiave = 'google_refresh_token');
$$;

revoke execute on function public.stato_collegamento_drive() from public, anon;
grant execute on function public.stato_collegamento_drive() to authenticated;
