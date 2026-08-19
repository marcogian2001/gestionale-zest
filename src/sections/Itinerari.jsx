import { useState } from "react";
import { newId, fmtDate } from "../utils/helpers";
import {
  Card, CardTitle, SectionTitle, SectionSubTitle, Field,
  Input, Select, Empty, Th, Td, btnPrimary, btnSecondary, btnDanger, btnSm, tableStyle,
} from "../components/UI";

export default function SezioneItinerari({ itinerari, setItinerari, showToast }) {
  const [ni, setNi] = useState("");
  const [ns, setNs] = useState("");
  const [turniNew, setTurniNew] = useState([{ id: newId(), in: "", out: "" }]);
  const [selManage, setSelManage] = useState("");

  const addTurno = () => setTurniNew(t => [...t, { id: newId(), in: "", out: "" }]);
  const removeTurno = (id) => setTurniNew(t => t.filter(x => x.id !== id));
  const updateTurno = (id, field, val) =>
    setTurniNew(t => t.map(x => x.id === id ? { ...x, [field]: val } : x));

  const saveIt = () => {
    if (!ni.trim()) return;
    const turni = turniNew
      .filter(t => t.in && t.out)
      .map((t, i) => ({ n: i + 1, in: t.in, out: t.out, cancelled: false }));
    setItinerari(prev => [...prev, { id: newId(), ni: ni.trim(), ns: ns.trim(), turni }]);
    setNi(""); setNs(""); setTurniNew([{ id: newId(), in: "", out: "" }]);
    showToast("Itinerario salvato");
  };

  const toggleCancelled = (itId, idx) => {
    setItinerari(prev => prev.map(it => {
      if (it.id !== itId) return it;
      const turni = it.turni.map((t, i) => i === idx ? { ...t, cancelled: !t.cancelled } : t);
      return { ...it, turni };
    }));
  };

  const deleteIt = (itId) => setItinerari(prev => prev.filter(x => x.id !== itId));

  const managed = itinerari.find(x => String(x.id) === selManage);

  return (
    <div>
      <SectionTitle>Itinerari</SectionTitle>

      {/* Nuovo itinerario */}
      <Card>
        <CardTitle>Nuovo itinerario</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Field label="Nome interno">
            <Input value={ni} onChange={e => setNi(e.target.value)} placeholder="es. LAPPONIA POLAR NIGHT" />
          </Field>
          <Field label="Nome sito">
            <Input value={ns} onChange={e => setNs(e.target.value)} placeholder="es. Lapponia: Polar Night Light Festival" />
          </Field>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
            Turni
          </label>
          {turniNew.map((t, i) => (
            <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#9CA3AF", minWidth: 22 }}>T{i + 1}</span>
              <Input type="date" value={t.in} onChange={e => updateTurno(t.id, "in", e.target.value)} style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>→</span>
              <Input type="date" value={t.out} onChange={e => updateTurno(t.id, "out", e.target.value)} style={{ flex: 1 }} />
              <button onClick={() => removeTurno(t.id)} style={btnDanger}>✕</button>
            </div>
          ))}
          <button onClick={addTurno} style={{ ...btnSecondary, fontSize: 11, marginTop: 4 }}>+ Aggiungi turno</button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={saveIt} style={btnPrimary}>Salva itinerario</button>
        </div>
      </Card>

      {/* Gestione turni */}
      <SectionSubTitle>Gestione turni</SectionSubTitle>
      <Card>
        <div style={{ maxWidth: 320, marginBottom: 16 }}>
          <Field label="Seleziona itinerario">
            <Select value={selManage} onChange={e => setSelManage(e.target.value)}>
              <option value="">Seleziona...</option>
              {itinerari.map(it => <option key={it.id} value={it.id}>{it.ni}</option>)}
            </Select>
          </Field>
        </div>
        {!managed ? (
          <Empty>Seleziona un itinerario per gestire i turni</Empty>
        ) : managed.turni.length === 0 ? (
          <Empty>Nessun turno</Empty>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>{["Turno", "Data in", "Data out", "Stato", ""].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {managed.turni.map((t, i) => (
                <tr key={i}>
                  <Td><span style={{ fontWeight: 600 }}>T{t.n}</span></Td>
                  <Td><span style={{ textDecoration: t.cancelled ? "line-through" : "none", color: t.cancelled ? "#9CA3AF" : "inherit" }}>{fmtDate(t.in)}</span></Td>
                  <Td><span style={{ textDecoration: t.cancelled ? "line-through" : "none", color: t.cancelled ? "#9CA3AF" : "inherit" }}>{fmtDate(t.out)}</span></Td>
                  <Td>
                    {t.cancelled
                      ? <span style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", borderRadius: 20, fontSize: 10, padding: "2px 8px" }}>Annullato</span>
                      : <span style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", borderRadius: 20, fontSize: 10, padding: "2px 8px" }}>Attivo</span>}
                  </Td>
                  <Td>
                    <button onClick={() => toggleCancelled(managed.id, i)} style={btnSm}>
                      {t.cancelled ? "Riattiva" : "Annulla"}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Lista itinerari */}
      <SectionSubTitle>Tutti gli itinerari</SectionSubTitle>
      {itinerari.length === 0 ? <Empty>Nessun itinerario ancora</Empty> : (
        itinerari.map(it => (
          <Card key={it.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{it.ni}</span>
                <span style={{ color: "#6B7280", fontSize: 12, marginLeft: 10 }}>{it.ns}</span>
              </div>
              <button onClick={() => deleteIt(it.id)} style={btnDanger}>Elimina</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {it.turni.map((t, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 20,
                  background: t.cancelled ? "#F3F4F6" : "#F0F9FF",
                  color: t.cancelled ? "#9CA3AF" : "#0369A1",
                  border: `1px solid ${t.cancelled ? "#E5E7EB" : "#BAE6FD"}`,
                  textDecoration: t.cancelled ? "line-through" : "none",
                }}>
                  T{t.n}: {fmtDate(t.in)} → {fmtDate(t.out)}
                </span>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
