import { useState } from "react";
import { Link } from "react-router-dom";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="auth-simple-page">
      <div className="auth-simple-card">
        <h2>Mot de passe oublie</h2>
        <p>Saisissez votre email pour preparer la reinitialisation de votre acces.</p>

        {submitted ? (
          <div className="auth-simple-alert auth-simple-alert--success">
            Si un compte existe pour cet email, la reinitialisation pourra etre envoyee quand le backend mail sera branche.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-simple-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nom@leoni.com"
              required
            />
          </label>

          <button type="submit">Envoyer</button>
        </form>

        <Link to="/login" className="auth-simple-link">Retour a la connexion</Link>
      </div>
    </div>
  );
}
