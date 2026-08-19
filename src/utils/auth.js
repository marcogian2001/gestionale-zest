import { useState, useEffect, createContext, useContext } from "react";

// ── Ruoli disponibili ─────────────────────────────────────────────────────────
export const RUOLI = {
  SUPER_ADMIN: "super_admin",
  ADMIN:       "admin",
};

export const RUOLI_LABEL = {
  super_admin: "Super Admin",
  admin:       "Admin / Supervisore",
};

// ── Permessi per ruolo ────────────────────────────────────────────────────────
// Definisce cosa vede ogni ruolo nel menu
export const PERMESSI = {
  super_admin: ["itinerari", "booking", "budget", "riepilogo", "utenti", "impostazioni"],
  admin:       ["itinerari", "booking", "budget", "riepilogo"],
};

export function canAccess(ruolo, sezione) {
  return (PERMESSI[ruolo] || []).includes(sezione);
}

// ── Hash password semplice (SHA-256 via Web Crypto) ───────────────────────────
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "zest_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function loadUtenti() {
  try { return JSON.parse(localStorage.getItem("zest_utenti") || "[]"); } catch { return []; }
}
function saveUtenti(utenti) {
  localStorage.setItem("zest_utenti", JSON.stringify(utenti));
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem("zest_session") || "null"); } catch { return null; }
}
function saveSession(user) {
  localStorage.setItem("zest_session", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("zest_session");
}

// ── Crea Super Admin di default se non esiste ─────────────────────────────────
export async function initDefaultAdmin() {
  const utenti = loadUtenti();
  if (utenti.length === 0) {
    const hash = await hashPassword("zest2026!");
    const admin = {
      id: "1",
      nome: "Super Admin",
      email: "admin@zestfamily.it",
      passwordHash: hash,
      ruolo: RUOLI.SUPER_ADMIN,
      createdAt: new Date().toISOString(),
    };
    saveUtenti([admin]);
  }
}

// ── Auth Context ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// ── Hook principale ───────────────────────────────────────────────────────────
export function useAuthState() {
  const [user, setUser]       = useState(loadSession);
  const [utenti, setUtenti]   = useState(loadUtenti);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Inizializza admin di default
  useEffect(() => { initDefaultAdmin().then(() => setUtenti(loadUtenti())); }, []);

  const login = async (email, password) => {
    setLoading(true); setError("");
    try {
      const hash = await hashPassword(password);
      const utenti = loadUtenti();
      const found = utenti.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hash);
      if (!found) { setError("Email o password non corretti"); setLoading(false); return false; }
      const session = { id: found.id, nome: found.nome, email: found.email, ruolo: found.ruolo };
      saveSession(session);
      setUser(session);
      setLoading(false);
      return true;
    } catch { setError("Errore durante il login"); setLoading(false); return false; }
  };

  const logout = () => { clearSession(); setUser(null); };

  const creaUtente = async ({ nome, email, password, ruolo }) => {
    const utenti = loadUtenti();
    if (utenti.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email già in uso");
    }
    const hash = await hashPassword(password);
    const nuovo = { id: Date.now().toString(), nome, email, passwordHash: hash, ruolo, createdAt: new Date().toISOString() };
    const aggiornati = [...utenti, nuovo];
    saveUtenti(aggiornati);
    setUtenti(aggiornati);
    return nuovo;
  };

  const modificaUtente = async (id, { nome, email, ruolo }) => {
    const utenti = loadUtenti();
    const aggiornati = utenti.map(u => u.id === id ? { ...u, nome, email, ruolo } : u);
    saveUtenti(aggiornati);
    setUtenti(aggiornati);
  };

  const reimpostaPassword = async (id, nuovaPassword) => {
    const hash = await hashPassword(nuovaPassword);
    const utenti = loadUtenti();
    const aggiornati = utenti.map(u => u.id === id ? { ...u, passwordHash: hash } : u);
    saveUtenti(aggiornati);
    setUtenti(aggiornati);
  };

  const eliminaUtente = (id) => {
    const utenti = loadUtenti();
    const aggiornati = utenti.filter(u => u.id !== id);
    saveUtenti(aggiornati);
    setUtenti(aggiornati);
  };

  return { user, utenti, loading, error, login, logout, creaUtente, modificaUtente, reimpostaPassword, eliminaUtente };
}
