import { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "./utils/helpers";
import { useAuthState, canAccess, RUOLI_LABEL } from "./utils/auth";

import SezioneItinerari    from "./sections/Itinerari";
import SezioneInputBooking from "./sections/InputBooking";
import SezioneBudget       from "./sections/BudgetBooking";
import SezioneRiepilogo    from "./sections/Riepilogo";
import SezioneImpostazioni from "./sections/Impostazioni";
import SezioneUtenti       from "./sections/Utenti";
import LoginPage           from "./components/LoginPage";
import { Toast }           from "./components/UI";

const NAV = [
  { id: "itinerari",    label: "Itinerari" },
  { id: "booking",      label: "Input booking" },
  { id: "budget",       label: "Budget booking" },
  { id: "riepilogo",    label: "Riepilogo per itinerario" },
  { id: "utenti",       label: "Gestione utenti",  bottom: false },
  { id: "impostazioni", label: "⚙ Impostazioni",   bottom: true  },
];

export default function App() {
  const { user, utenti, loading: authLoading, error: authError, login, logout,
          creaUtente, modificaUtente, reimpostaPassword, eliminaUtente } = useAuthState();

  const [section,   setSection]   = useState("itinerari");
  const [itinerari, setItinerari] = usePersistedState("zest_itinerari", []);
  const [spese,     setSpese]     = usePersistedState("zest_spese", []);
  const [clientId]                = usePersistedState("zest_google_client_id", "");
  const [toast,     setToast]     = useState("");

  useEffect(() => { window._googleClientId = clientId; }, [clientId]);
  useEffect(() => { if (user) setSection("itinerari"); }, [user]);
  useEffect(() => { if (user && !canAccess(user.ruolo, section)) setSection("itinerari"); }, [user, section]);

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(""), 2800);
  }, []);

  if (!user) return <LoginPage onLogin={login} loading={authLoading} error={authError} />;

  const navTop    = NAV.filter(x => !x.bottom  && canAccess(user.ruolo, x.id));
  const navBottom = NAV.filter(x =>  x.bottom  && canAccess(user.ruolo, x.id));

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", background:"#F9FAFB", color:"#111827" }}>

      <nav style={{ width:210, minWidth:210, background:"#fff", borderRight:"1px solid #E5E7EB", padding:"1.5rem 0", display:"flex", flexDirection:"column", position:"fixed", top:0, bottom:0, left:0, zIndex:10 }}>
        <div style={{ padding:"0 1.25rem 1.25rem", borderBottom:"1px solid #F3F4F6", marginBottom:"0.75rem", display:"flex", alignItems:"center", gap:10 }}>
          <img src="/logo.png" alt="Zest" style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover" }} />
          <div style={{ fontSize:15, fontWeight:800, color:"#111827", letterSpacing:"-0.01em" }}>ZEST</div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
          {navTop.map(item => <NavButton key={item.id} item={item} active={section===item.id} onClick={()=>setSection(item.id)} />)}

          <div style={{ marginTop:"auto" }}>
            {navBottom.map(item => <NavButton key={item.id} item={item} active={section===item.id} onClick={()=>setSection(item.id)} />)}
            <div style={{ margin:"8px 10px 0", padding:"10px 12px", background:"#F9FAFB", border:"1px solid #F3F4F6", borderRadius:10 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#111827", marginBottom:2 }}>{user.nome}</div>
              <div style={{ fontSize:10, color:"#9CA3AF", marginBottom:8 }}>{RUOLI_LABEL[user.ruolo]}</div>
              <button onClick={logout} style={{ fontSize:11, fontFamily:"inherit", padding:"4px 10px", borderRadius:6, cursor:"pointer", fontWeight:500, background:"transparent", color:"#EF4444", border:"1px solid #FECACA", width:"100%" }}>
                Esci
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main style={{ marginLeft:210, flex:1, padding:"2rem 2.5rem", maxWidth:"calc(100vw - 210px)" }}>
        {section==="itinerari"    && <SezioneItinerari    itinerari={itinerari} setItinerari={setItinerari} showToast={showToast} />}
        {section==="booking"      && <SezioneInputBooking itinerari={itinerari} setSpese={setSpese}         showToast={showToast} />}
        {section==="budget"       && <SezioneBudget       itinerari={itinerari} spese={spese} setSpese={setSpese} />}
        {section==="riepilogo"    && <SezioneRiepilogo    itinerari={itinerari} spese={spese} />}
        {section==="impostazioni" && <SezioneImpostazioni showToast={showToast} />}
        {section==="utenti"       && <SezioneUtenti utenti={utenti} currentUser={user} onCrea={creaUtente} onModifica={modificaUtente} onReimposta={reimpostaPassword} onElimina={eliminaUtente} showToast={showToast} />}
      </main>

      <Toast msg={toast} />
    </div>
  );
}

function NavButton({ item, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display:"block", width:"100%", textAlign:"left", padding:"9px 1.25rem", cursor:"pointer", fontSize:13, fontWeight:active?600:400, color:active?"#111827":"#6B7280", background:active?"#F3F4F6":"transparent", border:"none", borderLeft:`3px solid ${active?"#FF6B2B":"transparent"}`, fontFamily:"inherit" }}>
      {item.label}
    </button>
  );
}