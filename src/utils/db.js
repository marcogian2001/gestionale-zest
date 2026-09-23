import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── Conversione righe DB → oggetti usati dalle sezioni ───────────────────────
function mapItinerario(row) {
  return {
    id: row.id, ni: row.ni, ns: row.ns,
    createdBy: row.created_by, createdAt: row.created_at,
    updatedBy: row.updated_by, updatedAt: row.updated_at,
    deletedBy: row.deleted_by, deletedAt: row.deleted_at,
    turni: (row.turni || [])
      .map(t => ({ id: t.id, n: t.n, in: t.data_in, out: t.data_out, cancelled: t.cancelled, pax: t.pax }))
      .sort((a, b) => a.n - b.n),
  };
}

function mapSpesa(row) {
  return {
    id: row.id,
    itId: row.itinerario_id, itNome: row.itinerari?.ni || "",
    turnoId: row.turno_id,
    turnoN: row.turni?.n, turnoIn: row.turni?.data_in, turnoOut: row.turni?.data_out, turnoPax: row.turni?.pax,
    cat: row.cat, fornitore: row.fornitore, desc: row.descrizione,
    importo: Number(row.importo),
    data: row.data, dataFattura: row.data_fattura, fattura: row.fattura,
    modalita: row.modalita, da: row.effettuato_da, note: row.note,
    driveUrl: row.drive_url,
    gruppoId: row.gruppo_id,
    ripartizioneProvvisoria: row.ripartizione_provvisoria,
    ripartizioneSistemataAt: row.ripartizione_sistemata_at,
    ripartizioneSistemataBy: row.ripartizione_sistemata_by,
    tipo: row.tipo, origineId: row.spesa_origine_id, statoDoc: row.stato_doc,
    alert: row.alert_contabilita, alertRisoltoAt: row.alert_risolto_at, alertRisoltoBy: row.alert_risolto_by,
    createdBy: row.created_by, createdAt: row.created_at,
    updatedBy: row.updated_by, updatedAt: row.updated_at,
    deletedBy: row.deleted_by, deletedAt: row.deleted_at,
  };
}

