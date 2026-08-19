import { useState } from "react";
import { RUOLI, RUOLI_LABEL } from "../utils/auth";
import {
  Card, CardTitle, SectionTitle, Field, Input, Select, Empty,
  Th, Td, tableStyle, btnPrimary, btnSecondary, btnDanger, btnSm,
} from "../components/UI";

const FORM_EMPTY = { nome: "", email: "", password: "", ruolo: RUOLI.ADMIN };

export default function SezioneUtenti({ utenti, onCrea, onModifica, onReimposta, onElimina, showToast, currentUser }) {
  const [form,       setForm]       = useState(FORM_EMPTY);
  const [editId,     setEditId]     = useState(null);
  const [resetId,    setResetId]    = useState(null);
  const [nuovaPass,  setNuovaPass]  = useState("");
  const [errore,     setErrore]     = useState("");
  const [loading,    setLoading]    = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const salva = async () => {
    setErrore(""); setLoading(true);
    try {
      if (editId) {
        await onModifica(editId, { nome: form.nome, email: form.email, ruolo: form.ruolo });
        showToast("Utente aggiornato");
        setEditId(null);
      } else {
        if (!form.password) { setErrore("Inserisci una password"); setLoading(false); return; }
        await onCrea(form);
        showToast("Utente creato");
      }
      setForm(FORM_EMPTY);
    } catch (e) { setErrore(e.message); }
    setLoading(false);
  };

  const avviaModifica = (u) => {
    setEditId(u.id);
    setForm({ nome: u.nome, email: u.email, password: "", ruolo: u.ruolo });
    setErrore("");
  };

  const annullaModifica = () => { setEditId(null); setForm(FORM_EMPTY); setErrore(""); };

  const reimposta = async () => {
    if (!nuovaPass) return;
    setLoading(true);
    try {
      await onReimposta(resetId, nuovaPass);
      showToast("Password reimpostata");
      setResetId(null); setNuovaPass("");
    } catch { setErrore("Errore reimpostazione"); }
    setLoading(false);
  };

  return (
    <div>
      <SectionTitle>Gestione utenti</SectionTitle>

      {/* Form crea / modifica */}
      <Card>
        <CardTitle>{editId ? "Modifica utente" : "Nuovo utente"}</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nome"><Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="es. Simone Lodovici" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="es. simone@zestfamily.it" /></Field>
          {!editId && (
            <Field label="Password"><Input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Minimo 8 caratteri" /></Field>
          )}
          <Field label="Ruolo">
            <Select value={form.ruolo} onChange={e => set("ruolo", e.target.value)}>
              {Object.entries(RUOLI_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
          </Field>
        </div>
        {errore && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#EF4444", marginTop: 12 }}>
            {errore}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          {editId && <button onClick={annullaModifica} style={btnSecondary}>Annulla</button>}
          <button onClick={salva} style={btnPrimary} disabled={loading}>
            {loading ? "Salvataggio..." : editId ? "Salva modifiche" : "Crea utente"}
          </button>
        </div>
      </Card>

      {/* Modal reimposta password */}
      {resetId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Reimposta password</div>
            <Field label="Nuova password">
              <Input type="password" value={nuovaPass} onChange={e => setNuovaPass(e.target.value)} placeholder="Minimo 8 caratteri" autoFocus />
            </Field>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => { setResetId(null); setNuovaPass(""); }} style={btnSecondary}>Annulla</button>
              <button onClick={reimposta} style={btnPrimary} disabled={loading || !nuovaPass}>
                {loading ? "..." : "Reimposta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista utenti */}
      <SectionTitle style={{ marginTop: 24 }}>Utenti registrati</SectionTitle>
      {utenti.length === 0 ? <Empty>Nessun utente</Empty> : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>{["Nome", "Email", "Ruolo", "Creato il", ""].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {utenti.map(u => (
                <tr key={u.id} style={{ background: u.id === currentUser?.id ? "#FAFAFA" : "transparent" }}>
                  <Td>
                    <span style={{ fontWeight: 500 }}>{u.nome}</span>
                    {u.id === currentUser?.id && <span style={{ fontSize: 10, color: "#9CA3AF", marginLeft: 6 }}>(tu)</span>}
                  </Td>
                  <Td style={{ color: "#6B7280" }}>{u.email}</Td>
                  <Td>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                      background: u.ruolo === "super_admin" ? "#FEF3C7" : "#EEF2FF",
                      color:      u.ruolo === "super_admin" ? "#92400E"  : "#4338CA",
                      border:     `1px solid ${u.ruolo === "super_admin" ? "#FDE68A" : "#C7D2FE"}`,
                    }}>
                      {RUOLI_LABEL[u.ruolo]}
                    </span>
                  </Td>
                  <Td style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("it-IT") : "—"}
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => avviaModifica(u)} style={btnSm}>Modifica</button>
                      <button onClick={() => setResetId(u.id)} style={btnSm}>Password</button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => onElimina(u.id)} style={btnDanger}>Elimina</button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
