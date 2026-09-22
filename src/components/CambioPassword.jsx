import { useState } from "react";
import { Field, Input, btnPrimary, btnSecondary } from "./UI";

// Cambio password fatto dall'utente. Con `obbligatorio` non si può chiudere:
// è il caso in cui il Super Admin ha richiesto il cambio al prossimo accesso.
export default function CambioPassword({ onCambia, onClose, obbligatorio, onLogout }) {
  const [attuale, setAttuale] = useState("");
  const [nuova,   setNuova]   = useState("");
  const [conferma, setConferma] = useState("");
  const [errore,  setErrore]  = useState("");
  const [loading, setLoading] = useState(false);

  const salva = async () => {
    if (nuova.length < 8)     return setErrore("La nuova password deve avere almeno 8 caratteri");
    if (nuova !== conferma)   return setErrore("Le due password non coincidono");
    if (nuova === attuale)    return setErrore("La nuova password deve essere diversa da quella attuale");
    setErrore(""); setLoading(true);
    try {
      await onCambia(attuale, nuova);
      if (onClose) onClose();
    } catch (e) { setErrore(e.message); }
    setLoading(false);
  };

  return (
    <div
      onClick={() => { if (!obbligatorio && onClose) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: obbligatorio ? "#F6F7F9" : "rgba(17,24,39,0.42)",
        zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: "1.7rem", width: 420, maxWidth: "100%", boxShadow: "0 24px 60px rgba(16,24,40,0.18)", border: "1px solid #ECEEF1" }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6, letterSpacing: "-0.01em" }}>
          {obbligatorio ? "Imposta una nuova password" : "Cambia password"}
        </div>
        <div style={{ fontSize: 12.5, color: "#6B7280", marginBottom: 18, lineHeight: 1.5 }}>
          {obbligatorio
            ? "Per continuare devi scegliere una nuova password: è stato richiesto dall'amministratore."
            : "Scegli una nuova password: ti servirà al prossimo accesso."}
        </div>

        <Field label="Password attuale">
          <Input type="password" value={attuale} onChange={e => setAttuale(e.target.value)} autoFocus placeholder="••••••••" />
        </Field>
        <div style={{ height: 10 }} />
        <Field label="Nuova password">
          <Input type="password" value={nuova} onChange={e => setNuova(e.target.value)} placeholder="Minimo 8 caratteri" />
        </Field>
        <div style={{ height: 10 }} />
        <Field label="Ripeti la nuova password">
          <Input type="password" value={conferma} onChange={e => setConferma(e.target.value)} placeholder="••••••••" />
        </Field>

        {errore && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "9px 13px", fontSize: 12, color: "#EF4444", marginTop: 14 }}>
            {errore}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          {obbligatorio
            ? <button onClick={onLogout} style={btnSecondary}>Esci</button>
            : <button onClick={onClose} style={btnSecondary}>Annulla</button>}
          <button onClick={salva} style={btnPrimary} disabled={loading || !attuale || !nuova || !conferma}>
            {loading ? "Salvataggio..." : "Salva password"}
          </button>
        </div>
      </div>
    </div>
  );
}
