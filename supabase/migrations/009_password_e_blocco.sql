-- ════════════════════════════════════════════════════════════════════════════
-- 009 — Account bloccabili e cambio password obbligatorio
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profili
  add column attivo boolean not null default true,
  add column richiedi_cambio_password boolean not null default false;

-- Un account bloccato non accede più ai dati
create or replace function public.is_utente()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profili where id = auth.uid() and attivo);
$$;

-- ...ma deve poter leggere il proprio profilo, per vedere il messaggio di blocco
create policy "profilo_proprio" on public.profili
  for select to authenticated using (id = auth.uid());

-- Chiamata dall'utente dopo aver cambiato la propria password
create or replace function public.completa_cambio_password()
returns void language sql security definer set search_path = '' as $$
  update public.profili set richiedi_cambio_password = false where id = auth.uid();
$$;

revoke execute on function public.completa_cambio_password() from public, anon;
grant execute on function public.completa_cambio_password() to authenticated;
