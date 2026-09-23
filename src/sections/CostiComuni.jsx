import { useState } from "react";
import { fmt, fmtDate } from "../utils/helpers";
import {
  SectionTitle, SectionSubTitle, Card, Empty, MetricCard, Badge,
  btnPrimary, btnSm, conferma, fmtDataOra,
} from "../components/UI";
import RipartisciSpesa from "../components/RipartisciSpesa";

// Raggruppa le quote per fattura: una scheda per costo comune
function gruppi(spese, provvisorie) {
  const mappa = new Map();
  spese
    .filter(s => s.gruppoId && !!s.ripartizioneProvvisoria === provvisorie && s.tipo !== "rimborso")
    .forEach(s => {
      const g = mappa.get(s.gruppoId) || { id: s.gruppoId, righe: [] };
      g.righe.push(s);
      mappa.set(s.gruppoId, g);
    });
  return [...mappa.values()].map(g => ({
    ...g,
    righe: g.righe.sort((a, b) => a.turnoN - b.turnoN),
    capo: g.righe[0],
    totale: g.righe.reduce((a, r) => a + r.importo, 0),
  }));
}

export default function SezioneCostiComuni({ db, showToast }) {
  const [inRiparto, setInRiparto] = useState(null);

  const daSistemare = gruppi(db.spese, true);
  const sistemati   = gruppi(db.spese, false);

  const gestito = async (g) => {
    if (!(await conferma(
      `Segnare come sistemata la ripartizione di "${g.capo.desc || g.capo.fornitore}" (€ ${fmt(g.totale)})?`,
      "Segna gestito",
    ))) return;
    if (await db.segnaRipartizioneSistemata(g.capo, false)) showToast("Ripartizione confermata");
  };

  const riapri = async (g) => {
    if (await db.segnaRipartizioneSistemata(g.capo, true)) showToast("Ripartizione riaperta");
  };

  const Scheda = ({ g, daFare }) => (
    <Card style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <Badge cat={g.capo.cat} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{g.capo.desc || g.capo.fornitore}</span>
            <span style={{ fontSize: 12, color: "#6B7280" }}>{g.capo.fornitore}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#6B7280" }}>
            {g.capo.itNome} · {g.righe.length} turni · fattura {g.capo.fattura || "—"}
            {g.capo.dataFattura ? ` del ${fmtDate(g.capo.dataFattura)}` : ""}
            {g.capo.driveUrl && <> · <a href={g.capo.driveUrl} target="_blank" rel="noreferrer">📄 Apri</a></>}
          </div>
          <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 3 }}>
            Inserito da {db.nomeUtente(g.capo.createdBy)} il {fmtDataOra(g.capo.createdAt)}
            {!daFare && g.capo.ripartizioneSistemataAt && (
              <> · sistemato da {db.nomeUtente(g.capo.ripartizioneSistemataBy)} il {fmtDataOra(g.capo.ripartizioneSistemataAt)}</>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>€ {fmt(g.totale)}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setInRiparto(g.capo)} style={daFare ? btnPrimary : btnSm}>
              {daFare ? "Sistema ripartizione" : "Modifica"}
            </button>
            {daFare
              ? <button onClick={() => gestito(g)} style={btnSm}>✓ Gestito</button>
              : <button onClick={() => riapri(g)} style={btnSm}>Riapri</button>}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, borderTop: "1px solid #F1F2F4", paddingTop: 10 }}>
        {g.righe.map(r => (
          <span key={r.id} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 999,
            background: "#F7F8FA", border: "1px solid #ECEEF1", color: "#374151", whiteSpace: "nowrap",
          }}>
            <b>T{r.turnoN}</b> {fmtDate(r.turnoIn)}
            {r.turnoPax ? ` · ${r.turnoPax} pax` : ""} — <b>€ {fmt(r.importo)}</b>
          </span>
        ))}
      </div>
    </Card>
  );

  return (
    <div>
      <SectionTitle>Costi comuni</SectionTitle>
      <p style={{ fontSize: 13, color: "#6B7280", marginTop: -10, marginBottom: 16, lineHeight: 1.6 }}>
        Fatture che coprono più turni. All'inserimento il costo viene diviso in parti uguali:
        qui si sistema la ripartizione definitiva, per importo o in base ai pax, e si conferma con «Gestito».
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <MetricCard label="Da sistemare" value={daSistemare.length} color={daSistemare.length ? "#B91C1C" : "#111827"} />
        <MetricCard label="Costi comuni sistemati" value={sistemati.length} />
        <MetricCard label="Totale da sistemare" value={`€ ${fmt(daSistemare.reduce((a, g) => a + g.totale, 0))}`} />
      </div>

      <SectionSubTitle>Ripartizioni da sistemare</SectionSubTitle>
      {daSistemare.length === 0
        ? <Empty>Nessuna ripartizione in attesa</Empty>
        : daSistemare.map(g => <Scheda key={g.id} g={g} daFare />)}

      {sistemati.length > 0 && <>
        <SectionSubTitle>Costi comuni già sistemati</SectionSubTitle>
        {sistemati.map(g => <Scheda key={g.id} g={g} />)}
      </>}

      {inRiparto && (
        <RipartisciSpesa
          spesa={inRiparto} db={db} spese={db.spese} showToast={showToast}
          onClose={() => setInRiparto(null)}
        />
      )}
    </div>
  );
}
