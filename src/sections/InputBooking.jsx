import { useState, useEffect } from "react";
import { fmt, fmtDate, CATEGORIE, MODALITA, STATI_DOC, residuoRimborsabile } from "../utils/helpers";
import { buildFileName, caricaSuDrive } from "../utils/driveUpload";
import {
  Card, SectionTitle, Field, Input, Select, Empty,
  inputStyle, btnPrimary, btnSecondary, btnDanger,
} from "../components/UI";

const FORM_EMPTY = {
  itId: "", turnoRaw: "", tipo: "pagamento", origineId: "",
  cat: "", fornitore: "", desc: "",
  importo: "", data: "", fattura: "", modalita: "", note: "",
  nonMia: false, da: "",
  inAttesa: false, nonRecuperabile: false, senzaStorno: false,
};

export default function SezioneInputBooking({ db, user, showToast }) {
  const { itinerari, spese } = db;
  const [form, setForm] = useState(FORM_EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState("");
  const [previewName, setPreviewName] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const rimborso = form.tipo === "rimborso";

  const it    = itinerari.find(x => String(x.id) === form.itId);
  const turno = form.turnoRaw ? JSON.parse(form.turnoRaw) : null;
  const turniDisp = (it?.turni || []).filter(t => !t.cancelled);

  // Pagamenti dello stesso itinerario/turno a cui collegare un rimborso
  const pagamentiDisp = turno
    ? spese.filter(s => s.tipo === "pagamento" && s.itId === it?.id && s.turnoId === turno.id)
    : [];
  const origine  = pagamentiDisp.find(s => String(s.id) === form.origineId);
  const residuo  = origine ? residuoRimborsabile(origine, spese) : 0;
  const nomeDa   = form.nonMia ? form.da : (user?.nome || "");
  const docRimb  = origine ? `Rimb-doc-${origine.fattura || "senza-numero"}` : "";
  const fattura  = rimborso && form.senzaStorno ? docRimb : form.fattura;
  const fornitore = rimborso ? (origine?.fornitore || "") : form.fornitore;

  // Scegliendo la spesa di riferimento si propone il rimborso totale
  const scegliOrigine = (id) => {
    const o = pagamentiDisp.find(s => String(s.id) === id);
    setForm(f => ({
      ...f, origineId: id,
      importo: o ? String(residuoRimborsabile(o, spese)) : "",
      desc: o ? `Rimborso: ${o.desc || o.fornitore}` : "",
    }));
  };

  useEffect(() => {
    if (!file) { setPreviewName(""); return; }
    setPreviewName(buildFileName(form.data, it?.ni || "", turno?.in, fornitore, fattura, file.name));
  }, [file, form.data, it, turno, fornitore, fattura]);

  const reset = () => { setForm(FORM_EMPTY); setFile(null); setErrore(""); setPreviewName(""); };

  const scegliFile = (f) => {
    setFile(f);
    setForm(x => ({ ...x, inAttesa: false, nonRecuperabile: false, senzaStorno: false }));
  };

  // Le opzioni "senza documento" si escludono a vicenda e tolgono il file
  const flagDoc = (k, v) => {
    if (v) setFile(null);
    setForm(f => ({ ...f, inAttesa: false, nonRecuperabile: false, senzaStorno: false, [k]: v }));
  };

  const valida = () => {
    if (!form.itId || !turno) return "Seleziona itinerario e turno";
    if (rimborso) {
      if (!origine) return "Seleziona la spesa a cui si riferisce il rimborso";
      const imp = parseFloat(form.importo);
      if (!(imp > 0)) return "Inserisci l'importo rimborsato";
      if (imp > residuo + 0.001) return `L'importo supera quanto ancora rimborsabile (€ ${fmt(residuo)})`;
      if (!file && !form.senzaStorno) return "Carica il documento di storno oppure seleziona «Non ho documento di storno»";
    } else {
      if (!form.cat) return "Seleziona la categoria";
      if (form.importo === "") return "Inserisci l'importo";
      if (!file && !form.inAttesa && !form.nonRecuperabile) return "Carica la fattura oppure seleziona «Fattura in attesa» o «Fattura non recuperabile»";
    }
    if (form.nonMia && !form.da.trim()) return "Indica chi ha effettuato il pagamento";
    return "";
  };

  const save = async () => {
    const err = valida();
    setErrore(err);
    if (err) return;

    setSaving(true);
    let driveUrl = null;
    if (file) {
      try {
        driveUrl = await caricaSuDrive(file, buildFileName(form.data, it.ni, turno.in, fornitore, fattura, file.name));
      } catch (e) {
        console.error(e);
        setSaving(false);
        setErrore("Upload su Drive non riuscito: " + e.message + ". La spesa non è stata salvata.");
        return;
      }
    }

    // Alert per la contabilità (rimborsi)
    const alert = [];
    if (rimborso && form.senzaStorno) {
      alert.push(`Rimborso senza documento di storno: registrare un documento fittizio ai fini IVA (rif. fattura ${origine.fattura || "senza numero"}).`);
    }
    if (rimborso && origine.statoDoc === "in_attesa") {
      alert.push("Rimborso su una spesa con fattura ancora in attesa: verificare la situazione.");
    }

    const importo = parseFloat(form.importo) || 0;
    const ok = await db.creaSpesa({
      itId: it.id, turnoId: turno.id,
      tipo: form.tipo,
      origineId: rimborso ? origine.id : null,
      cat: rimborso ? origine.cat : form.cat,
      fornitore,
      desc: form.desc,
      importo: rimborso ? -Math.abs(importo) : importo,
      data: form.data, fattura,
      modalita: form.modalita, da: nomeDa, note: form.note,
      driveUrl,
      statoDoc: driveUrl ? "caricato"
        : rimborso ? "senza_storno"
        : form.inAttesa ? "in_attesa" : "non_recuperabile",
      alert: alert.length ? alert.join(" ") : null,
    });
    setSaving(false);
    if (!ok) return;

    showToast(rimborso ? "Rimborso registrato" : driveUrl ? "Spesa registrata + file caricato su Drive" : "Spesa registrata");
    reset();
  };

  const labelCheck = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" };

  return (
    <div>
      <SectionTitle>Input booking</SectionTitle>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

          <Field label="Itinerario">
            <Select value={form.itId} onChange={e => setForm(f => ({ ...f, itId: e.target.value, turnoRaw: "", origineId: "" }))}>
              <option value="">Seleziona itinerario...</option>
              {itinerari.map(x => <option key={x.id} value={x.id}>{x.ni}</option>)}
            </Select>
          </Field>

          <Field label="Turno">
            <Select value={form.turnoRaw} onChange={e => setForm(f => ({ ...f, turnoRaw: e.target.value, origineId: "" }))} disabled={!form.itId}>
              <option value="">Seleziona turno...</option>
              {turniDisp.map(t => (
                <option key={t.id} value={JSON.stringify(t)}>
                  Turno {t.n} — {fmtDate(t.in)} → {fmtDate(t.out)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tipo">
            <Select value={form.tipo} onChange={e => { setFile(null); setForm(f => ({ ...FORM_EMPTY, itId: f.itId, turnoRaw: f.turnoRaw, tipo: e.target.value, nonMia: f.nonMia, da: f.da })); }}>
              <option value="pagamento">Pagamento</option>
              <option value="rimborso">Rimborso</option>
            </Select>
          </Field>

          {/* ── Rimborso: riga di budget collegata ─────────────────────────── */}
          {rimborso ? (
            <Field label="Spesa di riferimento">
              <Select value={form.origineId} onChange={e => scegliOrigine(e.target.value)} disabled={!turno}>
                <option value="">{turno ? (pagamentiDisp.length ? "Seleziona la spesa rimborsata..." : "Nessuna spesa in questo turno") : "Seleziona prima il turno"}</option>
                {pagamentiDisp.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.desc || s.fornitore} — {s.fornitore} — € {fmt(s.importo)}{s.fattura ? ` — fatt. ${s.fattura}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Categoria">
              <Select value={form.cat} onChange={e => set("cat", e.target.value)}>
                <option value="">Seleziona...</option>
                {CATEGORIE.map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          )}

          {rimborso && origine && (
            <div style={{ gridColumn: "1/-1", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
              <div><b>{origine.cat}</b> · {origine.fornitore} · {origine.desc}</div>
              <div>
                Importo pagato <b>€ {fmt(origine.importo)}</b> · ancora rimborsabile <b>€ {fmt(residuo)}</b>
                {" · "}Fattura {origine.fattura || "—"}{" "}
                {origine.driveUrl
                  ? <a href={origine.driveUrl} target="_blank" rel="noreferrer" style={{ color: "#2563EB" }}>📄 Apri</a>
                  : <span style={{ color: "#92400E" }}>({STATI_DOC[origine.statoDoc]})</span>}
              </div>
              {origine.statoDoc === "in_attesa" && (
                <div style={{ color: "#92400E", marginTop: 4 }}>⚠ La fattura originale è ancora in attesa: verrà inviato un alert alla contabilità.</div>
              )}
            </div>
          )}

          {!rimborso && (
            <Field label="Fornitore">
              <Input value={form.fornitore} onChange={e => set("fornitore", e.target.value)} placeholder="es. Booking.com, Easyjet..." />
            </Field>
          )}

          <Field label="Descrizione" style={{ gridColumn: rimborso ? "1/-1" : undefined }}>
            <Input value={form.desc} onChange={e => set("desc", e.target.value)} placeholder={rimborso ? "es. Rimborso voli" : "es. voli - 8pax"} />
          </Field>

          <Field label={rimborso ? "Importo rimborsato (€)" : "Importo (€)"}>
            <Input type="number" value={form.importo} onChange={e => set("importo", e.target.value)} placeholder="0.00" step="0.01" min={rimborso ? "0" : undefined} />
            {rimborso && origine && parseFloat(form.importo) === residuo && (
              <div style={{ fontSize: 10, color: "#059669", marginTop: 3 }}>Rimborso totale</div>
            )}
          </Field>

          <Field label={rimborso ? "Data rimborso" : "Data pagamento"}>
            <Input type="date" value={form.data} onChange={e => set("data", e.target.value)} />
          </Field>

          <Field label={rimborso ? "N. documento di storno" : "N. Fattura / Ricevuta"}>
            <Input
              value={fattura}
              onChange={e => set("fattura", e.target.value)}
              disabled={rimborso && form.senzaStorno}
              placeholder={rimborso ? "es. NC-2026-014" : "es. EJIN377274260"}
            />
          </Field>

          <Field label={rimborso ? "Modalità rimborso" : "Modalità pagamento"}>
            <Select value={form.modalita} onChange={e => set("modalita", e.target.value)}>
              <option value="">Seleziona...</option>
              {MODALITA.map(m => <option key={m}>{m}</option>)}
            </Select>
          </Field>

          <Field label="Effettuato da">
            <Input
              value={nomeDa}
              onChange={e => set("da", e.target.value)}
              disabled={!form.nonMia}
              placeholder="Nome di chi ha effettuato il pagamento"
            />
            <label style={{ ...labelCheck, marginTop: 6 }}>
              <input type="checkbox" checked={form.nonMia} onChange={e => setForm(f => ({ ...f, nonMia: e.target.checked, da: "" }))} />
              Non l'ho effettuata io
            </label>
          </Field>

          <Field label="Note" style={{ gridColumn: "1/-1" }}>
            <textarea
              value={form.note}
              onChange={e => set("note", e.target.value)}
              placeholder="Note aggiuntive..."
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            />
          </Field>

          {/* ── Documento ───────────────────────────────────────────────────── */}
          <Field label={rimborso ? "Documento di storno (file)" : "Fattura / Ricevuta (file)"} style={{ gridColumn: "1/-1" }}>
            {(() => {
              const bloccato = form.inAttesa || form.nonRecuperabile || form.senzaStorno;
              return (
                <div
                  style={{
                    border: "1.5px dashed #D1D5DB", borderRadius: 10, padding: "14px 16px",
                    background: file ? "#F0FDF4" : "#FAFAFA", cursor: bloccato ? "not-allowed" : "pointer",
                    opacity: bloccato ? 0.5 : 1,
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                  onClick={() => { if (!bloccato) document.getElementById("file-input").click(); }}
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
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                        {bloccato ? "Nessun file da caricare" : "Clicca per selezionare PDF, immagine o altro documento"}
                      </div>
                    )}
                  </div>
                  {file && (
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} style={btnDanger}>✕</button>
                  )}
                </div>
              );
            })()}
            <input
              id="file-input" type="file" style={{ display: "none" }}
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
              onChange={e => { if (e.target.files[0]) scegliFile(e.target.files[0]); e.target.value = ""; }}
            />
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
              {rimborso ? (
                <label style={labelCheck}>
                  <input type="checkbox" checked={form.senzaStorno} onChange={e => flagDoc("senzaStorno", e.target.checked)} />
                  Non ho documento di storno
                </label>
              ) : (
                <>
                  <label style={labelCheck}>
                    <input type="checkbox" checked={form.inAttesa} onChange={e => flagDoc("inAttesa", e.target.checked)} />
                    Fattura in attesa <span style={{ color: "#9CA3AF" }}>(la carichi quando arriva, da Budget booking)</span>
                  </label>
                  <label style={labelCheck}>
                    <input type="checkbox" checked={form.nonRecuperabile} onChange={e => flagDoc("nonRecuperabile", e.target.checked)} />
                    Fattura non recuperabile
                  </label>
                </>
              )}
            </div>
            {rimborso && form.senzaStorno && (
              <div style={{ fontSize: 11, color: "#92400E", marginTop: 6 }}>
                Il documento sarà registrato come <b>{docRimb || "Rimb-doc-…"}</b>, senza file collegato. Verrà inviato un alert alla contabilità per registrare un documento fittizio ai fini IVA.
              </div>
            )}
          </Field>

        </div>

        {errore && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#EF4444", marginTop: 14 }}>
            {errore}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={reset} style={btnSecondary}>Annulla</button>
          <button onClick={save} style={btnPrimary} disabled={saving}>
            {saving ? "Salvataggio..." : rimborso ? "Registra rimborso" : "Registra spesa"}
          </button>
        </div>
      </Card>

      {!itinerari.length && <Empty>Nessun itinerario disponibile — creane uno prima nella sezione Itinerari</Empty>}
    </div>
  );
}
