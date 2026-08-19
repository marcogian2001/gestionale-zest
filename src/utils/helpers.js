import { useState, useEffect } from "react";

// ── Costanti ─────────────────────────────────────────────────────────────────
export const CAT_COLORS = {
  Strutture:  { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  Trasporto:  { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  "Attività": { bg: "#FFF7ED", text: "#92400E", border: "#FDE68A" },
};

export const CATEGORIE = ["Strutture", "Trasporto", "Attività"];
export const MODALITA  = ["Carta Aziendale", "Carta personale Admin / dipendente", "Bonifico"];

// ── Funzioni di utilità ───────────────────────────────────────────────────────
export function fmt(n) {
  return Number(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
}

export function newId() {
  return Date.now() + Math.random();
}

// ── localStorage persistente ──────────────────────────────────────────────────
export function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch { return defaultValue; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}
