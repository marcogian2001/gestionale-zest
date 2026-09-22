-- ════════════════════════════════════════════════════════════════════════════
-- 004 — Rimborsi, stato documento, alert per la contabilità
-- ════════════════════════════════════════════════════════════════════════════

alter table public.spese
  add column tipo text not null default 'pagamento' check (tipo in ('pagamento', 'rimborso')),
  add column spesa_origine_id bigint references public.spese(id) on delete restrict,
  -- caricato | in_attesa | non_recuperabile | senza_storno (rimborso senza documento)
  add column stato_doc text not null default 'caricato'
    check (stato_doc in ('caricato', 'in_attesa', 'non_recuperabile', 'senza_storno')),
  add column alert_contabilita text,
  add column alert_risolto_at timestamptz,
  add column alert_risolto_by uuid references auth.users(id) on delete set null;

create index spese_origine_idx on public.spese (spesa_origine_id);

-- Le spese già presenti senza file vengono considerate "in attesa"
update public.spese set stato_doc = 'in_attesa' where drive_url is null;

-- Un rimborso deve sempre puntare a un pagamento
alter table public.spese add constraint spese_rimborso_origine
  check ((tipo = 'rimborso') = (spesa_origine_id is not null));

-- Chi segna un alert come gestito viene registrato in automatico
create or replace function public.traccia_alert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.alert_risolto_at is null and new.alert_risolto_at is not null then
    new.alert_risolto_by := auth.uid();
  elsif new.alert_risolto_at is null then
    new.alert_risolto_by := null;
  end if;
  return new;
end $$;

create trigger spese_alert before update on public.spese
  for each row execute function public.traccia_alert();

-- Cestino: un pagamento con rimborsi attivi non si elimina; un rimborso non si
-- ripristina se il pagamento originale è nel cestino.
create or replace function public.traccia_modifica()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();

  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_by := auth.uid();
    if tg_table_name = 'itinerari' then
      if exists (select 1 from public.spese where itinerario_id = new.id and deleted_at is null) then
        raise exception 'Impossibile eliminare: ci sono spese collegate';
      end if;
    elsif tg_table_name = 'spese' then
      if exists (select 1 from public.spese where spesa_origine_id = new.id and deleted_at is null) then
        raise exception 'Impossibile eliminare: ci sono rimborsi collegati a questa spesa';
      end if;
    end if;
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
    if tg_table_name = 'spese' then
      if exists (select 1 from public.itinerari where id = new.itinerario_id and deleted_at is not null) then
        raise exception 'Ripristina prima l''itinerario di questa spesa';
      end if;
      if exists (select 1 from public.spese where id = new.spesa_origine_id and deleted_at is not null) then
        raise exception 'Ripristina prima la spesa rimborsata';
      end if;
    end if;
  end if;
  return new;
end $$;
