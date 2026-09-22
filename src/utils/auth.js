import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

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
  super_admin: ["itinerari", "booking", "budget", "riepilogo", "utenti", "registro", "cestino", "impostazioni"],
  admin:       ["itinerari", "booking", "budget", "riepilogo"],
};

export function canAccess(ruolo, sezione) {
  return (PERMESSI[ruolo] || []).includes(sezione);
}

function mapProfilo(p) {
  return { id: p.id, nome: p.nome, email: p.email, ruolo: p.ruolo, createdAt: p.created_at };
}

// Chiama la Edge Function "admin-utenti" (solo Super Admin)
async function adminUtenti(body) {
  const { data, error } = await supabase.functions.invoke("admin-utenti", { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return data;
}

// ── Hook principale ───────────────────────────────────────────────────────────
export function useAuthState() {
  const [user,    setUser]    = useState(null);
  const [utenti,  setUtenti]  = useState([]);
  const [ready,   setReady]   = useState(false);   // sessione iniziale verificata
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const caricaProfilo = useCallback(async (session) => {
    if (!session) { setUser(null); setReady(true); return; }
    const { data } = await supabase.from("profili").select("*").eq("id", session.user.id).single();
    if (!data) {
      await supabase.auth.signOut();
      setUser(null);
      setError("Account senza profilo — contatta il Super Admin");
    } else {
      setUser(mapProfilo(data));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => caricaProfilo(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // setTimeout evita chiamate Supabase dentro il callback (deadlock noto)
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => caricaProfilo(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [caricaProfilo]);

  const caricaUtenti = useCallback(async () => {
    const { data } = await supabase.from("profili").select("*").order("created_at");
    setUtenti((data || []).map(mapProfilo));
  }, []);

  useEffect(() => { if (user?.ruolo === RUOLI.SUPER_ADMIN) caricaUtenti(); }, [user, caricaUtenti]);

  const login = async (email, password) => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Email o password non corretti" : "Errore durante il login");
      return false;
    }
    return true;
  };

  const logout = () => supabase.auth.signOut();

  const creaUtente = async ({ nome, email, password, ruolo }) => {
    await adminUtenti({ action: "crea", nome, email, password, ruolo });
    await caricaUtenti();
  };

  const modificaUtente = async (id, { nome, email, ruolo }) => {
    await adminUtenti({ action: "modifica", id, nome, email, ruolo });
    await caricaUtenti();
    if (id === user?.id) setUser(u => ({ ...u, nome, email, ruolo }));
  };

  const reimpostaPassword = async (id, password) => {
    await adminUtenti({ action: "password", id, password });
  };

  const eliminaUtente = async (id) => {
    await adminUtenti({ action: "elimina", id });
    await caricaUtenti();
  };

  return { user, utenti, ready, loading, error, login, logout, creaUtente, modificaUtente, reimpostaPassword, eliminaUtente };
}
