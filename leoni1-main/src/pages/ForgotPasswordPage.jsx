import { useState } from "react";
import { Link } from "react-router-dom";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");
    setSubmitted(false);

    try {
      const response = await fetch("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Erreur serveur lors de l'envoi du lien de reinitialisation.");
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(submitError.message || "Erreur serveur lors de l'envoi du lien de reinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-simple-page">
      <div className="auth-simple-card">
        <h2>Mot de passe oublie</h2>
        <p>Saisissez votre email pour preparer la reinitialisation de votre acces.</p>

        {submitted ? (
          <div className="auth-simple-alert auth-simple-alert--success">
            Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.
          </div>
        ) : null}
        {error ? <div className="auth-simple-alert auth-simple-alert--error">{error}</div> : null}

        <form onSubmit={handleSubmit} className="auth-simple-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="nom@leoni.com"
              required
            />
          </label>

          <button type="submit" disabled={loading}>{loading ? "Envoi..." : "Envoyer"}</button>
        </form>

        <Link to="/login" className="auth-simple-link">Retour a la connexion</Link>
      </div>
    </div>
  );
}
