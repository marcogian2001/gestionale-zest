import { useState } from "react";
import { fmt, fmtDate, CATEGORIE, MODALITA, STATI_DOC } from "../utils/helpers";
import { buildFileName, caricaOrganizzato, AREA_BOOKING } from "../utils/driveUpload";
import {
  SectionTitle, Field, Input, Select, Empty, MetricCard,
  Th, Td, tableStyle, btnDanger, btnSm, btnPrimary, btnSecondary, inputStyle,
  conferma,
} from "../components/UI";
import { Badge, TurnoBadge, AutoreCell } from "../components/UI";

export default function SezioneBudget({ db, showToast }) {
  const { itinerari, spese } = db;
  const [fIt,  setFIt]  = useState("");
  const [fT,   setFT]   = useState("");
  const [fCat, setFCat] = useState("");
  const [inModifica, setInModifica] = useState(null);

  const turniDisp = fIt
    ? (itinerari.find(x => String(x.id) === fIt)?.turni || [])
    : [];

  const filtered = spese.filter(s => {
    if (fIt  && String(s.itId) !== fIt)       return false;
    if (fT   && s.turnoN !== parseInt(fT))    return false;
    if (fCat && s.cat !== fCat)               return false;
    return true;
  });

  const tot    = filtered.reduce((a, s) => a + s.importo, 0);
  const totPos = filtered.reduce((a, s) => a + (s.importo >= 0 ? s.importo : 0), 0);
  const totNeg = filtered.reduce((a, s) => a + (s.importo <  0 ? s.importo : 0), 0);

  const inAttesa = spese.filter(s => s.statoDoc === "in_attesa").length;

  const deleteSpesa = async (s) => {
    if (!(await conferma(`Eliminare la spesa "${s.desc || s.fornitore}" da € ${fmt(s.importo)}?`))) return;
    db.eliminaSpesa(s.id);
  };

  return (
    <div>
      <SectionTitle>Budget booking</SectionTitle>

      {/* Filtri */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
        <div style={{ minWidth: 160, flex: 1 }}>
          <Field label="Itinerario">
            <Select value={fIt} onChange={e => { setFIt(e.target.value); setFT(""); }}>
              <option value="">Tutti</option>
              {itinerari.map(it => <option key={it.id} value={it.id}>{it.ni}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ minWidth: 160, flex: 1 }}>
          <Field label="Turno">
            <Select value={fT} onChange={e => setFT(e.target.value)} disabled={!fIt}>
              <option value="">Tutti</option>
              {turniDisp.map(t => (
                <option key={t.id} value={t.n}>T{t.n}: {fmtDate(t.in)} → {fmtDate(t.out)}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div style={{ minWidth: 140, flex: 1 }}>
          <Field label="Categoria">
            <Select value={fCat} onChange={e => setFCat(e.target.value)}>
              <option value="">Tutte</option>
              {CATEGORIE.map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      {/* Metriche */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <MetricCard label="Totale netto"  value={`€ ${fmt(tot)}`}             color={tot < 0 ? "#059669" : "#111827"} />
        <MetricCard label="Spese"         value={`€ ${fmt(totPos)}`} />
        <MetricCard label="Rimborsi"      value={`€ ${fmt(Math.abs(totNeg))}`} color="#059669" />
        <MetricCard label="Righe"         value={filtered.length} />
        <MetricCard label="Fatture in attesa" value={inAttesa} color={inAttesa ? "#92400E" : "#111827"} />
      </div>

      {/* Tabella */}
      {filtered.length === 0 ? (
        <Empty>Nessuna spesa con i filtri selezionati</Empty>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Itinerario","Turno","Cat.","Descrizione","Fornitore","Importo","Data","Fattura","Mod.","Da","Doc.","Utente",""].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <Td><span style={{ fontWeight: 500, fontSize: 12 }}>{s.itNome}</span></Td>
                  <Td><TurnoBadge turno={{ n: s.turnoN, in: s.turnoIn, out: s.turnoOut }} /></Td>
                  <Td><Badge cat={s.cat} /></Td>
                  <Td>
                    {s.tipo === "rimborso" && <RimborsoBadge spesa={s} spese={spese} />}
                    {s.desc}
                  </Td>
                  <Td style={{ color: "#6B7280" }}>{s.fornitore}</Td>
                  <Td><span style={{ fontWeight: 600, color: s.importo < 0 ? "#059669" : "#111827" }}>€ {fmt(s.importo)}</span></Td>
                  <Td style={{ color: "#6B7280", fontSize: 11, whiteSpace: "nowrap" }}>
                    {fmtDate(s.data)}
                    {s.dataFattura && <div style={{ fontSize: 9, color: "#9CA3AF" }}>doc. {fmtDate(s.dataFattura)}</div>}
                  </Td>
                  <Td style={{ color: "#9CA3AF", fontSize: 10 }}>{s.fattura}</Td>
                  <Td style={{ fontSize: 11 }}>{s.modalita}</Td>
                  <Td style={{ fontSize: 11 }}>{s.da}</Td>
                  <Td><DocCell spesa={s} db={db} spese={spese} showToast={showToast} /></Td>
                  <Td><AutoreCell item={s} nomeUtente={db.nomeUtente} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => setInModifica(s)} style={btnSm}>Modifica</button>
                      <button onClick={() => deleteSpesa(s)} style={btnDanger}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#F9FAFB" }}>
                <td colSpan={5} style={{ padding: "8px 10px", fontSize: 11, color: "#9CA3AF" }}>Totale — {filtered.length} righe</td>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: tot < 0 ? "#059669" : "#111827" }}>€ {fmt(tot)}</td>
                <td colSpan={7} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {inModifica && <ModificaSpesa spesa={inModifica} db={db} onClose={() => setInModifica(null)} />}
    </div>
  );
}

// ── Finestra modifica spesa ───────────────────────────────────────────────────
function ModificaSpesa({ spesa, db, onClose }) {
  const [form, setForm] = useState({
    itId: String(spesa.itId), turnoId: String(spesa.turnoId), cat: spesa.cat,
    fornitore: spesa.fornitore, desc: spesa.desc, importo: String(spesa.importo),
    data: spesa.data || "", dataFattura: spesa.dataFattura || "", fattura: spesa.fattura, modalita: spesa.modalita,
    da: spesa.da, note: spesa.note,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const turni = (db.itinerari.find(x => String(x.id) === form.itId)?.turni || [])
    .filter(t => !t.cancelled || String(t.id) === String(spesa.turnoId));

  const valida = form.itId && form.turnoId && form.cat && form.importo !== "";
  const bloccaCollegamento = spesa.tipo === "rimborso";

  const salva = async () => {
    if (!valida) return;
    setSaving(true);
    const ok = await db.modificaSpesa(spesa.id, {
      ...form, itId: Number(form.itId), turnoId: Number(form.turnoId),
      importo: parseFloat(form.importo) || 0,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", width: 640, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{bloccaCollegamento ? "Modifica rimborso" : "Modifica spesa"}</div>
        {bloccaCollegamento && (
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: -8, marginBottom: 12 }}>
            Itinerario, turno e categoria seguono la spesa rimborsata. L'importo dei rimborsi è negativo.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Itinerario">
            <Select value={form.itId} onChange={e => { set("itId", e.target.value); set("turnoId", ""); }} disabled={bloccaCollegamento}>
              {db.itinerari.map(it => <option key={it.id} value={it.id}>{it.ni}</option>)}
            </Select>
          </Field>
          <Field label="Turno">
            <Select value={form.turnoId} onChange={e => set("turnoId", e.target.value)} disabled={bloccaCollegamento}>
              <option value="">Seleziona turno...</option>
              {turni.map(t => <option key={t.id} value={t.id}>Turno {t.n} — {fmtDate(t.in)} → {fmtDate(t.out)}</option>)}
            </Select>
          </Field>
          <Field label="Categoria">
            <Select value={form.cat} onChange={e => set("cat", e.target.value)} disabled={bloccaCollegamento}>
              {CATEGORIE.map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Fornitore">
            <Input value={form.fornitore} onChange={e => set("fornitore", e.target.value)} />
          </Field>
          <Field label="Descrizione" style={{ gridColumn: "1/-1" }}>
            <Input value={form.desc} onChange={e => set("desc", e.target.value)} />
          </Field>
          <Field label="Importo (€)">
            <Input type="number" step="0.01" value={form.importo} onChange={e => set("importo", e.target.value)} />
          </Field>
          <Field label="Data pagamento">
            <Input type="date" value={form.data} onChange={e => set("data", e.target.value)} />
          </Field>
          <Field label={bloccaCollegamento ? "Data documento di storno" : "Data fattura"}>
            <Input type="date" value={form.dataFattura} onChange={e => set("dataFattura", e.target.value)} />
          </Field>
          <Field label="N. Fattura / Ricevuta">
            <Input value={form.fattura} onChange={e => set("fattura", e.target.value)} />
          </Field>
          <Field label="Modalità pagamento">
            <Select value={form.modalita} onChange={e => set("modalita", e.target.value)}>
              <option value="">Seleziona...</option>
              {MODALITA.map(m => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Effettuato da">
            <Input value={form.da} onChange={e => set("da", e.target.value)} />
          </Field>
          <Field label="Note" style={{ gridColumn: "1/-1" }}>
            <textarea value={form.note} onChange={e => set("note", e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
          </Field>
        </div>
        {spesa.driveUrl && (
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 12 }}>
            Il file già caricato su Drive resta collegato e non viene rinominato.
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={btnSecondary}>Annulla</button>
          <button onClick={salva} style={btnPrimary} disabled={saving || !valida}>
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Badge rimborso con riferimento alla spesa originale ──────────────────────
function RimborsoBadge({ spesa, spese }) {
  const o = spese.find(x => x.id === spesa.origineId);
  return (
    <div style={{ marginBottom: 2 }}>
      <span style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", borderRadius: 20, fontSize: 9, padding: "1px 6px", fontWeight: 700, marginRight: 4 }}>RIMBORSO</span>
      <span style={{ fontSize: 10, color: "#9CA3AF" }}>
        rif. {o ? `${o.desc || o.fornitore} € ${fmt(o.importo)}${o.fattura ? ` · fatt. ${o.fattura}` : ""}` : "spesa eliminata"}
      </span>
    </div>
  );
}

// ── Colonna documento: link, stato, caricamento successivo ──────────────────
function DocCell({ spesa, db, spese, showToast }) {
  const [apri, setApri] = useState(false);
  const rimborso = spesa.tipo === "rimborso";
  const origine  = rimborso ? spese.find(x => x.id === spesa.origineId) : null;

  const nonRecuperabile = async () => {
    const cosa = rimborso ? "il documento di storno" : "la fattura";
    if (!(await conferma(
      `Segnare ${cosa} come non recuperabile? La scelta è definitiva: non sarà più possibile caricare il documento. Verrà inviato un alert alla contabilità.`,
      "Segna non recuperabile",
    ))) return;
    if (await db.segnaNonRecuperabile(spesa, origine)) showToast("Segnata come non recuperabile");
  };

  if (spesa.driveUrl) {
    return <a href={spesa.driveUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2563EB", textDecoration: "none", fontWeight: 500, whiteSpace: "nowrap" }}>📄 Apri</a>;
  }
  if (spesa.statoDoc === "in_attesa") {
    return (
      <div style={{ whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 10, color: "#92400E", fontWeight: 600 }}>⏳ In attesa</div>
        <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
          <button onClick={() => setApri(true)} style={btnSm}>↑ Carica</button>
          <button onClick={nonRecuperabile} style={btnSm}>Non recuperabile</button>
        </div>
        {apri && <CaricaDocumento spesa={spesa} db={db} showToast={showToast} onClose={() => setApri(false)} />}
      </div>
    );
  }
  return <span style={{ fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap" }}>{STATI_DOC[spesa.statoDoc] || "—"}</span>;
}

// ── Caricamento della fattura arrivata dopo ──────────────────────────────────
function CaricaDocumento({ spesa, db, showToast, onClose }) {
  const [fattura, setFattura]         = useState(spesa.fattura || "");
  const [dataFattura, setDataFattura] = useState(spesa.dataFattura || "");
  const [file, setFile]               = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [errore, setErrore]           = useState("");

  const inputId = `doc-file-${spesa.id}`;
  const nomeFile = file ? buildFileName(dataFattura, spesa.itNome, spesa.turnoIn, spesa.fornitore, fattura, file.name) : "";

  const salva = async () => {
    const doc = spesa.tipo === "rimborso" ? "del documento di storno" : "della fattura";
    if (!fattura.trim())  return setErrore(`Inserisci il numero ${doc}`);
    if (!dataFattura)     return setErrore(`Inserisci la data ${doc}`);
    if (!file)            return setErrore(`Scegli il file ${doc}`);
    setErrore(""); setUploading(true);
    try {
      const areaBooking = db.area(AREA_BOOKING);
      const url = await caricaOrganizzato(file, nomeFile, {
        dataDoc: dataFattura, area: areaBooking, cache: areaBooking && db.cacheCartelle(areaBooking.id),
      });
      if (await db.collegaDocumento(spesa.id, url, { fattura: fattura.trim(), dataFattura })) {
        showToast("Documento caricato su Drive");
        onClose();
      }
    } catch (e) {
      console.error(e);
      setErrore("Upload su Drive non riuscito: " + e.message);
    }
    setUploading(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", width: 460, maxWidth: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          {spesa.tipo === "rimborso" ? "Carica il documento di storno" : "Carica la fattura"}
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
          {spesa.desc || spesa.fornitore} · {spesa.itNome} · € {fmt(spesa.importo)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={spesa.tipo === "rimborso" ? "N. documento di storno" : "N. Fattura / Ricevuta"}>
            <Input value={fattura} onChange={e => setFattura(e.target.value)} placeholder={spesa.tipo === "rimborso" ? "es. NC-2026-014" : "es. FT-123"} autoFocus />
          </Field>
          <Field label={spesa.tipo === "rimborso" ? "Data documento" : "Data fattura"}>
            <Input type="date" value={dataFattura} onChange={e => setDataFattura(e.target.value)} />
          </Field>
        </div>
        <div
          onClick={() => document.getElementById(inputId).click()}
          style={{ border: "1.5px dashed #D1D5DB", borderRadius: 10, padding: "14px 16px", background: file ? "#F0FDF4" : "#FAFAFA", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}
        >
          <span style={{ fontSize: 20 }}>📎</span>
          <div style={{ flex: 1 }}>
            {file ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>{file.name}</div>
                {nomeFile && <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3 }}>Sarà salvato come: <span style={{ fontFamily: "monospace", color: "#374151" }}>{nomeFile}</span></div>}
              </>
            ) : <div style={{ fontSize: 12, color: "#9CA3AF" }}>Clicca per selezionare il file</div>}
          </div>
        </div>
        <input id={inputId} type="file" style={{ display: "none" }}
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
          onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); e.target.value = ""; }} />

        {errore && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#EF4444", marginTop: 12 }}>{errore}</div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={btnSecondary}>Annulla</button>
          <button onClick={salva} style={btnPrimary} disabled={uploading}>{uploading ? "Caricamento..." : "Carica su Drive"}</button>
        </div>
      </div>
    </div>
  );
}
