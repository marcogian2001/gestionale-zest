-- ════════════════════════════════════════════════════════════════════════════
-- 011 — Costi comuni: ripartizione provvisoria da sistemare
-- ════════════════════════════════════════════════════════════════════════════

alter table public.spese
  add column ripartizione_provvisoria boolean not null default false,
  add column ripartizione_sistemata_at timestamptz,
  add column ripartizione_sistemata_by uuid references auth.users(id) on delete set null;

create index spese_ripartizione_idx on public.spese (ripartizione_provvisoria)
  where ripartizione_provvisoria;

-- Chi segna la ripartizione come sistemata viene registrato in automatico
create or replace function public.traccia_alert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.alert_risolto_at is null and new.alert_risolto_at is not null then
    new.alert_risolto_by := auth.uid();
  elsif new.alert_risolto_at is null then
    new.alert_risolto_by := null;
  end if;

  if old.ripartizione_provvisoria and not new.ripartizione_provvisoria then
    new.ripartizione_sistemata_at := now();
    new.ripartizione_sistemata_by := auth.uid();
  elsif new.ripartizione_provvisoria then
    new.ripartizione_sistemata_at := null;
    new.ripartizione_sistemata_by := null;
  end if;

  return new;
end $$;

-- I ruoli con poteri di amministrazione vedono sempre tutti i moduli
update public.ruoli
set permessi = array(select distinct unnest(permessi || array['costi_comuni']))
where super_admin;
