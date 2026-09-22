import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── Moduli del gestionale, raggruppati per macro-area ─────────────────────────
// Aggiungere qui una voce la rende disponibile sia nel menu sia nella scelta
// dei permessi quando si crea un ruolo.
export const GRUPPI = [
  {
    id: "viaggi", label: "Viaggi",
    moduli: [
      { id: "itinerari", label: "Itinerari" },
      { id: "booking",   label: "Input booking" },
      { id: "budget",    label: "Budget booking" },
      { id: "riepilogo", label: "Riepilogo per itinerario" },
    ],
  },
  {
    id: "amministrazione", label: "Amministrazione",
    moduli: [
      { id: "contabilita", label: "Contabilità" },
    ],
  },
  {
    id: "gestione", label: "Gestione",
    moduli: [
      { id: "utenti",       label: "Utenti" },
      { id: "ruoli",        label: "Ruoli e permessi" },
      { id: "registro",     label: "Registro attività" },
      { id: "cestino",      label: "Cestino" },
      { id: "impostazioni", label: "Impostazioni" },
    ],
  },
];

export const MODULI = GRUPPI.flatMap(g => g.moduli);
export const MODULO_LABEL = Object.fromEntries(MODULI.map(m => [m.id, m.label]));

export function canAccess(user, sezione) {
  return !!user?.permessi?.includes(sezione);
}

function mapRuolo(r) {
  return { id: r.id, chiave: r.chiave, nome: r.nome, permessi: r.permessi || [], superAdmin: r.super_admin, sistema: r.sistema };
}

function mapProfilo(p) {
  const ruoli = (p.profili_ruoli || []).map(x => mapRuolo(x.ruoli)).filter(Boolean);
  return {
    id: p.id, nome: p.nome, email: p.email, createdAt: p.created_at,
    ruoli,
    permessi: [...new Set(ruoli.flatMap(r => r.permessi))],
    superAdmin: ruoli.some(r => r.superAdmin),
  };
}

const SELECT_PROFILO = "*, profili_ruoli(ruoli(*))";

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
  const [ruoli,   setRuoli]   = useState([]);
  const [ready,   setReady]   = useState(false);   // sessione iniziale verificata
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const caricaProfilo = useCallback(async (session) => {
    if (!session) { setUser(null); setReady(true); return; }
    const { data, error } = await supabase.from("profili").select(SELECT_PROFILO).eq("id", session.user.id).single();
    if (data) {
      setUser(mapProfilo(data));
      setError("");
    } else {
      // Non disconnettiamo la sessione: può essere un errore temporaneo di rete
      setUser(null);
      setError(error?.message ? "Profilo non caricato: " + error.message : "Account senza profilo — contatta il Super Admin");
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
    const [{ data: pr }, { data: ru }] = await Promise.all([
      supabase.from("profili").select(SELECT_PROFILO).order("created_at"),
      supabase.from("ruoli").select("*").order("nome"),
    ]);
    setUtenti((pr || []).map(mapProfilo));
    setRuoli((ru || []).map(mapRuolo));
  }, []);

  useEffect(() => { if (user?.superAdmin) caricaUtenti(); }, [user, caricaUtenti]);

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

  const ricarica = async () => {
    await caricaUtenti();
    const { data } = await supabase.auth.getSession();
    if (data.session) await caricaProfilo(data.session);
  };

  // ── Utenti ─────────────────────────────────────────────────────────────────
  const creaUtente = async ({ nome, email, password, ruoli }) => {
    await adminUtenti({ action: "crea", nome, email, password, ruoli });
    await ricarica();
  };

  const modificaUtente = async (id, { nome, email, ruoli }) => {
    await adminUtenti({ action: "modifica", id, nome, email, ruoli });
    await ricarica();
  };

  const reimpostaPassword = async (id, password) => {
    await adminUtenti({ action: "password", id, password });
  };

  const eliminaUtente = async (id) => {
    await adminUtenti({ action: "elimina", id });
    await ricarica();
  };

  // ── Ruoli ──────────────────────────────────────────────────────────────────
  const creaRuolo = async ({ nome, permessi }) => {
    await adminUtenti({ action: "ruolo_crea", nome, permessi });
    await ricarica();
  };

  const modificaRuolo = async (id, { nome, permessi }) => {
    await adminUtenti({ action: "ruolo_modifica", id, nome, permessi });
    await ricarica();
  };

  const eliminaRuolo = async (id) => {
    await adminUtenti({ action: "ruolo_elimina", id });
    await ricarica();
  };

  return {
    user, utenti, ruoli, ready, loading, error,
    login, logout,
    creaUtente, modificaUtente, reimpostaPassword, eliminaUtente,
    creaRuolo, modificaRuolo, eliminaRuolo,
  };
}
