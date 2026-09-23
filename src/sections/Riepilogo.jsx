import { useState } from "react";
import { fmt, fmtDate, CAT_COLORS, STATI_DOC } from "../utils/helpers";
import {
  SectionTitle, Field, Select, Card, Empty, MetricCard,
  Th, Td, tableStyle, Badge,
} from "../components/UI";

export default function SezioneRiepilogo({ itinerari, spese }) {
  const [selIt, setSelIt] = useState("");

  const it       = itinerari.find(x => String(x.id) === selIt);
  const itSpese  = spese.filter(s => String(s.itId) === selIt);

  // Raggruppa per turno
  const turniMap = {};
  itSpese.forEach(s => {
    if (!turniMap[s.turnoN]) {
      turniMap[s.turnoN] = { n: s.turnoN, in: s.turnoIn, out: s.turnoOut, strutture: 0, trasporto: 0, attivita: 0, spese: [] };
    }
    if (s.cat === "Strutture")  turniMap[s.turnoN].strutture  += s.importo;
    if (s.cat === "Trasporto")  turniMap[s.turnoN].trasporto  += s.importo;
    if (s.cat === "Attività")   turniMap[s.turnoN].attivita   += s.importo;
    turniMap[s.turnoN].spese.push(s);
  });
  const turni  = Object.values(turniMap).sort((a, b) => a.n - b.n);
  const totAll = itSpese.reduce((a, s) => a + s.importo, 0);

  return (
    <div>
      <SectionTitle>Recap Itinerario</SectionTitle>

      <div style={{ maxWidth: 340, marginBottom: 20 }}>
        <Field label="Seleziona itinerario">
          <Select value={selIt} onChange={e => setSelIt(e.target.value)}>
            <option value="">Seleziona...</option>
            {itinerari.map(it => <option key={it.id} value={it.id}>{it.ni}</option>)}
          </Select>
        </Field>
      </div>

      {!selIt             && <Empty>Seleziona un itinerario per vedere il riepilogo</Empty>}
      {selIt && !itSpese.length && <Empty>Nessuna spesa registrata per questo itinerario</Empty>}

      {selIt && itSpese.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <MetricCard label={`Totale ${it?.ni}`} value={`€ ${fmt(totAll)}`} />
            <MetricCard label="Turni con spese"   value={turni.length} />
            <MetricCard label="Righe totali"       value={itSpese.length} />
          </div>

          {turni.map(t => {
            const tot = t.strutture + t.trasporto + t.attivita;
            return (
              <Card key={t.n} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    Turno {t.n} — {fmtDate(t.in)} → {fmtDate(t.out)}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>€ {fmt(tot)}</span>
                </div>

                {/* Totali per categoria */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  {[["Strutture", t.strutture], ["Trasporto", t.trasporto], ["Attività", t.attivita]].map(([cat, val]) => (
                    <div key={cat} style={{
                      flex: 1, minWidth: 90,
                      background: CAT_COLORS[cat]?.bg || "#F9FAFB",
                      border: `1px solid ${CAT_COLORS[cat]?.border || "#E5E7EB"}`,
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      <div style={{ fontSize: 10, color: CAT_COLORS[cat]?.text, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{cat}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: CAT_COLORS[cat]?.text }}>€ {fmt(val)}</div>
                    </div>
                  ))}
                </div>

                {/* Dettaglio spese */}
                <div className="tabella-scroll"><table style={tableStyle}>
                  <thead>
                    <tr>{["Cat.", "Descrizione", "Fornitore", "Importo", "Data", "Da", "Doc."].map(h => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {t.spese.map(s => (
                      <tr key={s.id}>
                        <Td><Badge cat={s.cat} /></Td>
                        <Td>{s.desc}</Td>
                        <Td style={{ color: "#6B7280" }}>{s.fornitore}</Td>
                        <Td><span style={{ fontWeight: 600, color: s.importo < 0 ? "#059669" : "#111827" }}>€ {fmt(s.importo)}</span></Td>
                        <Td style={{ color: "#6B7280", fontSize: 11 }}>{fmtDate(s.data)}</Td>
                        <Td style={{ fontSize: 11 }}>{s.da}</Td>
                        <Td>
                          {s.driveUrl
                            ? <a href={s.driveUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2563EB", textDecoration: "none" }}>📄 Apri</a>
                            : <span style={{ color: "#9CA3AF", fontSize: 10 }}>{STATI_DOC[s.statoDoc] || "—"}</span>}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
