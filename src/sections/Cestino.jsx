import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";
import { mapItinerario, mapSpesa } from "../utils/db";
import { fmt, fmtDate } from "../utils/helpers";
import {
  SectionTitle, SectionSubTitle, Empty, Th, Td, tableStyle, btnSm, Badge, fmtDataOra,
} from "../components/UI";

export default function SezioneCestino({ db, showToast }) {
  const [itinerari, setItinerari] = useState([]);
  const [spese,     setSpese]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  const carica = useCallback(async () => {
    const [it, sp] = await Promise.all([
      supabase.from("itinerari").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      supabase.from("spese").select("*, itinerari(ni), turni(n, data_in, data_out)")
        .not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
    ]);
    if (it.error || sp.error) { showToast("Errore caricamento cestino"); setLoading(false); return; }
    setItinerari(it.data.map(mapItinerario));
    setSpese(sp.data.map(mapSpesa));
    setLoading(false);
  }, [showToast]);

  useEffect(() => { carica(); }, [carica]);

  const ripristina = async (tabella, id) => {
    if (await db.ripristina(tabella, id)) { showToast("Elemento ripristinato"); carica(); }
  };

  const eliminato = (x) => (
    <span style={{ fontSize: 11, color: "#6B7280" }}>
      {db.nomeUtente(x.deletedBy)} <span style={{ color: "#9CA3AF" }}>· {fmtDataOra(x.deletedAt)}</span>
    </span>
  );

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "#9CA3AF" }}>Caricamento...</div>;

  return (
    <div>
      <SectionTitle>Cestino</SectionTitle>
      <p style={{ fontSize: 13, color: "#6B7280", marginTop: -8, marginBottom: 16 }}>
        Gli elementi eliminati restano qui e possono essere ripristinati in qualsiasi momento.
      </p>

      <SectionSubTitle>Spese eliminate</SectionSubTitle>
      {spese.length === 0 ? <Empty>Nessuna spesa nel cestino</Empty> : (
        <div className="tabella-scroll" style={{ overflowX: "auto" }}>
          <div><table style={tableStyle}>
            <thead>
              <tr>{["Itinerario", "Turno", "Cat.", "Descrizione", "Fornitore", "Importo", "Eliminata da", ""].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {spese.map(s => (
                <tr key={s.id}>
                  <Td><span style={{ fontWeight: 500 }}>{s.itNome}</span></Td>
                  <Td style={{ fontSize: 11 }}>T{s.turnoN} · {fmtDate(s.turnoIn)}</Td>
                  <Td><Badge cat={s.cat} /></Td>
                  <Td>{s.desc}</Td>
                  <Td style={{ color: "#6B7280" }}>{s.fornitore}</Td>
                  <Td><span style={{ fontWeight: 600 }}>€ {fmt(s.importo)}</span></Td>
                  <Td>{eliminato(s)}</Td>
                  <Td><button onClick={() => ripristina("spese", s.id)} style={btnSm}>↩ Ripristina</button></Td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      <SectionSubTitle>Itinerari eliminati</SectionSubTitle>
      {itinerari.length === 0 ? <Empty>Nessun itinerario nel cestino</Empty> : (
        <div className="tabella-scroll"><table style={tableStyle}>
          <thead>
            <tr>{["Nome interno", "Nome sito", "Eliminato da", ""].map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody>
            {itinerari.map(it => (
              <tr key={it.id}>
                <Td><span style={{ fontWeight: 600 }}>{it.ni}</span></Td>
                <Td style={{ color: "#6B7280" }}>{it.ns}</Td>
                <Td>{eliminato(it)}</Td>
                <Td><button onClick={() => ripristina("itinerari", it.id)} style={btnSm}>↩ Ripristina</button></Td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
