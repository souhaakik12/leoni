import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const roleRoutes = {
  admin:     "/",
  recruteur: "/missions",
  contrats:  "/contracts",
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError("");
    // small delay for UX feel
    await new Promise(r => setTimeout(r, 600));
    const result = login(email, password);
    setLoading(false);
    if (result.success) {
      navigate(roleRoutes[result.role] || "/");
    } else {
      setError("Email ou mot de passe incorrect.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  // Quick-fill buttons for demo
  const fillDemo = (role) => {
    const demos = {
      admin:     { email: "admin@leoni.com",     password: "admin123"     },
      recruteur: { email: "recruteur@leoni.com", password: "recruteur123" },
      contrats:  { email: "contrats@leoni.com",  password: "contrats123"  },
    };
    setEmail(demos[role].email);
    setPassword(demos[role].password);
    setError("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f4f6f9",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo card */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "#F5C200",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
            boxShadow: "0 4px 16px rgba(245,194,0,0.35)",
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#000" }}>L</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1d23", letterSpacing: "0.04em" }}>LEONI Tunisia</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Système de Gestion RH</p>
        </div>

        {/* Form card */}
        <div style={{
          background: "#fff",
          border: "1px solid #e5e9f0",
          borderRadius: 14,
          padding: "32px 32px 28px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a1d23", marginBottom: 6 }}>Connexion</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Entrez vos identifiants pour accéder au tableau de bord.</p>

          {/* Error */}
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: "#dc2626",
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 18,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Adresse email
            </label>
            <div style={{ position: "relative" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="exemple@leoni.com"
                style={{
                  width: "100%", padding: "10px 12px 10px 38px",
                  border: "1px solid #e5e9f0", borderRadius: 8,
                  fontSize: 13, color: "#1a1d23", outline: "none",
                  transition: "border 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e  => e.target.style.borderColor = "#e5e9f0"}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Mot de passe
            </label>
            <div style={{ position: "relative" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "10px 40px 10px 38px",
                  border: "1px solid #e5e9f0", borderRadius: 8,
                  fontSize: 13, color: "#1a1d23", outline: "none",
                  transition: "border 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e  => e.target.style.borderColor = "#e5e9f0"}
              />
              <button
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#9ca3af", padding: 4,
                }}
              >
                {showPwd
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "11px",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 700,
              transition: "background 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = "#1d4ed8"; }}
            onMouseLeave={e => { if (!loading) e.target.style.background = "#2563eb"; }}
          >
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Connexion...
              </>
            ) : "Se connecter"}
          </button>

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* Demo credentials */}
        <div style={{
          background: "#fff", border: "1px solid #e5e9f0",
          borderRadius: 12, padding: "16px 20px", marginTop: 16,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            Comptes de démonstration
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { role: "admin",     label: "Administrateur",  color: "#2563eb", bg: "#eff6ff" },
              { role: "recruteur", label: "Recruteur RH",    color: "#7c3aed", bg: "#f5f3ff" },
              { role: "contrats",  label: "Dept. Contrats",  color: "#ea580c", bg: "#fff7ed" },
            ].map(d => (
              <button
                key={d.role}
                onClick={() => fillDemo(d.role)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: d.bg, border: `1px solid ${d.color}25`,
                  borderRadius: 7, padding: "8px 12px",
                  color: d.color, fontSize: 12, fontWeight: 600,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <span>{d.label}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>Remplir →</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}