import { fmt, fmtDate } from "../utils/helpers";
import { btnSm } from "./UI";

// ── Calcoli di ripartizione ───────────────────────────────────────────────────
const arrotonda = (n) => Math.round(n * 100) / 100;

// Parti uguali: l'eventuale resto dei centesimi finisce sull'ultima quota
export function dividiPartiUguali(totale, turniSel) {
  if (!turniSel.length) return [];
  const quota = arrotonda(totale / turniSel.length);
  return turniSel.map((t, i) => ({
    turnoId: t.id,
    importo: i === turniSel.length - 1 ? arrotonda(totale - quota * (turniSel.length - 1)) : quota,
  }));
}

// Proporzionale ai partecipanti di ogni turno
export function dividiPerPax(totale, turniSel) {
  const paxTot = turniSel.reduce((a, t) => a + (t.pax || 0), 0);
  if (!paxTot) return [];
  let assegnato = 0;
  return turniSel.map((t, i) => {
    const importo = i === turniSel.length - 1
      ? arrotonda(totale - assegnato)
      : arrotonda((totale * (t.pax || 0)) / paxTot);
    assegnato = arrotonda(assegnato + importo);
    return { turnoId: t.id, importo };
  });
}

export const sommaQuote = (quote) => arrotonda(quote.reduce((a, q) => a + (parseFloat(q.importo) || 0), 0));

// ── Blocco di ripartizione su più turni ───────────────────────────────────────
export default function Ripartizione({ turni, totale, quote, onChange }) {
  const scelto   = (id) => quote.some(q => q.turnoId === id);
  const turniSel = turni.filter(t => scelto(t.id));
  const somma    = sommaQuote(quote);
  const diff     = arrotonda((parseFloat(totale) || 0) - somma);
  const paxOk    = turniSel.length > 0 && turniSel.every(t => t.pax > 0);

  const toggle = (t) => onChange(
    scelto(t.id) ? quote.filter(q => q.turnoId !== t.id) : [...quote, { turnoId: t.id, importo: "" }]
  );

  const setImporto = (id, v) => onChange(quote.map(q => q.turnoId === id ? { ...q, importo: v } : q));

  return (
    <div style={{ border: "1px solid #E9EBEF", borderRadius: 12, padding: "12px 14px", background: "#FCFCFD" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>
          Turni e quote
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onChange(dividiPartiUguali(parseFloat(totale) || 0, turniSel))}
            style={btnSm} disabled={!turniSel.length || !totale}
          >
            Parti uguali
          </button>
          <button
            onClick={() => onChange(dividiPerPax(parseFloat(totale) || 0, turniSel))}
            style={btnSm} disabled={!paxOk || !totale}
            title={paxOk ? "Divide in proporzione ai partecipanti" : "Serve il numero di pax su tutti i turni scelti (si imposta in Itinerari)"}
          >
            In base ai pax
          </button>
        </div>
      </div>

      {turni.length === 0 && <div style={{ fontSize: 12, color: "#9CA3AF" }}>Nessun turno disponibile</div>}

      {turni.map(t => {
        const q = quote.find(x => x.turnoId === t.id);
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: "1px solid #F1F2F4" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer", fontSize: 12.5, color: "#374151", minWidth: 0 }}>
              <input type="checkbox" checked={!!q} onChange={() => toggle(t)} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <b>T{t.n}</b> {fmtDate(t.in)} → {fmtDate(t.out)}
                <span style={{ color: "#9CA3AF" }}>{t.pax ? ` · ${t.pax} pax` : " · pax non indicati"}</span>
              </span>
            </label>
            <input
              type="number" step="0.01" placeholder="0.00"
              value={q ? q.importo : ""}
              onChange={e => setImporto(t.id, e.target.value)}
              disabled={!q}
              style={{
                fontSize: 13, fontFamily: "inherit", border: "1px solid #E1E4E8", borderRadius: 8,
                padding: "6px 10px", width: 110, textAlign: "right", background: q ? "#fff" : "#F5F6F7",
              }}
            />
          </div>
        );
      })}

      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E9EBEF", marginTop: 8, paddingTop: 8, fontSize: 12 }}>
        <span style={{ color: "#6B7280" }}>Totale quote — {turniSel.length} turni</span>
        <span style={{ fontWeight: 700, color: Math.abs(diff) < 0.005 ? "#065F46" : "#B91C1C" }}>
          € {fmt(somma)}
          {Math.abs(diff) >= 0.005 && (
            <span style={{ fontWeight: 500 }}> · {diff > 0 ? "mancano" : "eccedono"} € {fmt(Math.abs(diff))}</span>
          )}
        </span>
      </div>
    </div>
  );
}
