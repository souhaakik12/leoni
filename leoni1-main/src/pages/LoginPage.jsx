import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getHomeRouteForRole } from "../utils/roles.js";
import "./LoginPage.css";

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
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(getHomeRouteForRole(result.role));
      return;
    }

    setError(result.message || "Email ou mot de passe incorrect");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-left">
          <div className="login-brand">
            <div className="login-brand-title">LEONI</div>
            <p>Wiring Systems Tunisia</p>
          </div>
        </section>

        <section className="login-right">
          <div className="login-card">
            <h2>Bienvenue</h2>
            <p>Veuillez saisir vos informations.</p>

            {error && <div className="login-error">{error}</div>}

            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Saisir votre e-mail"
            />

            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="........"
            />

            <div className="login-options">
              <label className="remember-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Se souvenir de moi</span>
              </label>
              <button
                className="ghost-link"
                onClick={() => navigate("/forgot-password")}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              className="login-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
