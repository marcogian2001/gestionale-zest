-- ════════════════════════════════════════════════════════════════════════════
-- 012 — Le cartelle Drive salvate possono essere rimosse dalla cache quando
--       su Drive vengono cestinate o eliminate
-- ════════════════════════════════════════════════════════════════════════════

grant update, delete on public.drive_cartelle to authenticated;

create policy "cartelle_update" on public.drive_cartelle
  for update to authenticated using (public.is_utente()) with check (public.is_utente());
create policy "cartelle_delete" on public.drive_cartelle
  for delete to authenticated using (public.is_utente());
