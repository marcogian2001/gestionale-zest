-- ════════════════════════════════════════════════════════════════════════════
-- 010 — Pax per turno e fatture ripartite su più turni
-- ════════════════════════════════════════════════════════════════════════════

-- Partecipanti previsti sul turno: serve per dividere una fattura in base ai pax
alter table public.turni add column pax int;

-- Le quote della stessa fattura condividono un gruppo
alter table public.spese add column gruppo_id uuid;
create index spese_gruppo_idx on public.spese (gruppo_id);
