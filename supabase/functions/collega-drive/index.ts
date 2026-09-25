// Edge Function "collega-drive" — collega una volta sola l'account Google
// aziendale (es. amministrazione@zestfamily.it). Il permesso ottenuto resta
// nella tabella "segreti", leggibile solo dalle Edge Function: da quel momento
// il gestionale carica i documenti sempre con quell'account.
//
// Secrets del progetto Supabase:
//   GOOGLE_OAUTH_CLIENT_ID     → ID client OAuth del progetto Google
//   GOOGLE_OAUTH_CLIENT_SECRET → client secret dello stesso ID client
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  // Solo il Super Admin collega o scollega l'account Drive
  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return risposta({ error: "Non autenticato" }, 401);

  const { data: ruoli } = await admin
    .from("profili_ruoli").select("ruoli(super_admin)").eq("profilo_id", user.id);
  if (!(ruoli || []).some((r: any) => r.ruoli?.super_admin)) {
    return risposta({ error: "Permesso negato" }, 403);
  }

  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

  try {
    const { action, code, redirectUri } = await req.json();

    switch (action) {
      // Indirizzo della schermata di consenso di Google
      case "url": {
        if (!clientId) throw new Error("Manca GOOGLE_OAUTH_CLIENT_ID nei Secrets di Supabase");
        const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "https://www.googleapis.com/auth/drive");
        url.searchParams.set("access_type", "offline");   // serve per il permesso permanente
        url.searchParams.set("prompt", "consent");
        url.searchParams.set("include_granted_scopes", "true");
        return risposta({ url: url.toString() });
      }

      // Google rimanda un codice: lo si scambia con il permesso permanente
      case "scambia": {
        if (!clientId || !clientSecret) throw new Error("Mancano le credenziali OAuth nei Secrets di Supabase");
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code, client_id: clientId, client_secret: clientSecret,
            redirect_uri: redirectUri, grant_type: "authorization_code",
          }),
        });
        const tok = await res.json();
        if (!tok.refresh_token) {
          throw new Error(
            tok.error_description || tok.error ||
            "Google non ha restituito un permesso permanente: riprova revocando l'accesso precedente"
          );
        }

        // Di quale account si tratta
        let email = "";
        try {
          const info = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tok.access_token}` },
          });
          email = (await info.json()).email || "";
        } catch { /* non essenziale */ }

        const { error } = await admin.from("segreti").upsert({
          chiave: "google_refresh_token",
          valore: tok.refresh_token,
          note: email,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        });
        if (error) throw error;

        return risposta({ ok: true, account: email });
      }

      case "scollega": {
        const { error } = await admin.from("segreti").delete().eq("chiave", "google_refresh_token");
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
