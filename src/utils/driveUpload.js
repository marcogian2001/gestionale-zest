import { supabase } from "./supabase";

// ── Configurazione ────────────────────────────────────────────────────────────
// Cartella storica, usata solo come ripiego se un'area non ha la sua cartella
export const DRIVE_FOLDER_ID = "18emYlCWDl0XRTrvA8G2mHo6ZrbuEA6as";

export const AREA_BOOKING = "Booking Viaggi";

export const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

// ── Nome file automatico ──────────────────────────────────────────────────────
// DD.MM.YYYY(data fattura)_ITINERARIO_DD.MM.YYYY(inizio turno)_FORNITORE_FATTURA.ext
export function buildFileName(data, itNome, turnoIn, fornitore, fattura, originalName) {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "pdf";
  const fmtD = (v) => {
    if (!v) return "00.00.0000";
    const [y, m, day] = v.split("-");
    return `${day}.${m}.${y}`;
  };
  const clean = (s) => (s || "").replace(/[^a-zA-Z0-9\s\-_]/g, "").trim().replace(/\s+/g, "_");
  return `${fmtD(data)}_${clean(itNome)}_${fmtD(turnoIn)}_${clean(fornitore)}_${clean(fattura)}.${ext}`;
}

// ── Ottieni token Google OAuth ────────────────────────────────────────────────
export async function ensureGoogleToken() {
  if (window._driveToken) return window._driveToken;
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google SDK non caricato — aggiungi il tag script in public/index.html"));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: window._googleClientId || "",
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else { window._driveToken = resp.access_token; resolve(resp.access_token); }
      },
    });
    client.requestAccessToken();
  });
}

// ── Upload su Drive ───────────────────────────────────────────────────────────
export async function uploadToDrive(file, fileName, parentId = DRIVE_FOLDER_ID) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(",")[1];
        const boundary = "zest_boundary_xyz";
        const meta = JSON.stringify({ name: fileName, parents: [parentId] });
        const body = [
          `--${boundary}`,
          "Content-Type: application/json",
          "",
          meta,
          `--${boundary}`,
          `Content-Type: ${file.type || "application/octet-stream"}`,
          "Content-Transfer-Encoding: base64",
          "",
          base64,
          `--${boundary}--`,
        ].join("\r\n");

        const res = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${window._driveToken}` },
            body: new Blob([body], { type: `multipart/related; boundary=${boundary}` }),
          }
        );
        const json = await res.json();
        if (json.id) resolve(`https://drive.google.com/file/d/${json.id}/view`);
        else if (json.error?.code === 404 || json.error?.code === 403) {
          reject(new Error(
            "questo account Google non può scrivere nella cartella del gestionale. " +
            "Accedi con l'account aziendale che ha accesso alla cartella, oppure avvisa l'amministratore."
          ));
        }
        else reject(new Error(json.error?.message || "Upload fallito"));
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(new Error("Lettura file fallita"));
    reader.readAsDataURL(file);
  });
}

// ── Login Google (se serve) + upload ──────────────────────────────────────────
export async function caricaSuDrive(file, fileName) {
  await ensureGoogleToken();
  return uploadToDrive(file, fileName);
}

// ── Cartelle anno / mese ──────────────────────────────────────────────────────
async function driveFetch(url, token, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "Errore Drive");
  return json;
}

async function trovaCartella(nome, parentId, token) {
  const q = `name = '${nome.replace(/'/g, "\\'")}' and '${parentId}' in parents ` +
            `and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  try {
    const json = await driveFetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, token);
    return json.files?.[0]?.id || null;
  } catch {
    return null; // con lo scope drive.file la ricerca può non vedere cartelle create a mano
  }
}

// Stato di una cartella già salvata. Attenzione: con il permesso "drive.file"
// Google mostra a ogni account solo ciò che ha creato lui, quindi una cartella
// creata da un collega risulta "sconosciuta": in quel caso va comunque usata,
// altrimenti ogni utente ne creerebbe una copia.
async function statoCartella(id, token) {
  try {
    const json = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${id}?fields=id,trashed`, token);
    if (!json.id) return "sconosciuta";
    return json.trashed ? "cestinata" : "ok";
  } catch {
    return "sconosciuta";
  }
}

async function creaCartella(nome, parentId, token) {
  const json = await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  return json.id;
}

