-- ════════════════════════════════════════════════════════════════════════════
-- 002 — Tracciamento modifiche, cestino (eliminazione logica) e registro attività
-- ════════════════════════════════════════════════════════════════════════════

-- ── Colonne "chi/quando" + cestino ───────────────────────────────────────────
alter table public.itinerari
  add column updated_at timestamptz,
  add column updated_by uuid references auth.users(id) on delete set null,
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null;
alter table public.turni
  add column created_by uuid default auth.uid() references auth.users(id) on delete set null,
  add column updated_at timestamptz,
  add column updated_by uuid references auth.users(id) on delete set null,
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null;
alter table public.spese
  add column updated_at timestamptz,
  add column updated_by uuid references auth.users(id) on delete set null,
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null;

-- Nessuna eliminazione definitiva dal sito: si passa sempre dal cestino.
revoke delete on public.itinerari, public.turni, public.spese from authenticated;

-- ── Aggiornamento automatico di updated_*/deleted_* + regole cestino ─────────
create or replace function public.traccia_modifica()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();

  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_by := auth.uid();
    if tg_table_name = 'itinerari' and exists (
      select 1 from public.spese where itinerario_id = new.id and deleted_at is null
    ) then
      raise exception 'Impossibile eliminare: ci sono spese collegate';
    end if;
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
    if tg_table_name = 'spese' and exists (
      select 1 from public.itinerari where id = new.itinerario_id and deleted_at is not null
    ) then
      raise exception 'Ripristina prima l''itinerario di questa spesa';
    end if;
  end if;
  return new;
end $$;

create trigger itinerari_traccia before update on public.itinerari
  for each row execute function public.traccia_modifica();
create trigger turni_traccia before update on public.turni
  for each row execute function public.traccia_modifica();
create trigger spese_traccia before update on public.spese
  for each row execute function public.traccia_modifica();

-- ── Registro attività ────────────────────────────────────────────────────────
create table public.audit_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete set null,
  azione      text not null,    -- creazione | modifica | eliminazione | ripristino
  tabella     text not null,    -- itinerari | turni | spese
  record_id   bigint not null,
  descrizione text not null default '',
  old_data    jsonb,
  new_data    jsonb
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_user_idx on public.audit_log (user_id);

create or replace function public.registra_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_azione text;
  v_old    jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new    jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  d        jsonb;
  v_desc   text;
begin
  if tg_op = 'INSERT' then
    v_azione := 'creazione';
  elsif tg_op = 'UPDATE' then
    if (v_old - 'updated_at' - 'updated_by') = (v_new - 'updated_at' - 'updated_by') then
      return null;  -- nessuna modifica reale
    end if;
    v_azione := case
      when old.deleted_at is null and new.deleted_at is not null then 'eliminazione'
      when old.deleted_at is not null and new.deleted_at is null then 'ripristino'
      else 'modifica' end;
  else
    v_azione := 'eliminazione definitiva';
  end if;

  d := coalesce(v_new, v_old);
  v_desc := case tg_table_name
    when 'itinerari' then 'Itinerario "' || (d->>'ni') || '"'
    when 'turni' then 'Turno T' || (d->>'n') || ' di "' ||
      coalesce((select ni from public.itinerari where id = (d->>'itinerario_id')::bigint), '?') || '"'
    when 'spese' then 'Spesa "' || coalesce(nullif(d->>'descrizione', ''), nullif(d->>'fornitore', ''), d->>'cat') ||
      '" € ' || (d->>'importo') || ' — ' ||
      coalesce((select ni from public.itinerari where id = (d->>'itinerario_id')::bigint), '?')
  end;

  insert into public.audit_log (user_id, azione, tabella, record_id, descrizione, old_data, new_data)
  values (auth.uid(), v_azione, tg_table_name, (d->>'id')::bigint, v_desc, v_old, v_new);
  return null;
end $$;

create trigger itinerari_log after insert or update or delete on public.itinerari
  for each row execute function public.registra_log();
create trigger turni_log after insert or update or delete on public.turni
  for each row execute function public.registra_log();
create trigger spese_log after insert or update or delete on public.spese
  for each row execute function public.registra_log();

grant select on public.audit_log to authenticated;
alter table public.audit_log enable row level security;
create policy "audit_log_super_admin" on public.audit_log
  for select to authenticated using (public.is_super_admin());

-- ── Annulla un'azione del registro (solo Super Admin) ────────────────────────
-- creazione → sposta nel cestino; modifica/eliminazione/ripristino → rimette i valori precedenti
create or replace function public.annulla_azione(p_log_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  l    public.audit_log;
  cols text;
begin
  if not public.is_super_admin() then raise exception 'Permesso negato'; end if;

  select * into l from public.audit_log where id = p_log_id;
  if not found then raise exception 'Azione non trovata'; end if;
  if l.tabella not in ('itinerari', 'turni', 'spese') then raise exception 'Tabella non valida'; end if;

  if l.azione = 'creazione' then
    execute format('update public.%I set deleted_at = now() where id = $1 and deleted_at is null', l.tabella)
      using l.record_id;
  elsif l.azione in ('modifica', 'eliminazione', 'ripristino') then
    select string_agg(format('%I', k), ', ') into cols
      from jsonb_object_keys(l.old_data) k
      where k not in ('id', 'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_by');
    execute format(
      'update public.%1$I set (%2$s) = (select %2$s from jsonb_populate_record(null::public.%1$I, $1)) where id = $2',
      l.tabella, cols
    ) using l.old_data, l.record_id;
  else
    raise exception 'Questa azione non si può annullare';
  end if;
end $$;

revoke execute on function public.annulla_azione(bigint) from public, anon;
grant execute on function public.annulla_azione(bigint) to authenticated;
