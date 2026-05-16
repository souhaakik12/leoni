import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { validatePassword } from "../utils/passwordValidation.js";
import "./SetupAccountPage.css";

const API_BASE_URL = "http://localhost:3000/api/utilisateurs/invite";

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4l16 16" />
      <path d="M10.6 6.5A9.8 9.8 0 0 1 12 6c5.5 0 9 6 9 6a16.3 16.3 0 0 1-3.2 3.8" />
      <path d="M6.7 6.7C4.4 8.2 3 12 3 12s3.5 6 9 6c1.4 0 2.7-.3 3.9-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export default function SetupAccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadInvite = async () => {
      if (!token) {
        if (isMounted) {
          setError("Lien invalide ou expiré.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/${encodeURIComponent(token)}`
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data?.success === false) {
          throw new Error(data?.message || "Lien invalide ou expiré.");
        }

        if (isMounted) {
          setUser(data?.user || null);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message || "Lien invalide ou expiré.");
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInvite();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate("/login");
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, success]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirmPassword) {
      setError("Veuillez remplir les deux champs mot de passe.");
      return;
    }

    const passwordValidation = validatePassword(trimmedPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError("Le mot de passe et la confirmation doivent être identiques.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(token)}/setup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: trimmedPassword }),
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Activation impossible.");
      }

      setSuccess(data?.message || "Compte activé avec succès.");
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError.message || "Activation impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const formDisabled = loading || !user || Boolean(success);

  return (
    <div className="setup-account-page">
      <div className="setup-account-card">
        <div className="setup-account-brand">
          <div className="setup-account-brand__mark">L</div>
          <div className="setup-account-brand__text">
            <span>LEONI RH</span>
          </div>
        </div>

        <div className="setup-account-header">
          <h1>Créer votre compte</h1>
          <p>
            {user
              ? `Bienvenue, ${user.NomComplet}. Choisissez un mot de passe pour accéder à votre tableau de bord.`
              : "Nous vérifions votre lien d’activation pour préparer votre accès."}
          </p>
        </div>

        {loading ? (
          <div className="setup-account-alert setup-account-alert--info">
            Vérification du lien d’activation en cours...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="setup-account-alert setup-account-alert--error">
            {error}
          </div>
        ) : null}

        {!loading && success ? (
          <div className="setup-account-alert setup-account-alert--success">
            {success}
          </div>
        ) : null}

        <form className="setup-account-form" onSubmit={handleSubmit}>
          <label className="setup-account-field">
            <span>Nom complet</span>
            <input
              type="text"
              value={user?.NomComplet || ""}
              readOnly
              disabled={!user}
            />
          </label>

          <label className="setup-account-field">
            <span>Email</span>
            <input
              type="email"
              value={user?.Email || ""}
              readOnly
              disabled={!user}
            />
          </label>

          <label className="setup-account-field">
            <span>Mot de passe</span>
            <div className="setup-account-password">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Choisissez votre mot de passe"
                disabled={formDisabled}
                required
              />
              <button
                type="button"
                className="setup-account-password__toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                disabled={formDisabled}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </label>

          <label className="setup-account-field">
            <span>Confirmer le mot de passe</span>
            <div className="setup-account-password">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirmez votre mot de passe"
                disabled={formDisabled}
                required
              />
              <button
                type="button"
                className="setup-account-password__toggle"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={
                  showConfirmPassword
                    ? "Masquer la confirmation du mot de passe"
                    : "Afficher la confirmation du mot de passe"
                }
                disabled={formDisabled}
              >
                <EyeIcon open={showConfirmPassword} />
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="setup-account-submit"
            disabled={formDisabled || submitting}
          >
            {submitting ? "Activation..." : "Activer mon compte"}
          </button>
        </form>

        <Link to="/login" className="setup-account-link">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
