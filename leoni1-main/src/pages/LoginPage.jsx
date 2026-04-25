import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import leonLogo from "../assets/leon-logo.svg";
import {
  ROLE_ADMIN,
  ROLE_RECRUTEUR,
  ROLE_RESPONSABLE_CONTRAT,
  getHomeRouteForRole,
} from "../utils/roles.js";
import "./LoginPage.css";

const demoAccounts = [
  { role: ROLE_ADMIN, label: "Admin" },
  { role: ROLE_RECRUTEUR, label: "Recruteur" },
  { role: ROLE_RESPONSABLE_CONTRAT, label: "Responsable Contrat" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 500));

    const result = login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(getHomeRouteForRole(result.role));
      return;
    }

    setError("Email ou mot de passe incorrect.");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  const fillDemo = (role) => {
    const demos = {
      [ROLE_ADMIN]: { email: "admin@leoni.com", password: "admin123" },
      [ROLE_RECRUTEUR]: { email: "recruteur@leoni.com", password: "recruteur123" },
      [ROLE_RESPONSABLE_CONTRAT]: { email: "contrats@leoni.com", password: "contrats123" },
    };
    setEmail(demos[role].email);
    setPassword(demos[role].password);
    setError("");
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-left">
          <div className="login-brand">
            <img src={leonLogo} alt="LEON" />
            <p>Wiring Systems Tunisia</p>
          </div>
        </section>

        <section className="login-right">
          <div className="login-card">
            <h2>Welcome back</h2>
            <p>Please enter your details.</p>

            {error && <div className="login-error">{error}</div>}

            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="Enter your e-mail"
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="........"
            />

            <div className="login-options">
              <label className="remember-check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <button className="ghost-link" onClick={(e) => e.preventDefault()}>Forgot your password?</button>
            </div>

            <button className="login-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Log in..." : "Log in"}
            </button>

            <div className="demo-label">Demo accounts</div>
            <div className="demo-row">
              {demoAccounts.map((d) => (
                <button key={d.role} onClick={() => fillDemo(d.role)}>{d.label}</button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
