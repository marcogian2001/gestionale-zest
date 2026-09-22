import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";
import {
  SectionTitle, Field, Select, Empty, Th, Td, tableStyle, btnSm, conferma, fmtDataOra,
} from "../components/UI";

const AZIONI = {
  "creazione":    { label: "Creazione",    bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  "modifica":     { label: "Modifica",     bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  "eliminazione": { label: "Eliminazione", bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
  "ripristino":   { label: "Ripristino",   bg: "#FFF7ED", text: "#92400E", border: "#FDE68A" },
};

const TABELLE = { itinerari: "Itinerari", turni: "Turni", spese: "Spese" };

// Nomi leggibili dei campi, per il dettaglio delle modifiche
const CAMPI = {
  ni: "Nome interno", ns: "Nome sito", n: "Turno", data_in: "Data in", data_out: "Data out",
  cancelled: "Annullato", cat: "Categoria", fornitore: "Fornitore", descrizione: "Descrizione",
  importo: "Importo", data: "Data pagamento", fattura: "Fattura", modalita: "Modalità",
  effettuato_da: "Effettuato da", note: "Note", drive_url: "File Drive",
};

function valore(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (v === true)  return "sì";
  if (v === false) return "no";
  return String(v);
}

function Dettaglio({ log }) {
  if (log.azione !== "modifica" || !log.old_data || !log.new_data) return null;
  const cambi = Object.keys(CAMPI).filter(k => JSON.stringify(log.old_data[k]) !== JSON.stringify(log.new_data[k]));
  if (!cambi.length) return null;
  return (
    <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3 }}>
      {cambi.map(k => (
        <div key={k}>
          {CAMPI[k]}: <span style={{ textDecoration: "line-through" }}>{valore(log.old_data[k])}</span> → <b>{valore(log.new_data[k])}</b>
        </div>
      ))}
    </div>
  );
}

export default function SezioneRegistro({ db, showToast }) {
  const [log,     setLog]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [fUtente, setFUtente] = useState("");
  const [fTab,    setFTab]    = useState("");
  const [fAz,     setFAz]     = useState("");
  const [utenti,  setUtenti]  = useState([]);

  const carica = useCallback(async () => {
    let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (fUtente) q = q.eq("user_id", fUtente);
    if (fTab)    q = q.eq("tabella", fTab);
    if (fAz)     q = q.eq("azione", fAz);
    const [{ data, error }, pr] = await Promise.all([q, supabase.from("profili").select("id, nome").order("nome")]);
    if (error) { showToast("Errore caricamento registro"); setLoading(false); return; }
    setLog(data);
    setUtenti(pr.data || []);
    setLoading(false);
  }, [fUtente, fTab, fAz, showToast]);

  useEffect(() => { carica(); }, [carica]);

  const annulla = async (l) => {
    const cosa = {
      creazione:    "Verrà spostato nel cestino.",
      modifica:     "Verranno ripristinati i valori precedenti.",
      eliminazione: "Verrà ripristinato dal cestino.",
      ripristino:   "Verrà rimesso nel cestino.",
    }[l.azione];
    if (!(await conferma(`Annullare questa azione? ${l.descrizione}. ${cosa}`, "Annulla azione"))) return;
    if (await db.annullaAzione(l.id)) { showToast("Azione annullata"); carica(); }
  };

  return (
    <div>
      <SectionTitle>Registro attività</SectionTitle>
      <p style={{ fontSize: 13, color: "#6B7280", marginTop: -8, marginBottom: 16 }}>
        Tutte le azioni degli utenti su itinerari, turni e spese (ultime 500). Ogni azione può essere annullata.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ minWidth: 160, flex: 1 }}>
          <Field label="Utente">
            <Select value={fUtente} onChange={e => setFUtente(e.target.value)}>
              <option value="">Tutti</option>
              {utenti.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ minWidth: 140, flex: 1 }}>
          <Field label="Sezione">
            <Select value={fTab} onChange={e => setFTab(e.target.value)}>
              <option value="">Tutte</option>
              {Object.entries(TABELLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ minWidth: 140, flex: 1 }}>
          <Field label="Azione">
            <Select value={fAz} onChange={e => setFAz(e.target.value)}>
              <option value="">Tutte</option>
              {Object.entries(AZIONI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#9CA3AF" }}>Caricamento...</div>
      ) : log.length === 0 ? (
        <Empty>Nessuna attività registrata</Empty>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Data e ora", "Utente", "Azione", "Sezione", "Cosa", ""].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {log.map(l => {
                const a = AZIONI[l.azione] || { label: l.azione, bg: "#F3F4F6", text: "#374151", border: "#E5E7EB" };
                return (
                  <tr key={l.id}>
                    <Td style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>{fmtDataOra(l.created_at)}</Td>
                    <Td><span style={{ fontWeight: 500 }}>{db.nomeUtente(l.user_id)}</span></Td>
                    <Td>
                      <span style={{ background: a.bg, color: a.text, border: `1px solid ${a.border}`, borderRadius: 20, fontSize: 10, padding: "2px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {a.label}
                      </span>
                    </Td>
                    <Td style={{ fontSize: 11 }}>{TABELLE[l.tabella] || l.tabella}</Td>
                    <Td>{l.descrizione}<Dettaglio log={l} /></Td>
                    <Td>{AZIONI[l.azione] && <button onClick={() => annulla(l)} style={btnSm}>↩ Annulla</button>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
