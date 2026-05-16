import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { validatePassword } from "../utils/passwordValidation.js";
import "./ResetPasswordPage.css";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(location.search).get("token") || "", [location.search]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function verifyToken() {
      if (!token) {
        if (!ignore) {
          setCheckingToken(false);
          setTokenValid(false);
          setError("Token de reinitialisation manquant.");
        }
        return;
      }

      try {
        const response = await fetch(`http://localhost:3000/api/auth/reset-password/${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data?.success === false) {
          throw new Error(data?.message || "Lien de reinitialisation invalide ou expire.");
        }

        if (!ignore) {
          setTokenValid(true);
          setError("");
        }
      } catch (verifyError) {
        if (!ignore) {
          setTokenValid(false);
          setError(verifyError.message || "Lien de reinitialisation invalide ou expire.");
        }
      } finally {
        if (!ignore) {
          setCheckingToken(false);
        }
      }
    }

    verifyToken();

    return () => {
      ignore = true;
    };
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Token de reinitialisation manquant.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Veuillez remplir les deux champs.");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError("La confirmation du mot de passe doit etre identique.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://localhost:3000/api/auth/reset-password/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Impossible de reinitialiser le mot de passe.");
      }

      setMessage("Mot de passe reinitialise avec succes.");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => navigate("/login"), 1500);
    } catch (submitError) {
      setError(submitError.message || "Impossible de reinitialiser le mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-simple-page">
      <div className="auth-simple-card">
        <h2>Reinitialiser le mot de passe</h2>
        <p>Definissez un nouveau mot de passe pour votre compte.</p>

        {message ? <div className="auth-simple-alert auth-simple-alert--success">{message}</div> : null}
        {error ? <div className="auth-simple-alert auth-simple-alert--error">{error}</div> : null}

        {checkingToken ? (
          <div className="auth-simple-alert">Verification du lien en cours...</div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-simple-form">
          <label>
            <span>Nouveau mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              required
              minLength={8}
              disabled={!tokenValid || loading}
            />
          </label>

          <label>
            <span>Confirmer le mot de passe</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
              }}
              required
              minLength={8}
              disabled={!tokenValid || loading}
            />
          </label>

          <button type="submit" disabled={!tokenValid || loading}>
            {loading ? "Reinitialisation..." : "Reinitialiser le mot de passe"}
          </button>
        </form>

        <Link to="/login" className="auth-simple-link">Retour a la connexion</Link>
      </div>
    </div>
  );
}
