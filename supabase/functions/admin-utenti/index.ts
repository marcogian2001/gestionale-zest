// Edge Function "admin-utenti" — gestione utenti riservata al Super Admin.
// Serve perché creare/eliminare account richiede la chiave service_role,
// che non deve mai stare nel codice del sito.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RUOLI = ["super_admin", "admin", "contabilita", "finance"];

function risposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Verifica che chi chiama sia un Super Admin ─────────────────────────────
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return risposta({ error: "Non autenticato" }, 401);

  const { data: me } = await admin.from("profili").select("ruolo").eq("id", user.id).single();
  if (me?.ruolo !== "super_admin") return risposta({ error: "Permesso negato" }, 403);

  try {
    const { action, id, nome, email, password, ruolo } = await req.json();

    if (ruolo !== undefined && !RUOLI.includes(ruolo)) {
      return risposta({ error: "Ruolo non valido" }, 400);
    }

    switch (action) {
      case "crea": {
        const { data, error } = await admin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { nome },
        });
        if (error) throw error;
        // Il profilo viene creato dal trigger: qui si impostano nome e ruolo scelti.
        const { error: e2 } = await admin.from("profili")
          .update({ nome, email, ruolo }).eq("id", data.user.id);
        if (e2) throw e2;
        return risposta({ ok: true });
      }

      case "modifica": {
        if (id === user.id && ruolo !== "super_admin") {
          return risposta({ error: "Non puoi togliere a te stesso il ruolo di Super Admin" }, 400);
        }
        const { error } = await admin.auth.admin.updateUserById(id, {
          email, email_confirm: true, user_metadata: { nome },
        });
        if (error) throw error;
        const { error: e2 } = await admin.from("profili")
          .update({ nome, email, ruolo }).eq("id", id);
        if (e2) throw e2;
        return risposta({ ok: true });
      }

      case "password": {
        const { error } = await admin.auth.admin.updateUserById(id, { password });
        if (error) throw error;
        return risposta({ ok: true });
      }

      case "elimina": {
        if (id === user.id) return risposta({ error: "Non puoi eliminare te stesso" }, 400);
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
        return risposta({ ok: true });
      }

      default:
        return risposta({ error: "Azione sconosciuta" }, 400);
    }
  } catch (e) {
    return risposta({ error: (e as Error).message }, 400);
  }
});
