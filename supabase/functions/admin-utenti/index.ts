// Edge Function "admin-utenti" — gestione utenti e ruoli, riservata al Super Admin.
// Serve perché creare/eliminare account richiede la chiave service_role,
// che non deve mai stare nel codice del sito.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODULI = [
  "itinerari", "booking", "budget", "riepilogo", "contabilita",
  "utenti", "ruoli", "registro", "cestino", "impostazioni",
];

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

  const { data: mieiRuoli } = await admin
    .from("profili_ruoli").select("ruoli(super_admin)").eq("profilo_id", user.id);
  const sonoSuperAdmin = (mieiRuoli || []).some((r: any) => r.ruoli?.super_admin);
  if (!sonoSuperAdmin) return risposta({ error: "Permesso negato" }, 403);

  // Dalle chiavi dei ruoli alle righe della tabella ruoli
  async function risolviRuoli(chiavi: string[]) {
    if (!Array.isArray(chiavi) || chiavi.length === 0) throw new Error("Seleziona almeno un ruolo");
    const { data, error } = await admin.from("ruoli").select("*").in("chiave", chiavi);
    if (error) throw error;
    if (!data || data.length !== chiavi.length) throw new Error("Ruolo non valido");
    return data;
  }

  async function assegnaRuoli(profiloId: string, chiavi: string[]) {
    const ruoli = await risolviRuoli(chiavi);
    if (profiloId === user.id && !ruoli.some((r: any) => r.super_admin)) {
      throw new Error("Non puoi togliere a te stesso i permessi di Super Admin");
    }
    await admin.from("profili_ruoli").delete().eq("profilo_id", profiloId);
    const { error } = await admin.from("profili_ruoli")
      .insert(ruoli.map((r: any) => ({ profilo_id: profiloId, ruolo_id: r.id })));
    if (error) throw error;
    return ruoli;
  }

  try {
    const body = await req.json();
    const { action, id, nome, email, password, ruoli, chiave, permessi } = body;

    switch (action) {
      // ── Utenti ─────────────────────────────────────────────────────────────
      case "crea": {
        const { data, error } = await admin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { nome },
        });
        if (error) throw error;
        const assegnati = await assegnaRuoli(data.user.id, ruoli);
        const { error: e2 } = await admin.from("profili")
          .update({ nome, email, ruolo: assegnati[0].chiave }).eq("id", data.user.id);
        if (e2) throw e2;
        return risposta({ ok: true });
      }

      case "modifica": {
        const { error } = await admin.auth.admin.updateUserById(id, {
          email, email_confirm: true, user_metadata: { nome },
        });
        if (error) throw error;
        const assegnati = await assegnaRuoli(id, ruoli);
        const { error: e2 } = await admin.from("profili")
          .update({ nome, email, ruolo: assegnati[0].chiave }).eq("id", id);
        if (e2) throw e2;
        return risposta({ ok: true });
      }

      case "password": {
        const { error } = await admin.auth.admin.updateUserById(id, { password });
        if (error) throw error;
        return risposta({ ok: true });
      }

      case "blocca": {
        if (id === user.id) throw new Error("Non puoi bloccare te stesso");
        const { error } = await admin.from("profili").update({ attivo: body.attivo !== false }).eq("id", id);
        if (error) throw error;
        return risposta({ ok: true });
      }

      case "forza_cambio": {
        const { error } = await admin.from("profili")
          .update({ richiedi_cambio_password: body.richiedi !== false }).eq("id", id);
        if (error) throw error;
        return risposta({ ok: true });
      }

      case "elimina": {
        if (id === user.id) return risposta({ error: "Non puoi eliminare te stesso" }, 400);
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
        return risposta({ ok: true });
      }

      // ── Ruoli ──────────────────────────────────────────────────────────────
      case "ruolo_crea": {
        const moduli = (permessi || []).filter((p: string) => MODULI.includes(p));
        if (!nome?.trim()) throw new Error("Inserisci il nome del ruolo");
        if (!moduli.length) throw new Error("Seleziona almeno un modulo");
        const slug = (chiave || nome).toLowerCase().normalize("NFD")
          .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        const { error } = await admin.from("ruoli")
          .insert({ chiave: slug, nome: nome.trim(), permessi: moduli });
        if (error) throw new Error(error.code === "23505" ? "Esiste già un ruolo con questo nome" : error.message);
        return risposta({ ok: true });
      }

      case "ruolo_modifica": {
        const moduli = (permessi || []).filter((p: string) => MODULI.includes(p));
        if (!moduli.length) throw new Error("Seleziona almeno un modulo");
        const { data: r } = await admin.from("ruoli").select("*").eq("id", id).single();
        if (!r) throw new Error("Ruolo non trovato");
        if (r.super_admin && !moduli.includes("utenti")) {
          throw new Error("Il Super Admin deve mantenere l'accesso alla gestione utenti");
        }
        const { error } = await admin.from("ruoli")
          .update({ nome: nome?.trim() || r.nome, permessi: moduli }).eq("id", id);
        if (error) throw error;
        return risposta({ ok: true });
      }

      case "ruolo_elimina": {
        const { data: r } = await admin.from("ruoli").select("*").eq("id", id).single();
        if (!r) throw new Error("Ruolo non trovato");
        if (r.sistema) throw new Error("Questo ruolo di base non si può eliminare");
        const { count } = await admin.from("profili_ruoli")
          .select("*", { count: "exact", head: true }).eq("ruolo_id", id);
        if (count) throw new Error(`Il ruolo è assegnato a ${count} utenti: toglilo prima da loro`);
        const { error } = await admin.from("ruoli").delete().eq("id", id);
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
