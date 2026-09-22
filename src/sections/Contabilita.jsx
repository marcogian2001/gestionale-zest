import { fmt, fmtDate } from "../utils/helpers";
import {
  SectionTitle, SectionSubTitle, Empty, Th, Td, tableStyle, btnSm, Badge, MetricCard, fmtDataOra,
} from "../components/UI";

export default function SezioneContabilita({ db, showToast }) {
  const { spese } = db;
  const aperti    = spese.filter(s => s.alert && !s.alertRisoltoAt);
  const gestiti   = spese.filter(s => s.alert && s.alertRisoltoAt)
    .sort((a, b) => b.alertRisoltoAt.localeCompare(a.alertRisoltoAt)).slice(0, 20);
  const inAttesa  = spese.filter(s => s.statoDoc === "in_attesa");
  const origine   = (s) => spese.find(x => x.id === s.origineId);

  const risolvi = async (s, risolto) => {
    if (await db.risolviAlert(s.id, risolto)) showToast(risolto ? "Alert segnato come gestito" : "Alert riaperto");
  };

  const rigaSpesa = (s) => (
    <>
      <Td><span style={{ fontWeight: 500 }}>{s.itNome}</span><div style={{ fontSize: 10, color: "#9CA3AF" }}>T{s.turnoN} · {fmtDate(s.turnoIn)}</div></Td>
      <Td><Badge cat={s.cat} /></Td>
      <Td>{s.desc}<div style={{ fontSize: 10, color: "#9CA3AF" }}>{s.fornitore}</div></Td>
      <Td><span style={{ fontWeight: 600, color: s.importo < 0 ? "#059669" : "#111827", whiteSpace: "nowrap" }}>€ {fmt(s.importo)}</span></Td>
      <Td style={{ fontSize: 11, color: "#6B7280" }}>{s.fattura || "—"}</Td>
    </>
  );

  return (
    <div>
      <SectionTitle>Contabilità</SectionTitle>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <MetricCard label="Alert da gestire"  value={aperti.length}   color={aperti.length ? "#B91C1C" : "#111827"} />
        <MetricCard label="Fatture in attesa" value={inAttesa.length} color={inAttesa.length ? "#92400E" : "#111827"} />
      </div>

      <SectionSubTitle>Alert da gestire</SectionSubTitle>
      {aperti.length === 0 ? <Empty>Nessun alert aperto</Empty> : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Itinerario", "Cat.", "Descrizione", "Importo", "Documento", "Cosa fare", ""].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {aperti.map(s => {
                const o = origine(s);
                return (
                  <tr key={s.id}>
                    {rigaSpesa(s)}
                    <Td style={{ maxWidth: 320 }}>
                      <div style={{ fontSize: 12, color: "#B91C1C", lineHeight: 1.5 }}>⚠ {s.alert}</div>
                      {o && (
                        <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3 }}>
                          Spesa originale: {o.desc || o.fornitore} € {fmt(o.importo)} · fatt. {o.fattura || "—"}{" "}
                          {o.driveUrl && <a href={o.driveUrl} target="_blank" rel="noreferrer" style={{ color: "#2563EB" }}>📄 Apri</a>}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>
                        Inserito da {db.nomeUtente(s.createdBy)} il {fmtDataOra(s.createdAt)}
                      </div>
                    </Td>
                    <Td><button onClick={() => risolvi(s, true)} style={btnSm}>✓ Gestito</button></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SectionSubTitle>Fatture in attesa</SectionSubTitle>
      {inAttesa.length === 0 ? <Empty>Nessuna fattura in attesa</Empty> : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Itinerario", "Cat.", "Descrizione", "Importo", "Fattura", "Data pag.", "Inserita da"].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {inAttesa.map(s => (
                <tr key={s.id}>
                  {rigaSpesa(s)}
                  <Td style={{ fontSize: 11, color: "#6B7280" }}>{fmtDate(s.data)}</Td>
                  <Td style={{ fontSize: 11 }}>{db.nomeUtente(s.createdBy)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>Le fatture si caricano da Budget booking con il pulsante «↑ Carica».</div>
        </div>
      )}

      {gestiti.length > 0 && <>
        <SectionSubTitle>Alert gestiti di recente</SectionSubTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Itinerario", "Cat.", "Descrizione", "Importo", "Documento", "Alert", "Gestito da", ""].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {gestiti.map(s => (
                <tr key={s.id} style={{ opacity: 0.7 }}>
                  {rigaSpesa(s)}
                  <Td style={{ fontSize: 11, color: "#6B7280", maxWidth: 280 }}>{s.alert}</Td>
                  <Td style={{ fontSize: 11 }}>{db.nomeUtente(s.alertRisoltoBy)}<div style={{ fontSize: 10, color: "#9CA3AF" }}>{fmtDataOra(s.alertRisoltoAt)}</div></Td>
                  <Td><button onClick={() => risolvi(s, false)} style={btnSm}>Riapri</button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}