// Restituisce la cartella del mese dell'area, creando anno e mese se mancano.
// `cache` legge e scrive la tabella drive_cartelle, per non ricercare ogni volta.
export async function cartellaDelMese(dataDoc, area, cache, token) {
  const [anno, mese] = dataDoc.split("-").map(Number);

  const risolvi = async (annoN, meseN, nome, parentId) => {
    const salvata = cache.get(annoN, meseN);
    if (salvata) {
      const stato = await statoCartella(salvata, token);
      if (stato !== "cestinata") return salvata;   // "ok" oppure creata da un altro account
      // Solo se è davvero nel cestino la si ricrea
      await cache.dimentica(annoN, meseN);
    }
    const id = (await trovaCartella(nome, parentId, token)) || (await creaCartella(nome, parentId, token));
    await cache.salva(annoN, meseN, id);
    return id;
  };

  const cartellaAnno = await risolvi(anno, 0, String(anno), area.driveFolderId);
  // es. "01 GENNAIO 2027"
  const nomeMese = `${String(mese).padStart(2, "0")} ${MESI[mese - 1].toUpperCase()} ${anno}`;
  return risolvi(anno, mese, nomeMese, cartellaAnno);
}

// ── Login Google + cartella anno/mese + upload ────────────────────────────────
// `opts`: { dataDoc: "AAAA-MM-GG", area, cache }. Senza area si usa la cartella storica.
export async function caricaOrganizzato(file, fileName, opts) {
  const token = await ensureGoogleToken();
  let parentId = DRIVE_FOLDER_ID;
  if (opts?.area?.driveFolderId && opts?.dataDoc) {
    parentId = await cartellaDelMese(opts.dataDoc, opts.area, opts.cache, token);
  }
  return uploadToDrive(file, fileName, parentId);
}

// ── Caricamento tramite il gestionale (account aziendale) ─────────────────────
// Il file viene passato alla funzione "carica-drive", che lo salva su Drive a
// nome dell'account aziendale: nessun utente deve collegare il proprio Google.
// Finché l'integrazione non è configurata si continua con il vecchio percorso.
function leggiBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Lettura del file non riuscita"));
    reader.readAsDataURL(file);
  });
}

export async function caricaDocumento(file, fileName, opts) {
  const contenuto = await leggiBase64(file);
  const { data, error } = await supabase.functions.invoke("carica-drive", {
    body: {
      nomeFile: fileName,
      mime: file.type,
      contenuto,
      areaNome: opts?.areaNome || AREA_BOOKING,
      dataDoc: opts?.dataDoc,
    },
  });

  if (!error && data?.url) return data.url;

  let messaggio = error?.message || data?.error || "Upload non riuscito";
  try { messaggio = (await error.context.json()).error || messaggio; } catch {}

  // Nessun ripiego sull'account personale di chi carica: finirebbero file e
  // cartelle nel suo Drive. Meglio fermarsi e spiegare cosa manca.
  if (/non configurata|Function not found|not found/i.test(messaggio)) {
    throw new Error(
      "Google Drive non è ancora collegato: un Super Admin deve collegare l'account aziendale " +
      "da Impostazioni → Collegamento a Google Drive. La spesa non è stata salvata."
    );
  }
  throw new Error(messaggio);
}

// ── Collegamento dell'account Google aziendale ────────────────────────────────
const REDIRECT_URI = () => window.location.origin + "/";

async function chiamaCollega(body) {
  const { data, error } = await supabase.functions.invoke("collega-drive", { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function statoCollegamentoDrive() {
  const { data, error } = await supabase.rpc("stato_collegamento_drive");
  if (error) return { collegato: false };
  const riga = Array.isArray(data) ? data[0] : data;
  return {
    collegato: !!riga?.collegato,
    account: riga?.account || "",
    aggiornato: riga?.aggiornato || null,
  };
}

// Porta alla schermata di consenso di Google; al ritorno l'indirizzo contiene ?code=
export async function avviaCollegamentoDrive() {
  const { url } = await chiamaCollega({ action: "url", redirectUri: REDIRECT_URI() });
  window.location.href = url + "&state=drive";
}

export function completaCollegamentoDrive(code) {
  return chiamaCollega({ action: "scambia", code, redirectUri: REDIRECT_URI() });
}

export function scollegaDrive() {
  return chiamaCollega({ action: "scollega" });
}
