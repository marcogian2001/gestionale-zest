import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── Conversione righe DB → oggetti usati dalle sezioni ───────────────────────
function mapItinerario(row) {
  return {
    id: row.id, ni: row.ni, ns: row.ns,
    turni: (row.turni || [])
      .map(t => ({ id: t.id, n: t.n, in: t.data_in, out: t.data_out, cancelled: t.cancelled }))
      .sort((a, b) => a.n - b.n),
  };
}

function mapSpesa(row) {
  return {
    id: row.id,
    itId: row.itinerario_id, itNome: row.itinerari?.ni || "",
    turnoId: row.turno_id,
    turnoN: row.turni?.n, turnoIn: row.turni?.data_in, turnoOut: row.turni?.data_out,
    cat: row.cat, fornitore: row.fornitore, desc: row.descrizione,
    importo: Number(row.importo),
    data: row.data, fattura: row.fattura,
    modalita: row.modalita, da: row.effettuato_da, note: row.note,
    driveUrl: row.drive_url,
  };
}

function messaggioErrore(error) {
  if (error?.code === "23503") return "Impossibile eliminare: ci sono spese collegate";
  return error?.message || "Errore di salvataggio";
}

// ── Hook principale dati condivisi ────────────────────────────────────────────
// Ogni azione restituisce true se è andata a buon fine; in caso di errore
// mostra un toast e restituisce false.
export function useZestData(enabled, showToast) {
  const [itinerari,  setItinerari]  = useState([]);
  const [spese,      setSpese]      = useState([]);
  const [impostazioni, setImpostazioni] = useState({});
  const [loading,    setLoading]    = useState(true);

  const reload = useCallback(async () => {
    const [it, sp, imp] = await Promise.all([
      supabase.from("itinerari")
        .select("id, ni, ns, turni(id, n, data_in, data_out, cancelled)")
        .order("created_at"),
      supabase.from("spese")
        .select("*, itinerari(ni), turni(n, data_in, data_out)")
        .order("created_at"),
      supabase.from("impostazioni").select("chiave, valore"),
    ]);
    const err = it.error || sp.error || imp.error;
    if (err) { showToast("Errore caricamento dati: " + err.message); setLoading(false); return; }
    setItinerari(it.data.map(mapItinerario));
    setSpese(sp.data.map(mapSpesa));
    setImpostazioni(Object.fromEntries(imp.data.map(r => [r.chiave, r.valore])));
    setLoading(false);
  }, [showToast]);

  // Carica all'accesso e ricarica quando si torna sulla finestra,
  // così si vedono le modifiche fatte dai colleghi.
  useEffect(() => {
    if (!enabled) return;
    reload();
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, reload]);

  const run = useCallback(async (query) => {
    const { error } = await query;
    if (error) { showToast(messaggioErrore(error)); return false; }
    await reload();
    return true;
  }, [reload, showToast]);

  // ── Itinerari e turni ──────────────────────────────────────────────────────
  const creaItinerario = async (ni, ns, turni) => {
    const { data, error } = await supabase.from("itinerari").insert({ ni, ns }).select("id").single();
    if (error) { showToast(messaggioErrore(error)); return false; }
    if (!turni.length) { await reload(); return true; }
    return run(supabase.from("turni").insert(
      turni.map((t, i) => ({ itinerario_id: data.id, n: i + 1, data_in: t.in, data_out: t.out }))
    ));
  };

  const eliminaItinerario = (id) => run(supabase.from("itinerari").delete().eq("id", id));

  const setTurnoAnnullato = (turnoId, cancelled) =>
    run(supabase.from("turni").update({ cancelled }).eq("id", turnoId));

  const aggiungiTurni = (itId, turni) => {
    const esistenti = itinerari.find(x => x.id === itId)?.turni.length || 0;
    return run(supabase.from("turni").insert(
      turni.map((t, i) => ({ itinerario_id: itId, n: esistenti + i + 1, data_in: t.in, data_out: t.out }))
    ));
  };

  // ── Spese ──────────────────────────────────────────────────────────────────
  const creaSpesa = (s) => run(supabase.from("spese").insert({
    itinerario_id: s.itId, turno_id: s.turnoId,
    cat: s.cat, fornitore: s.fornitore, descrizione: s.desc,
    importo: s.importo, data: s.data || null, fattura: s.fattura,
    modalita: s.modalita, effettuato_da: s.da, note: s.note,
    drive_url: s.driveUrl,
  }));

  const eliminaSpesa = (id) => run(supabase.from("spese").delete().eq("id", id));

  // ── Impostazioni ───────────────────────────────────────────────────────────
  const salvaImpostazione = (chiave, valore) =>
    run(supabase.from("impostazioni").upsert({ chiave, valore }));

  return {
    itinerari, spese, impostazioni, loading,
    creaItinerario, eliminaItinerario, setTurnoAnnullato, aggiungiTurni,
    creaSpesa, eliminaSpesa, salvaImpostazione,
  };
}
