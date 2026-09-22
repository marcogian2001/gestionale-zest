import { useState } from "react";
import { inputStyle, btnPrimary } from "./UI";

export default function LoginPage({ onLogin, loading, error }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F9FAFB", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Logo + titolo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="Zest Family" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 16 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>ZEST</div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>Gestionale interno</div>
        </div>

        {/* Card login */}
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "2rem" }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="es. simone@zestfamily.it"
                required autoFocus
                style={{ ...inputStyle }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ ...inputStyle }}
              />
            </div>

            {error && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#EF4444", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" style={{ ...btnPrimary, width: "100%", padding: "10px", fontSize: 14 }} disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
