-- 003 — Corregge traccia_modifica: il controllo "itinerario eliminato" va eseguito
-- solo sulla tabella spese (le altre tabelle non hanno itinerario_id / non tutte).
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
    end if;
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
    if tg_table_name = 'spese' then
      if exists (select 1 from public.itinerari where id = new.itinerario_id and deleted_at is not null) then
        raise exception 'Ripristina prima l''itinerario di questa spesa';
      end if;
    end if;
  end if;
  return new;
end $$;
