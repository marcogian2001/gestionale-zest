import { useState, useEffect } from "react";
import { CAT_COLORS } from "../utils/helpers";

// ── Stili base condivisi ──────────────────────────────────────────────────────
export const ZEST = "#FF6B2B";

export const inputStyle = {
  fontSize: 13, fontFamily: "inherit",
  border: "1px solid #E1E4E8", borderRadius: 10,
  padding: "9px 12px", background: "#fff", color: "#111827", width: "100%",
  outline: "none", boxSizing: "border-box",
};

export const btnBase = {
  fontSize: 12.5, fontFamily: "inherit", borderRadius: 10,
  cursor: "pointer", fontWeight: 600, padding: "9px 18px", border: "none",
};
export const btnPrimary    = { ...btnBase, background: ZEST, color: "#fff", boxShadow: "0 1px 2px rgba(226,85,26,0.25)" };
export const btnSecondary  = { ...btnBase, background: "#fff", color: "#374151", border: "1px solid #DFE3E8" };
export const btnDanger     = { ...btnBase, background: "#fff", color: "#EF4444", border: "1px solid #FBD5D5", fontSize: 11, padding: "5px 10px", borderRadius: 8 };
export const btnSm         = { ...btnBase, background: "#fff", color: "#374151", border: "1px solid #E5E7EB", fontSize: 11, padding: "5px 11px", borderRadius: 8 };
export const tableStyle    = { width: "100%", borderCollapse: "collapse", fontSize: 12.5 };

// ── Input & Select ────────────────────────────────────────────────────────────
export function Input({ style, ...props }) {
  return <input style={{ ...inputStyle, ...style }} {...props} />;
}

export function Select({ children, style, ...props }) {
  return <select style={{ ...inputStyle, ...style }} {...props}>{children}</select>;
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function Field({ label, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <label style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ECEEF1", borderRadius: 14, padding: "1.35rem 1.4rem", marginBottom: "1.1rem", boxShadow: "0 1px 2px rgba(16,24,40,0.04)", ...style }}>
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", marginBottom: 14 }}>{children}</div>;
}

export function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 18, marginTop: 0, letterSpacing: "-0.02em" }}>{children}</h2>;
}

export function SectionSubTitle({ children }) {
  return (
    <h3 style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", marginTop: 24, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </h3>
  );
}

export function Empty({ children }) {
  return (
    <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", padding: "2.2rem", background: "#FBFBFC", border: "1px dashed #E1E4E8", borderRadius: 12 }}>
      {children}
    </div>
  );
}

// ── Tabella ───────────────────────────────────────────────────────────────────
export function Th({ children }) {
  return (
    <th style={{ fontSize: 10, color: "#8A919B", fontWeight: 700, textAlign: "left", padding: "9px 10px", borderBottom: "1px solid #ECEEF1", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", background: "#FCFCFD" }}>
      {children}
    </th>
  );
}

export function Td({ children, style }) {
  return (
    <td style={{ padding: "10px 10px", borderBottom: "1px solid #F4F5F7", verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ cat }) {
  const c = CAT_COLORS[cat] || { bg: "#F3F4F6", text: "#374151", border: "#E5E7EB" };
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 20, fontSize: 10, padding: "2px 8px", fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {cat}
    </span>
  );
}

export function TurnoBadge({ turno }) {
  const { fmtDate } = require("../utils/helpers");
  return (
    <span style={{ background: "#F0F9FF", color: "#0369A1", border: "1px solid #BAE6FD", borderRadius: 20, fontSize: 10, padding: "2px 8px", whiteSpace: "nowrap", fontWeight: 500 }}>
      T{turno.n}: {fmtDate(turno.in)} → {fmtDate(turno.out)}
    </span>
  );
}

export function MetricCard({ label, value, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ECEEF1", borderRadius: 14, padding: "14px 18px", minWidth: 120, flex: 1, boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
      <div style={{ fontSize: 10, color: "#8A919B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "#111827", letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

export function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, background: "#111827", color: "#fff", borderRadius: 12, padding: "13px 22px", fontSize: 13, fontWeight: 500, zIndex: 1000, boxShadow: "0 10px 30px rgba(16,24,40,0.22)" }}>
      {msg}
    </div>
  );
}

// ── Finestra di conferma ──────────────────────────────────────────────────────
// Uso: if (!(await conferma("Eliminare?"))) return;
//      conferma("Annullare?", "Conferma") per un pulsante diverso da "Elimina"
// Richiede <ConfirmHost /> montato una volta in App.
let apriConferma = null;

export function conferma(msg, label = "Elimina") {
  return new Promise(resolve => {
    if (apriConferma) apriConferma({ msg, label, resolve });
    else resolve(window.confirm(msg));
  });
}

export function ConfirmHost() {
  const [dialog, setDialog] = useState(null);
  useEffect(() => { apriConferma = setDialog; return () => { apriConferma = null; }; }, []);
  if (!dialog) return null;
  const chiudi = (ok) => { dialog.resolve(ok); setDialog(null); };
  return (
    <div onClick={() => chiudi(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: "1.6rem", width: 400, boxShadow: "0 24px 60px rgba(16,24,40,0.24)" }}>
        <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.55, marginBottom: 22 }}>{dialog.msg}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => chiudi(false)} style={btnSecondary} autoFocus>Annulla</button>
          <button onClick={() => chiudi(true)} style={{ ...btnBase, background: dialog.label === "Elimina" ? "#EF4444" : "#111827", color: "#fff" }}>{dialog.label}</button>
        </div>
      </div>
    </div>
  );
}

// ── Chi ha creato / modificato ────────────────────────────────────────────────
function fmtDataOra(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function AutoreCell({ item, nomeUtente, inline }) {
  const modificato = item.updatedAt && item.updatedBy;
  const style = { fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap" };
  const creato = <span title={fmtDataOra(item.createdAt)}>creato da <b style={{ color: "#6B7280" }}>{nomeUtente(item.createdBy)}</b></span>;
  const mod = modificato && <span title={fmtDataOra(item.updatedAt)}>mod. da <b style={{ color: "#6B7280" }}>{nomeUtente(item.updatedBy)}</b> il {fmtDataOra(item.updatedAt)}</span>;
  if (inline) return <span style={style}>{creato}{mod && <> · {mod}</>}</span>;
  return <div style={style}><div>{creato}</div>{mod && <div>{mod}</div>}</div>;
}

export { fmtDataOra };
