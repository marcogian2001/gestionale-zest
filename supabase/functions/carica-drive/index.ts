// Edge Function "carica-drive" — carica i documenti su Google Drive a nome
// dell'account aziendale (es. amministrazione@zestfamily.it), qualunque utente
// stia usando il gestionale. Così le cartelle sono le stesse per tutti e
// nessuno deve collegare il proprio Google.
//
// L'accesso a Drive arriva dal collegamento fatto una volta sola con
// "collega-drive" (permesso permanente salvato nella tabella segreti).
// In alternativa si può usare un account di servizio, se configurato.
//
// Secrets del progetto Supabase:
//   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET → collegamento OAuth
//   oppure GOOGLE_SA_KEY + GOOGLE_DRIVE_USER            → account di servizio
import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MESI = [
  "GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO",
  "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE",
];

function risposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ── Token Google dal collegamento salvato ────────────────────────────────────
async function tokenDaCollegamento(admin: any) {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const { data } = await admin.from("segreti").select("valore")
    .eq("chiave", "google_refresh_token").maybeSingle();
  if (!data?.valore) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: data.valore, grant_type: "refresh_token",
    }),
  });
  const tok = await res.json();
  if (!tok.access_token) {
    throw new Error(
      "Il collegamento con Google non è più valido: rifallo da Impostazioni. " +
      (tok.error_description || tok.error || "")
    );
  }
  return tok.access_token as string;
}

// ── Token Google con account di servizio (alternativa) ───────────────────────
async function tokenServiceAccount() {
  const grezza = Deno.env.get("GOOGLE_SA_KEY");
  const utente = Deno.env.get("GOOGLE_DRIVE_USER");
  if (!grezza || !utente) return null;
  const sa = JSON.parse(grezza);
  const chiave = await importPKCS8(sa.private_key, "RS256");

  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/drive",
    sub: utente,                    // si agisce per conto dell'account aziendale
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(chiave);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error("Google ha rifiutato l'accesso: " + (json.error_description || json.error || "errore sconosciuto"));
  }
  return json.access_token as string;
}

// ── Cartelle su Drive ────────────────────────────────────────────────────────
async function drive(url: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "Errore Drive");
  return json;
}

async function trovaCartella(nome: string, parentId: string, token: string) {
  const q = `name = '${nome.replace(/'/g, "\\'")}' and '${parentId}' in parents ` +
            `and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const json = await drive(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
    `&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`, token);
  return json.files?.[0]?.id || null;
}

async function creaCartella(nome: string, parentId: string, token: string) {
  const json = await drive(
    "https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nome,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    });
  return json.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Solo utenti attivi del gestionale
  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return risposta({ error: "Non autenticato" }, 401);

  const { data: profilo } = await admin.from("profili").select("attivo").eq("id", user.id).single();
  if (!profilo?.attivo) return risposta({ error: "Permesso negato" }, 403);

  try {
    const { nomeFile, mime, contenuto, areaNome, dataDoc } = await req.json();
    if (!nomeFile || !contenuto) throw new Error("File mancante");
    if (!dataDoc) throw new Error("Manca la data del documento");

    const { data: area } = await admin.from("aree").select("*")
      .eq("nome", areaNome || "Booking Viaggi").single();
    if (!area?.drive_folder_id) throw new Error("Area senza cartella Drive: impostala in Impostazioni");

    const token = (await tokenDaCollegamento(admin)) || (await tokenServiceAccount());
    if (!token) {
      throw new Error(
        "Integrazione Drive non configurata: collega l'account aziendale da Impostazioni"
      );
    }

    // Cartella anno e cartella mese, create al volo se mancano.
    // L'elenco in drive_cartelle evita di ricercarle a ogni caricamento.
    const [anno, mese] = String(dataDoc).split("-").map(Number);

    const risolvi = async (annoN: number, meseN: number, nome: string, parentId: string) => {
      const { data: salvata } = await admin.from("drive_cartelle").select("folder_id")
        .eq("area_id", area.id).eq("anno", annoN).eq("mese", meseN).maybeSingle();
      if (salvata) {
        try {
          const info = await drive(
            `https://www.googleapis.com/drive/v3/files/${salvata.folder_id}?fields=id,trashed&supportsAllDrives=true`, token);
          if (info.id && !info.trashed) return salvata.folder_id as string;
        } catch { /* cartella non più raggiungibile: si ricrea */ }
        await admin.from("drive_cartelle").delete()
          .eq("area_id", area.id).eq("anno", annoN).eq("mese", meseN);
      }
      const id = (await trovaCartella(nome, parentId, token)) || (await creaCartella(nome, parentId, token));
      await admin.from("drive_cartelle").insert({ area_id: area.id, anno: annoN, mese: meseN, folder_id: id });
      return id;
    };

    const cartellaAnno = await risolvi(anno, 0, String(anno), area.drive_folder_id);
    const nomeMese = `${String(mese).padStart(2, "0")} ${MESI[mese - 1]} ${anno}`;
    const cartellaMese = await risolvi(anno, mese, nomeMese, cartellaAnno);

    // Caricamento del file
    const boundary = "zest_" + crypto.randomUUID();
    const meta = JSON.stringify({ name: nomeFile, parents: [cartellaMese] });
    const corpo = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      meta,
      `--${boundary}`,
      `Content-Type: ${mime || "application/octet-stream"}`,
      "Content-Transfer-Encoding: base64",
      "",
      contenuto,
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const file = await drive(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true",
      token,
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: corpo,
      });

    return risposta({
      url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      folderId: cartellaMese,
    });
  } catch (e) {
    return risposta({ error: (e as Error).message }, 400);
  }
});
