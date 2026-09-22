import { useState } from "react";
import { DRIVE_FOLDER_ID } from "../utils/driveUpload";
import { Card, CardTitle, SectionTitle, Field, Input, btnPrimary } from "../components/UI";

export default function SezioneImpostazioni({ db, showToast }) {
  const clientId          = db.impostazioni.google_client_id || "";
  const [input, setInput] = useState(clientId);

  const save = async () => {
    if (await db.salvaImpostazione("google_client_id", input.trim())) showToast("Impostazioni salvate");
  };

  return (
    <div>
      <SectionTitle>Impostazioni</SectionTitle>

      {/* Google Drive */}
      <Card>
        <CardTitle>Integrazione Google Drive</CardTitle>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
          Inserisci il tuo Google OAuth Client ID per abilitare il caricamento automatico
          delle fatture su Google Drive. Viene salvato nel database ed è valido per tutti gli utenti.
        </p>
        <Field label="Google OAuth Client ID">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="es. 504616770565-xxxx.apps.googleusercontent.com"
          />
        </Field>
        {clientId && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#059669", display: "flex", alignItems: "center", gap: 6 }}>
            ✓ Client ID configurato — Drive upload attivo
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={save} style={btnPrimary}>Salva impostazioni</button>
        </div>
      </Card>

      {/* Cartella Drive */}
      <Card>
        <CardTitle>Cartella Drive di destinazione</CardTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 20 }}>📁</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>ZEST TEST APP / Fatture Booking</div>
            <a
              href={`https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: "#2563EB" }}
            >
              Apri su Google Drive →
            </a>
          </div>
        </div>
      </Card>

      {/* Formato nome file */}
      <Card>
        <CardTitle>Formato nome file</CardTitle>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 10, lineHeight: 1.6 }}>
          I file vengono rinominati automaticamente al caricamento:
        </p>
        <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: "#374151" }}>
          DD.MM.AAAA_ITINERARIO_FORNITORE_NUMERO_FATTURA.ext
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>
          Esempio:{" "}
          <span style={{ fontFamily: "monospace", color: "#374151" }}>
            02.12.2025_LAPPONIA_POLAR_NIGHT_Aikamatkat_INV600001420.pdf
          </span>
        </div>
      </Card>

      {/* Script Google */}
      <Card>
        <CardTitle>Script Google Identity (index.html)</CardTitle>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 10, lineHeight: 1.6 }}>
          Assicurati che questo tag sia presente in <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: 4 }}>public/index.html</code> prima di <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: 4 }}>&lt;/head&gt;</code>:
        </p>
        <div style={{ background: "#1E1E1E", color: "#9CDCFE", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>
          &lt;script src="https://accounts.google.com/gsi/client" async defer&gt;&lt;/script&gt;
        </div>
      </Card>
    </div>
  );
}
