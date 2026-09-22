import { useState } from "react";
import { Card, CardTitle, SectionTitle, Field, Input, btnPrimary, btnSecondary, btnSm } from "../components/UI";

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

      {/* Aree e cartelle Drive */}
      <Card>
        <CardTitle>Aree e cartelle Drive</CardTitle>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14, lineHeight: 1.6 }}>
          Ogni area ha la sua cartella di partenza su Drive. Dentro, il gestionale crea da solo
          la cartella dell'anno e quella del mese (es. <b>2026 / 09 SETTEMBRE 2026</b>) in base alla
          data della fattura, e ci salva il documento.
        </p>
        <AreeDrive db={db} showToast={showToast} />
      </Card>

      {/* Formato nome file */}
      <Card>
        <CardTitle>Formato nome file</CardTitle>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 10, lineHeight: 1.6 }}>
          I file vengono rinominati automaticamente al caricamento (data fattura, itinerario, data inizio turno, fornitore, n. fattura):
        </p>
        <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: "#374151" }}>
          DD.MM.AAAA(fattura)_ITINERARIO_DD.MM.AAAA(inizio turno)_FORNITORE_N.FATTURA.ext
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>
          Esempio:{" "}
          <span style={{ fontFamily: "monospace", color: "#374151" }}>
            02.12.2025_LAPPONIA_POLAR_NIGHT_15.12.2025_Aikamatkat_INV600001420.pdf
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

// ── Aree: cartella Drive di partenza ─────────────────────────────────────────
function AreeDrive({ db, showToast }) {
  const [modifica, setModifica] = useState(null);   // { id, valore }
  const [nuova, setNuova]       = useState(null);   // { nome, folder }

  // Accetta sia l'ID sia il link completo della cartella
  const estraiId = (v) => (v.match(/folders\/([a-zA-Z0-9_-]+)/)?.[1] || v.trim());

  const salva = async () => {
    if (await db.salvaArea(modifica.id, estraiId(modifica.valore))) {
      showToast("Cartella aggiornata");
      setModifica(null);
    }
  };

  const crea = async () => {
    if (!nuova.nome.trim() || !nuova.folder.trim()) return;
    if (await db.creaArea(nuova.nome.trim(), estraiId(nuova.folder))) {
      showToast("Area creata");
      setNuova(null);
    }
  };

  return (
    <div>
      {db.aree.map(a => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid #F3F4F6" }}>
          <span style={{ fontSize: 18 }}>📁</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{a.nome}</div>
            {modifica?.id === a.id ? (
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Input
                  value={modifica.valore}
                  onChange={e => setModifica({ ...modifica, valore: e.target.value })}
                  placeholder="Incolla qui il link della cartella Drive"
                  style={{ flex: 1 }}
                />
                <button onClick={salva} style={btnPrimary}>Salva</button>
                <button onClick={() => setModifica(null)} style={btnSecondary}>Annulla</button>
              </div>
            ) : a.driveFolderId ? (
              <a href={`https://drive.google.com/drive/folders/${a.driveFolderId}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2563EB" }}>
                Apri su Google Drive →
              </a>
            ) : (
              <span style={{ fontSize: 11, color: "#EF4444" }}>Cartella non impostata</span>
            )}
          </div>
          {modifica?.id !== a.id && (
            <button onClick={() => setModifica({ id: a.id, valore: a.driveFolderId })} style={btnSm}>Cambia cartella</button>
          )}
        </div>
      ))}

      <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 12, marginTop: 4 }}>
        {nuova ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto auto", gap: 8, alignItems: "end" }}>
            <Field label="Nome area">
              <Input value={nuova.nome} onChange={e => setNuova({ ...nuova, nome: e.target.value })} placeholder="es. Eventi" />
            </Field>
            <Field label="Cartella Drive">
              <Input value={nuova.folder} onChange={e => setNuova({ ...nuova, folder: e.target.value })} placeholder="Link della cartella" />
            </Field>
            <button onClick={crea} style={btnPrimary}>Crea</button>
            <button onClick={() => setNuova(null)} style={btnSecondary}>Annulla</button>
          </div>
        ) : (
          <button onClick={() => setNuova({ nome: "", folder: "" })} style={{ ...btnSecondary, fontSize: 11 }}>+ Aggiungi area</button>
        )}
      </div>
    </div>
  );
}
