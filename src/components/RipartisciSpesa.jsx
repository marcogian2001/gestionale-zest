import { useState } from "react";
import { fmt } from "../utils/helpers";
import Ripartizione, { sommaQuote } from "./Ripartizione";
import { btnPrimary, btnSecondary } from "./UI";

// Tutte le quote della stessa fattura, in ordine di turno
export function righeGruppo(spesa, spese) {
  return spese
    .filter(s => s.gruppoId && s.gruppoId === spesa.gruppoId)
    .sort((a, b) => a.turnoN - b.turnoN);
}

// ── Ripartizione di una fattura su più turni ─────────────────────────────────
export default function RipartisciSpesa({ spesa, db, spese, showToast, onClose }) {
  const righe   = spesa.gruppoId ? righeGruppo(spesa, spese) : [spesa];
  const totale  = righe.reduce((a, r) => a + r.importo, 0);
  const turni   = (db.itinerari.find(i => i.id === spesa.itId)?.turni || [])
    .filter(t => !t.cancelled || righe.some(r => r.turnoId === t.id));

  const [quote, setQuote] = useState(righe.map(r => ({ turnoId: r.turnoId, importo: String(r.importo) })));
  const [definitiva, setDefinitiva] = useState(true);
  const [errore, setErrore] = useState("");
  const [saving, setSaving] = useState(false);

  const salva = async () => {
    if (!quote.length) return setErrore("Seleziona almeno un turno");
    if (quote.some(q => !(parseFloat(q.importo) > 0))) return setErrore("Indica l'importo di ogni turno selezionato");
    if (Math.abs(sommaQuote(quote) - totale) >= 0.005) return setErrore("La somma delle quote deve corrispondere all'importo della fattura");
    setErrore(""); setSaving(true);
    const ok = await db.ripartisciSpesa(spesa, quote.map(q => ({ turnoId: q.turnoId, importo: parseFloat(q.importo) })));
    if (ok && spesa.ripartizioneProvvisoria && definitiva) {
      await db.segnaRipartizioneSistemata(spesa, false);
    }
    setSaving(false);
    if (ok) { showToast("Ripartizione aggiornata"); onClose(); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.42)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: "1.6rem", width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(16,24,40,0.24)" }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Ripartisci la fattura su più turni</div>
        <div style={{ fontSize: 12.5, color: "#6B7280", marginBottom: 16, lineHeight: 1.5 }}>
          {spesa.desc || spesa.fornitore} · {spesa.itNome}{spesa.fattura ? ` · fatt. ${spesa.fattura}` : ""}
          <br />Importo da ripartire: <b style={{ color: "#111827" }}>€ {fmt(totale)}</b>
        </div>

        <Ripartizione turni={turni} totale={totale} quote={quote} onChange={setQuote} />

        {spesa.ripartizioneProvvisoria && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#374151", marginTop: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={definitiva} onChange={e => setDefinitiva(e.target.checked)} />
            Ripartizione definitiva — toglie il costo dall'elenco «da sistemare»
          </label>
        )}

        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8, lineHeight: 1.5 }}>
          I turni tolti dalla ripartizione finiscono nel cestino. Se su una quota ci sono rimborsi collegati, va prima eliminato il rimborso.
        </div>

        {errore && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "9px 13px", fontSize: 12, color: "#EF4444", marginTop: 12 }}>{errore}</div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={btnSecondary}>Annulla</button>
          <button onClick={salva} style={btnPrimary} disabled={saving}>{saving ? "Salvataggio..." : "Salva ripartizione"}</button>
        </div>
      </div>
    </div>
  );
}
