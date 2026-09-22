import { useState } from "react";
import { GRUPPI, MODULO_LABEL } from "../utils/auth";
import {
  Card, CardTitle, SectionTitle, Field, Input, Empty,
  btnPrimary, btnSecondary, btnDanger, btnSm, conferma,
} from "../components/UI";

const VUOTO = { nome: "", permessi: [] };

export default function SezioneRuoli({ ruoli, onCrea, onModifica, onElimina, showToast }) {
  const [form,    setForm]    = useState(VUOTO);
  const [editId,  setEditId]  = useState(null);
  const [errore,  setErrore]  = useState("");
  const [loading, setLoading] = useState(false);

  const attivo = (m) => form.permessi.includes(m);

  const toggle = (m) => setForm(f => ({
    ...f,
    permessi: f.permessi.includes(m) ? f.permessi.filter(x => x !== m) : [...f.permessi, m],
  }));

  const toggleGruppo = (g) => {
    const tutti = g.moduli.every(m => attivo(m.id));
    setForm(f => ({
      ...f,
      permessi: tutti
        ? f.permessi.filter(x => !g.moduli.some(m => m.id === x))
        : [...new Set([...f.permessi, ...g.moduli.map(m => m.id)])],
    }));
  };

  const annulla = () => { setEditId(null); setForm(VUOTO); setErrore(""); };

  const salva = async () => {
    setErrore(""); setLoading(true);
    try {
      if (editId) { await onModifica(editId, form); showToast("Ruolo aggiornato"); }
      else        { await onCrea(form);             showToast("Ruolo creato"); }
      annulla();
    } catch (e) { setErrore(e.message); }
    setLoading(false);
  };

  const elimina = async (r) => {
    if (!(await conferma(`Eliminare il ruolo "${r.nome}"?`))) return;
    try { await onElimina(r.id); showToast("Ruolo eliminato"); }
    catch (e) { setErrore(e.message); }
  };

  return (
    <div>
      <SectionTitle>Ruoli e permessi</SectionTitle>
      <p style={{ fontSize: 13, color: "#6B7280", marginTop: -10, marginBottom: 18 }}>
        Ogni ruolo vede solo i moduli che gli assegni. Una persona può avere più ruoli:
        in quel caso vede la somma dei moduli.
      </p>

      <Card>
        <CardTitle>{editId ? "Modifica ruolo" : "Nuovo ruolo"}</CardTitle>
        <div style={{ maxWidth: 360, marginBottom: 18 }}>
          <Field label="Nome del ruolo">
            <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="es. Booking, Coordinatore, Finance" />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
          {GRUPPI.map(g => {
            const tutti = g.moduli.every(m => attivo(m.id));
            return (
              <div key={g.id} style={{ border: "1px solid #E9EBEF", borderRadius: 12, padding: "12px 14px", background: "#FCFCFD" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>{g.label}</span>
                  <button onClick={() => toggleGruppo(g)} style={{ ...btnSm, fontSize: 10 }}>
                    {tutti ? "Deseleziona" : "Tutti"}
                  </button>
                </div>
                {g.moduli.map(m => (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", padding: "4px 0", cursor: "pointer" }}>
                    <input type="checkbox" checked={attivo(m.id)} onChange={() => toggle(m.id)} />
                    {m.label}
                  </label>
                ))}
              </div>
            );
          })}
        </div>

        {errore && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "9px 13px", fontSize: 12, color: "#EF4444", marginTop: 14 }}>
            {errore}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          {editId && <button onClick={annulla} style={btnSecondary}>Annulla</button>}
          <button onClick={salva} style={btnPrimary} disabled={loading || !form.nome.trim() || !form.permessi.length}>
            {loading ? "Salvataggio..." : editId ? "Salva modifiche" : "Crea ruolo"}
          </button>
        </div>
      </Card>

      <CardTitle>Ruoli esistenti</CardTitle>
      {ruoli.length === 0 ? <Empty>Nessun ruolo</Empty> : (
        <div style={{ display: "grid", gap: 10 }}>
          {ruoli.map(r => (
            <Card key={r.id} style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{r.nome}</span>
                    {r.superAdmin && <Tag color="#92400E" bg="#FEF3C7" border="#FDE68A">Amministratore</Tag>}
                    {r.sistema && <Tag color="#6B7280" bg="#F3F4F6" border="#E5E7EB">Ruolo di base</Tag>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {r.permessi.map(p => (
                      <Tag key={p} color="#4338CA" bg="#EEF2FF" border="#C7D2FE">{MODULO_LABEL[p] || p}</Tag>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setEditId(r.id); setForm({ nome: r.nome, permessi: r.permessi }); setErrore(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={btnSm}>
                    Modifica
                  </button>
                  {!r.sistema && <button onClick={() => elimina(r)} style={btnDanger}>Elimina</button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ children, color, bg, border }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, fontSize: 10, padding: "2px 9px", fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
