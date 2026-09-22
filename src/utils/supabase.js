import { createClient } from "@supabase/supabase-js";

// ── Configurazione progetto Supabase ──────────────────────────────────────────
// La chiave "anon" è pubblica per design: i dati sono protetti dalle regole
// Row Level Security definite in supabase/schema.sql.
// NON inserire mai qui la chiave service_role.
const SUPABASE_URL = "https://bmgrhoqozlehitybnxcy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZ3Job3FvemxlaGl0eWJueGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODU5NjMsImV4cCI6MjEwNTY2MTk2M30.qCT-C_bVu8t3iJCzoccM0IuezEWjqW4wJeT-uOjYjtw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
