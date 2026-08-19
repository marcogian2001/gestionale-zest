import { useState } from "react";
import { fmt, fmtDate, CATEGORIE } from "../utils/helpers";
import {
  SectionTitle, Field, Select, Empty, MetricCard,
  Th, Td, tableStyle, btnDanger,
} from "../components/UI";
import { Badge, TurnoBadge } from "../components/UI";

export default function SezioneBudget({ itinerari, spese, setSpese }) {
  const [fIt,  setFIt]  = useState("");
  const [fT,   setFT]   = useState("");
  const [fCat, setFCat] = useState("");

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

  const deleteSpesa = (id) => setSpese(prev => prev.filter(s => s.id !== id));

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
              {turniDisp.map((t, i) => (
                <option key={i} value={t.n}>T{t.n}: {fmtDate(t.in)} → {fmtDate(t.out)}</option>
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
      </div>

      {/* Tabella */}
      {filtered.length === 0 ? (
        <Empty>Nessuna spesa con i filtri selezionati</Empty>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Itinerario","Turno","Cat.","Descrizione","Fornitore","Importo","Data","Fattura","Mod.","Da","Doc.",""].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <Td><span style={{ fontWeight: 500, fontSize: 12 }}>{s.itNome}</span></Td>
                  <Td><TurnoBadge turno={{ n: s.turnoN, in: s.turnoIn, out: s.turnoOut }} /></Td>
                  <Td><Badge cat={s.cat} /></Td>
                  <Td>{s.desc}</Td>
                  <Td style={{ color: "#6B7280" }}>{s.fornitore}</Td>
                  <Td><span style={{ fontWeight: 600, color: s.importo < 0 ? "#059669" : "#111827" }}>€ {fmt(s.importo)}</span></Td>
                  <Td style={{ color: "#6B7280", fontSize: 11 }}>{fmtDate(s.data)}</Td>
                  <Td style={{ color: "#9CA3AF", fontSize: 10 }}>{s.fattura}</Td>
                  <Td style={{ fontSize: 11 }}>{s.modalita}</Td>
                  <Td style={{ fontSize: 11 }}>{s.da}</Td>
                  <Td>
                    {s.driveUrl
                      ? <a href={s.driveUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>📄 Apri</a>
                      : <span style={{ fontSize: 10, color: "#D1D5DB" }}>—</span>}
                  </Td>
                  <Td><button onClick={() => deleteSpesa(s.id)} style={btnDanger}>✕</button></Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#F9FAFB" }}>
                <td colSpan={5} style={{ padding: "8px 10px", fontSize: 11, color: "#9CA3AF" }}>Totale — {filtered.length} righe</td>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: tot < 0 ? "#059669" : "#111827" }}>€ {fmt(tot)}</td>
                <td colSpan={6} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
