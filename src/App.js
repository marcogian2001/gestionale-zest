import { useState, useEffect, useCallback } from "react";
import { useZestData } from "./utils/db";
import { useAuthState, canAccess, GRUPPI } from "./utils/auth";

import SezioneItinerari    from "./sections/Itinerari";
import SezioneInputBooking from "./sections/InputBooking";
import SezioneBudget       from "./sections/BudgetBooking";
import SezioneRiepilogo    from "./sections/Riepilogo";
import SezioneImpostazioni from "./sections/Impostazioni";
import SezioneUtenti       from "./sections/Utenti";
import SezioneRuoli        from "./sections/Ruoli";
import SezioneRegistro     from "./sections/Registro";
import SezioneCestino      from "./sections/Cestino";
import SezioneContabilita  from "./sections/Contabilita";
import LoginPage           from "./components/LoginPage";
import CambioPassword      from "./components/CambioPassword";
import { Toast, ConfirmHost } from "./components/UI";

const FONT = "'DM Sans','Segoe UI',system-ui,sans-serif";

export default function App() {
  const { user, utenti, ruoli, ready, loading: authLoading, error: authError, login, logout,
          creaUtente, modificaUtente, reimpostaPassword, eliminaUtente,
          bloccaUtente, forzaCambioPassword, cambiaPasswordPersonale,
          creaRuolo, modificaRuolo, eliminaRuolo } = useAuthState();

  const [section, setSection] = useState("itinerari");
  const [toast,   setToast]   = useState("");
  const [cambioPsw, setCambioPsw] = useState(false);
  const [menuAperto, setMenuAperto] = useState(false);   // barra laterale su telefono

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(""), 2800);
  }, []);

  const db = useZestData(!!user, showToast);
  const clientId = db.impostazioni.google_client_id || "";

  // Prima sezione accessibile per i ruoli dell'utente
  const moduliVisibili = GRUPPI.flatMap(g => g.moduli).filter(m => canAccess(user, m.id));
  const home = moduliVisibili[0]?.id || "itinerari";

  useEffect(() => { window._googleClientId = clientId; }, [clientId]);
  useEffect(() => { if (user) setSection(home); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (user && !canAccess(user, section)) setSection(home); }, [user, section, home]);

  if (!ready) return <Schermo>Caricamento...</Schermo>;
  if (!user)  return <LoginPage onLogin={login} loading={authLoading} error={authError} />;

  if (!user.attivo) return (
    <Schermo>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Account bloccato</div>
      <div style={{ marginBottom: 18 }}>Il tuo accesso è stato sospeso. Contatta il Super Admin.</div>
      <button onClick={logout} style={{ fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, padding: "9px 18px", borderRadius: 10, border: "1px solid #DFE3E8", background: "#fff", cursor: "pointer" }}>Esci</button>
    </Schermo>
  );

  if (user.richiediCambio) return (
    <CambioPassword obbligatorio onCambia={cambiaPasswordPersonale} onLogout={logout} />
  );

  const alertAperti = db.spese.filter(s => s.alert && !s.alertRisoltoAt).length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: FONT, background: "#F6F7F9", color: "#111827" }}>

      {/* Barra in alto: solo su telefono */}
      <div className="barra-mobile" style={{
        display: "none", position: "fixed", top: 0, left: 0, right: 0, height: 56, zIndex: 30,
        background: "#fff", borderBottom: "1px solid #ECEEF1", alignItems: "center", gap: 12, padding: "0 14px",
      }}>
        <button onClick={() => setMenuAperto(true)} aria-label="Apri il menu" style={{
          fontSize: 20, lineHeight: 1, background: "#fff", border: "1px solid #E5E7EB",
          borderRadius: 10, padding: "6px 11px", cursor: "pointer",
        }}>☰</button>
        <img src="/logo.png" alt="Zest" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
        <div style={{ fontSize: 14, fontWeight: 800 }}>ZEST</div>
        {alertAperti > 0 && (
          <span style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "2px 7px" }}>
            {alertAperti}
          </span>
        )}
      </div>

      {menuAperto && (
        <div onClick={() => setMenuAperto(false)} className="sfondo-menu" style={{
          position: "fixed", inset: 0, background: "rgba(17,24,39,0.35)", zIndex: 40, display: "none",
        }} />
      )}

      <nav className={`barra-laterale${menuAperto ? " aperta" : ""}`} style={{
        width: 232, minWidth: 232, background: "#fff", borderRight: "1px solid #ECEEF1",
        padding: "1.4rem 0 1rem", display: "flex", flexDirection: "column",
        position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 10, overflowY: "auto",
      }}>
        <div style={{ padding: "0 1.1rem 1.1rem", display: "flex", alignItems: "center", gap: 11 }}>
          <img src="/logo.png" alt="Zest" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>ZEST</div>
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>Gestionale</div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "0 0.6rem" }}>
          {GRUPPI.map(gruppo => {
            const voci = gruppo.moduli.filter(m => canAccess(user, m.id));
            if (!voci.length) return null;
            return (
              <div key={gruppo.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 0.65rem 6px" }}>
                  {gruppo.label}
                </div>
                {voci.map(item => (
                  <NavButton
                    key={item.id} item={item}
                    active={section === item.id}
                    onClick={() => { setSection(item.id); setMenuAperto(false); }}
                    badge={item.id === "contabilita" ? alertAperti : 0}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ margin: "0 0.85rem", padding: "12px 13px", background: "#FAFBFC", border: "1px solid #EEF0F3", borderRadius: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>{user.nome}</div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 9, lineHeight: 1.4 }}>
            {user.ruoli.map(r => r.nome).join(" · ") || "Nessun ruolo"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setCambioPsw(true)} style={{
              fontSize: 11, fontFamily: "inherit", padding: "6px 10px", borderRadius: 8, cursor: "pointer",
              fontWeight: 600, background: "#fff", color: "#374151", border: "1px solid #DFE3E8", flex: 1,
            }}>
              Password
            </button>
            <button onClick={logout} style={{
              fontSize: 11, fontFamily: "inherit", padding: "6px 10px", borderRadius: 8, cursor: "pointer",
              fontWeight: 600, background: "#fff", color: "#EF4444", border: "1px solid #FECACA", flex: 1,
            }}>
              Esci
            </button>
          </div>
        </div>
      </nav>

      <main className="contenuto" style={{ marginLeft: 232, flex: 1, minWidth: 0, padding: "2.1rem 2.4rem 3rem", maxWidth: "calc(100vw - 232px)", boxSizing: "border-box" }}>
        {db.loading ? <Schermo>Caricamento dati...</Schermo> : <>
          {section === "itinerari"    && <SezioneItinerari    db={db} showToast={showToast} />}
          {section === "booking"      && <SezioneInputBooking db={db} user={user} showToast={showToast} />}
          {section === "budget"       && <SezioneBudget       db={db} user={user} showToast={showToast} />}
          {section === "riepilogo"    && <SezioneRiepilogo    itinerari={db.itinerari} spese={db.spese} />}
          {section === "contabilita"  && <SezioneContabilita  db={db} showToast={showToast} />}
          {section === "impostazioni" && <SezioneImpostazioni db={db} showToast={showToast} />}
          {section === "registro"     && <SezioneRegistro     db={db} showToast={showToast} />}
          {section === "cestino"      && <SezioneCestino      db={db} showToast={showToast} />}
          {section === "ruoli"        && <SezioneRuoli ruoli={ruoli} onCrea={creaRuolo} onModifica={modificaRuolo} onElimina={eliminaRuolo} showToast={showToast} />}
          {section === "utenti"       && <SezioneUtenti utenti={utenti} ruoli={ruoli} currentUser={user} onCrea={creaUtente} onModifica={modificaUtente} onReimposta={reimpostaPassword} onElimina={eliminaUtente} onBlocca={bloccaUtente} onForzaCambio={forzaCambioPassword} showToast={showToast} />}
        </>}
      </main>

      {cambioPsw && (
        <CambioPassword
          onCambia={async (a, n) => { await cambiaPasswordPersonale(a, n); showToast("Password aggiornata"); }}
          onClose={() => setCambioPsw(false)}
        />
      )}

      <Toast msg={toast} />
      <ConfirmHost />
    </div>
  );
}

function Schermo({ children }) {
  return (
    <div style={{ padding: "3.5rem", textAlign: "center", color: "#9CA3AF", fontFamily: FONT, fontSize: 14 }}>
      {children}
    </div>
  );
}

function NavButton({ item, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="nav-item"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
        width: "100%", textAlign: "left", padding: "8px 0.65rem", marginBottom: 1,
        cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? "#9A3412" : "#4B5563",
        background: active ? "#FFF3ED" : "transparent",
        border: "none", borderRadius: 9, fontFamily: "inherit",
      }}
    >
      <span>{item.label}</span>
      {badge > 0 && (
        <span style={{ background: "#EF4444", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
          {badge}
        </span>
      )}
    </button>
  );
}
