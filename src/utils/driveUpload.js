// ── Configurazione ────────────────────────────────────────────────────────────
export const DRIVE_FOLDER_ID = "18emYlCWDl0XRTrvA8G2mHo6ZrbuEA6as"; // Fatture Booking

// ── Nome file automatico ──────────────────────────────────────────────────────
// DD.MM.YYYY(pagamento)_ITINERARIO_DD.MM.YYYY(inizio turno)_FORNITORE_FATTURA.ext
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
export async function uploadToDrive(file, fileName) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(",")[1];
        const boundary = "zest_boundary_xyz";
        const meta = JSON.stringify({ name: fileName, parents: [DRIVE_FOLDER_ID] });
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
