import { CAT_COLORS } from "../utils/helpers";

// ── Stili base condivisi ──────────────────────────────────────────────────────
export const inputStyle = {
  fontSize: 13, fontFamily: "inherit",
  border: "1px solid #E5E7EB", borderRadius: 8,
  padding: "7px 10px", background: "#fff", color: "#111827", width: "100%",
  outline: "none", boxSizing: "border-box",
};

export const btnBase = {
  fontSize: 12, fontFamily: "inherit", borderRadius: 8,
  cursor: "pointer", fontWeight: 600, padding: "7px 16px", border: "none",
};
export const btnPrimary    = { ...btnBase, background: "#111827", color: "#fff" };
export const btnSecondary  = { ...btnBase, background: "transparent", color: "#374151", border: "1px solid #D1D5DB" };
export const btnDanger     = { ...btnBase, background: "transparent", color: "#EF4444", border: "1px solid #FECACA", fontSize: 11, padding: "3px 8px" };
export const btnSm         = { ...btnBase, background: "transparent", color: "#374151", border: "1px solid #E5E7EB", fontSize: 11, padding: "3px 10px" };
export const tableStyle    = { width: "100%", borderCollapse: "collapse", fontSize: 12 };

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
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem", ...style }}>
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>{children}</div>;
}

export function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 16, marginTop: 0 }}>{children}</h2>;
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
    <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", padding: "2rem", background: "#FAFAFA", border: "1px dashed #E5E7EB", borderRadius: 10 }}>
      {children}
    </div>
  );
}

// ── Tabella ───────────────────────────────────────────────────────────────────
export function Th({ children }) {
  return (
    <th style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #F3F4F6", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

export function Td({ children, style }) {
  return (
    <td style={{ padding: "7px 8px", borderBottom: "1px solid #F9FAFB", verticalAlign: "middle", ...style }}>
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
    <div style={{ background: "#FAFAFA", border: "1px solid #E5E7EB", borderRadius: 10, padding: "12px 18px", minWidth: 110, flex: 1 }}>
      <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || "#111827" }}>{value}</div>
    </div>
  );
}

export function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, background: "#022C22", color: "#D1FAE5", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 500, zIndex: 1000, boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
      {msg}
    </div>
  );
}
