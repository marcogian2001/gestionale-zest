-- 005 — Nuovi ruoli: contabilità e finance
alter table public.profili drop constraint profili_ruolo_check;
alter table public.profili add constraint profili_ruolo_check
  check (ruolo in ('super_admin', 'admin', 'contabilita', 'finance'));
