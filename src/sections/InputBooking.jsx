import { useState, useEffect } from "react";
import { fmtDate, CATEGORIE, MODALITA } from "../utils/helpers";
import { buildFileName, ensureGoogleToken, uploadToDrive } from "../utils/driveUpload";
import {
  Card, SectionTitle, Field, Input, Select, Empty,
  inputStyle, btnPrimary, btnSecondary, btnDanger,
} from "../components/UI";

const FORM_EMPTY = {
  itId: "", turnoRaw: "", cat: "", fornitore: "", desc: "",
  importo: "", data: "", fattura: "", modalita: "", da: "", note: "",
};

export default function SezioneInputBooking({ db, showToast }) {
  const { itinerari } = db;
  const [form, setForm] = useState(FORM_EMPTY);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [previewName, setPreviewName] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const turniDisp = form.itId
    ? (itinerari.find(x => String(x.id) === form.itId)?.turni || []).filter(t => !t.cancelled)
    : [];

  useEffect(() => {
    if (!file) { setPreviewName(""); return; }
    const it = itinerari.find(x => String(x.id) === form.itId);
    setPreviewName(buildFileName(form.data, it?.ni || "", form.fornitore, form.fattura, file.name));
  }, [file, form.data, form.itId, form.fornitore, form.fattura, itinerari]);

  const reset = () => { setForm(FORM_EMPTY); setFile(null); setUploadStatus(null); setPreviewName(""); };

  const save = async () => {
    if (!form.itId || !form.turnoRaw || !form.cat || !form.importo) return;
    const it = itinerari.find(x => String(x.id) === form.itId);
    const turno = JSON.parse(form.turnoRaw);
    let driveUrl = null;

    if (file) {
      setUploading(true);
      try {
        await ensureGoogleToken();
        const fileName = buildFileName(form.data, it.ni, form.fornitore, form.fattura, file.name);
        driveUrl = await uploadToDrive(file, fileName);
        setUploadStatus("ok");
      } catch (e) {
        console.error(e);
        setUploadStatus("error");
        showToast("Errore upload Drive — spesa salvata senza file");
      } finally {
        setUploading(false);
      }
    }

    const ok = await db.creaSpesa({
      itId: it.id, turnoId: turno.id,
      cat: form.cat, fornitore: form.fornitore, desc: form.desc,
      importo: parseFloat(form.importo) || 0,
      data: form.data, fattura: form.fattura,
      modalita: form.modalita, da: form.da, note: form.note,
      driveUrl,
    });
    if (!ok) return;

    showToast(driveUrl ? "Spesa registrata + file caricato su Drive" : "Spesa registrata");
    reset();
  };

  return (
    <div>
      <SectionTitle>Input booking</SectionTitle>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

          <Field label="Itinerario">
            <Select value={form.itId} onChange={e => { set("itId", e.target.value); set("turnoRaw", ""); }}>
              <option value="">Seleziona itinerario...</option>
              {itinerari.map(it => <option key={it.id} value={it.id}>{it.ni}</option>)}
            </Select>
          </Field>

          <Field label="Turno">
            <Select value={form.turnoRaw} onChange={e => set("turnoRaw", e.target.value)} disabled={!form.itId}>
              <option value="">Seleziona turno...</option>
              {turniDisp.map(t => (
                <option key={t.id} value={JSON.stringify(t)}>
                  Turno {t.n} — {fmtDate(t.in)} → {fmtDate(t.out)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Categoria">
            <Select value={form.cat} onChange={e => set("cat", e.target.value)}>
              <option value="">Seleziona...</option>
              {CATEGORIE.map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>

          <Field label="Fornitore">
            <Input value={form.fornitore} onChange={e => set("fornitore", e.target.value)} placeholder="es. Booking.com, Easyjet..." />
          </Field>

          <Field label="Descrizione" style={{ gridColumn: "1/-1" }}>
            <Input value={form.desc} onChange={e => set("desc", e.target.value)} placeholder="es. voli - 8pax" />
          </Field>

          <Field label="Importo (€)">
            <Input type="number" value={form.importo} onChange={e => set("importo", e.target.value)} placeholder="0.00" step="0.01" />
          </Field>

          <Field label="Data pagamento">
            <Input type="date" value={form.data} onChange={e => set("data", e.target.value)} />
          </Field>

          <Field label="N. Fattura / Ricevuta">
            <Input value={form.fattura} onChange={e => set("fattura", e.target.value)} placeholder="es. EJIN377274260" />
          </Field>

          <Field label="Modalità pagamento">
            <Select value={form.modalita} onChange={e => set("modalita", e.target.value)}>
              <option value="">Seleziona...</option>
              {MODALITA.map(m => <option key={m}>{m}</option>)}
            </Select>
          </Field>

          <Field label="Effettuato da">
            <Input value={form.da} onChange={e => set("da", e.target.value)} placeholder="es. Cioski, Gian, Simone..." />
          </Field>

          <Field label="Note" style={{ gridColumn: "1/-1" }}>
            <textarea
              value={form.note}
              onChange={e => set("note", e.target.value)}
              placeholder="Note aggiuntive..."
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            />
          </Field>

          {/* Upload fattura */}
          <Field label="Fattura / Ricevuta (file)" style={{ gridColumn: "1/-1" }}>
            <div
              style={{
                border: "1.5px dashed #D1D5DB", borderRadius: 10, padding: "14px 16px",
                background: file ? "#F0FDF4" : "#FAFAFA", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
              }}
              onClick={() => document.getElementById("file-input").click()}
            >
              <span style={{ fontSize: 20 }}>📎</span>
              <div style={{ flex: 1 }}>
                {file ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>{file.name}</div>
                    {previewName && (
                      <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3 }}>
                        Sarà salvato come: <span style={{ fontFamily: "monospace", color: "#374151" }}>{previewName}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>Clicca per selezionare PDF, immagine o altro documento</div>
                )}
              </div>
              {file && (
                <button onClick={e => { e.stopPropagation(); setFile(null); setUploadStatus(null); setPreviewName(""); }} style={btnDanger}>✕</button>
              )}
            </div>
            <input
              id="file-input" type="file" style={{ display: "none" }}
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
              onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }}
            />
            {uploadStatus === "ok"    && <div style={{ fontSize: 11, color: "#059669", marginTop: 4 }}>✓ File caricato su Drive</div>}
            {uploadStatus === "error" && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>⚠ Upload Drive fallito — spesa salvata senza file</div>}
          </Field>

        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={reset} style={btnSecondary}>Annulla</button>
          <button onClick={save} style={btnPrimary} disabled={uploading}>
            {uploading ? "Caricamento..." : "Registra spesa"}
          </button>
        </div>
      </Card>

      {!itinerari.length && <Empty>Nessun itinerario disponibile — creane uno prima nella sezione Itinerari</Empty>}
    </div>
  );
}