export { mapItinerario, mapSpesa };

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
  const [nomiUtenti, setNomiUtenti] = useState({});
  const [aree, setAree] = useState([]);
  const [cartelle, setCartelle] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const reload = useCallback(async () => {
    const [it, sp, imp, pr, ar, ca] = await Promise.all([
      supabase.from("itinerari")
        .select("*, turni(id, n, data_in, data_out, cancelled, pax, deleted_at)")
        .is("deleted_at", null)
        .order("created_at"),
      supabase.from("spese")
        .select("*, itinerari(ni), turni(n, data_in, data_out, pax)")
        .is("deleted_at", null)
        .order("created_at"),
      supabase.from("impostazioni").select("chiave, valore"),
      supabase.from("profili").select("id, nome"),
      supabase.from("aree").select("*").order("nome"),
      supabase.from("drive_cartelle").select("*"),
    ]);
    const err = it.error || sp.error || imp.error || pr.error;
    if (err) { showToast("Errore caricamento dati: " + err.message); setLoading(false); return; }
    setItinerari(it.data.map(r => mapItinerario({ ...r, turni: r.turni.filter(t => !t.deleted_at) })));
    setNomiUtenti(Object.fromEntries(pr.data.map(p => [p.id, p.nome])));
    setAree((ar.data || []).map(a => ({ id: a.id, nome: a.nome, driveFolderId: a.drive_folder_id })));
    setCartelle(ca.data || []);
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
      turni.map((t, i) => ({ itinerario_id: data.id, n: i + 1, data_in: t.in, data_out: t.out, pax: t.pax || null }))
    ));
  };

  // Le eliminazioni spostano nel cestino (deleted_at), non cancellano davvero.
  const eliminaItinerario = (id) =>
    run(supabase.from("itinerari").update({ deleted_at: new Date().toISOString() }).eq("id", id));

  const aggiornaPaxTurno = (turnoId, pax) =>
    run(supabase.from("turni").update({ pax: pax === "" ? null : Number(pax) }).eq("id", turnoId));

  const setTurnoAnnullato = (turnoId, cancelled) =>
    run(supabase.from("turni").update({ cancelled }).eq("id", turnoId));

  const aggiungiTurni = (itId, turni) => {
    const esistenti = itinerari.find(x => x.id === itId)?.turni.length || 0;
    return run(supabase.from("turni").insert(
      turni.map((t, i) => ({ itinerario_id: itId, n: esistenti + i + 1, data_in: t.in, data_out: t.out, pax: t.pax || null }))
    ));
  };

  // ── Spese ──────────────────────────────────────────────────────────────────
  // Righe di una fattura ripartita su più turni: stesso gruppo, stesso documento
  const creaSpeseRipartite = (base, quote) => {
    const gruppo = crypto.randomUUID();
    return run(supabase.from("spese").insert(quote.map(q => ({
      itinerario_id: base.itId, turno_id: q.turnoId,
      gruppo_id: gruppo,
      cat: base.cat, fornitore: base.fornitore, descrizione: base.desc,
      importo: q.importo, data: base.data || null, data_fattura: base.dataFattura || null,
      fattura: base.fattura, modalita: base.modalita, effettuato_da: base.da, note: base.note,
      drive_url: base.driveUrl, tipo: "pagamento",
      stato_doc: base.statoDoc || "caricato", alert_contabilita: base.alert || null,
      ripartizione_provvisoria: !!base.provvisoria,
    }))));
  };

  // Rifà la ripartizione di un gruppo: aggiorna le quote esistenti, ne aggiunge
  // di nuove e manda nel cestino i turni tolti (bloccato se hanno rimborsi).
  const ripartisciSpesa = async (spesa, quote) => {
    const gruppo = spesa.gruppoId || crypto.randomUUID();
    const righe = spese.filter(s => s.gruppoId && s.gruppoId === spesa.gruppoId);
    const attuali = righe.length ? righe : [spesa];

    for (const q of quote) {
      const esistente = attuali.find(r => r.turnoId === q.turnoId);
      if (esistente) {
        const { error } = await supabase.from("spese")
          .update({ importo: q.importo, gruppo_id: gruppo }).eq("id", esistente.id);
        if (error) { showToast(messaggioErrore(error)); await reload(); return false; }
      } else {
        const base = attuali[0];
        const { error } = await supabase.from("spese").insert({
          itinerario_id: base.itId, turno_id: q.turnoId, gruppo_id: gruppo,
          cat: base.cat, fornitore: base.fornitore, descrizione: base.desc,
          importo: q.importo, data: base.data || null, data_fattura: base.dataFattura || null,
          fattura: base.fattura, modalita: base.modalita, effettuato_da: base.da, note: base.note,
          drive_url: base.driveUrl, tipo: "pagamento", stato_doc: base.statoDoc || "caricato",
          ripartizione_provvisoria: !!base.ripartizioneProvvisoria,
        });
        if (error) { showToast(messaggioErrore(error)); await reload(); return false; }
      }
    }

    for (const r of attuali) {
      if (!quote.some(q => q.turnoId === r.turnoId)) {
        const { error } = await supabase.from("spese")
          .update({ deleted_at: new Date().toISOString() }).eq("id", r.id);
        if (error) { showToast(messaggioErrore(error)); await reload(); return false; }
      }
    }

    await reload();
    return true;
  };

  // «Gestito» sui costi comuni: la ripartizione non è più provvisoria
  const segnaRipartizioneSistemata = (spesa, provvisoria = false) => {
    const righe = spesa.gruppoId
      ? spese.filter(s => s.gruppoId === spesa.gruppoId).map(s => s.id)
      : [spesa.id];
    return run(supabase.from("spese")
      .update({ ripartizione_provvisoria: provvisoria }).in("id", righe));
  };

  const creaSpesa = (s) => run(supabase.from("spese").insert({
    itinerario_id: s.itId, turno_id: s.turnoId,
    cat: s.cat, fornitore: s.fornitore, descrizione: s.desc,
    importo: s.importo, data: s.data || null, data_fattura: s.dataFattura || null, fattura: s.fattura,
    modalita: s.modalita, effettuato_da: s.da, note: s.note,
    drive_url: s.driveUrl,
    tipo: s.tipo || "pagamento", spesa_origine_id: s.origineId || null,
    stato_doc: s.statoDoc || "caricato", alert_contabilita: s.alert || null,
  }));

  // Carica in un secondo momento il documento di una spesa "in attesa"
  const collegaDocumento = (id, driveUrl, { fattura, dataFattura }) =>
    run(supabase.from("spese").update({
      drive_url: driveUrl, stato_doc: "caricato",
      fattura, data_fattura: dataFattura,
    }).eq("id", id));

  // Da «in attesa» a «non recuperabile»: passaggio definitivo, con alert alla contabilità
  const segnaNonRecuperabile = (spesa, origine) => {
    const rimborso = spesa.tipo === "rimborso";
    const fattura = rimborso ? `Rimb-doc-${origine?.fattura || "senza-numero"}` : spesa.fattura;
    const alert = rimborso
      ? `Rimborso senza documento di storno: registrare un documento fittizio ai fini IVA (rif. fattura ${origine?.fattura || "senza numero"}).`
      : "Fattura non recuperabile: verificare il trattamento contabile della spesa senza documento.";
    return run(supabase.from("spese").update({
      stato_doc: rimborso ? "senza_storno" : "non_recuperabile",
      fattura,
      alert_contabilita: alert,
      alert_risolto_at: null,
    }).eq("id", spesa.id));
  };

  // Sblocco (solo Super Admin): un documento dato per perso salta fuori
  const sbloccaDocumento = (spesa) => run(supabase.from("spese").update({
    stato_doc: "in_attesa",
    alert_contabilita: `Documento recuperato dopo essere stato segnato come non recuperabile${spesa.fattura ? ` (${spesa.fattura})` : ""}: verificare l'eventuale documento fittizio già registrato.`,
    alert_risolto_at: null,
  }).eq("id", spesa.id));

  const risolviAlert = (id, risolto = true) =>
    run(supabase.from("spese").update({ alert_risolto_at: risolto ? new Date().toISOString() : null }).eq("id", id));

  const modificaSpesa = (id, s) => run(supabase.from("spese").update({
    itinerario_id: s.itId, turno_id: s.turnoId,
    cat: s.cat, fornitore: s.fornitore, descrizione: s.desc,
    importo: s.importo, data: s.data || null, data_fattura: s.dataFattura || null, fattura: s.fattura,
    modalita: s.modalita, effettuato_da: s.da, note: s.note,
  }).eq("id", id));

  const eliminaSpesa = (id) =>
    run(supabase.from("spese").update({ deleted_at: new Date().toISOString() }).eq("id", id));

  const ripristina = (tabella, id) =>
    run(supabase.from(tabella).update({ deleted_at: null }).eq("id", id));

  const annullaAzione = (logId) => run(supabase.rpc("annulla_azione", { p_log_id: logId }));

  // ── Impostazioni ───────────────────────────────────────────────────────────
  const salvaImpostazione = (chiave, valore) =>
    run(supabase.from("impostazioni").upsert({ chiave, valore }));

  const nomeUtente = (id) => (id && nomiUtenti[id]) || "—";

  // ── Aree e cartelle Drive ──────────────────────────────────────────────────
  const area = (nome) => aree.find(a => a.nome === nome) || null;

  const salvaArea = (id, driveFolderId) =>
    run(supabase.from("aree").update({ drive_folder_id: driveFolderId }).eq("id", id));

  const creaArea = (nome, driveFolderId) =>
    run(supabase.from("aree").insert({ nome, drive_folder_id: driveFolderId }));

  // Cache delle cartelle create su Drive (mese 0 = cartella dell'anno)
  const cacheCartelle = (areaId) => ({
    get: (anno, mese) =>
      cartelle.find(c => c.area_id === areaId && c.anno === anno && c.mese === mese)?.folder_id || null,
    salva: async (anno, mese, folderId) => {
      const { data } = await supabase.from("drive_cartelle")
        .insert({ area_id: areaId, anno, mese, folder_id: folderId })
        .select().single();
      if (data) setCartelle(prev => [...prev, data]);
    },
  });

  return {
    itinerari, spese, impostazioni, loading, reload, nomeUtente,
    aree, area, salvaArea, creaArea, cacheCartelle,
    ripristina, annullaAzione,
    creaItinerario, eliminaItinerario, setTurnoAnnullato, aggiungiTurni, aggiornaPaxTurno,
    creaSpeseRipartite, ripartisciSpesa, segnaRipartizioneSistemata,
    creaSpesa, modificaSpesa, eliminaSpesa, collegaDocumento, segnaNonRecuperabile, sbloccaDocumento, risolviAlert, salvaImpostazione,
  };
}
