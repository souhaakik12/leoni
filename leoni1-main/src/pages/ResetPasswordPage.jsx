import { useState } from "react";
import { Link } from "react-router-dom";
import "./ResetPasswordPage.css";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!password || password !== confirmPassword) {
      setMessage("Les mots de passe doivent etre renseignes et identiques.");
      return;
    }
    setMessage("Interface de reinitialisation prete. Le branchement backend du jeton pourra etre ajoute plus tard.");
  };

  return (
    <div className="auth-simple-page">
      <div className="auth-simple-card">
        <h2>Reinitialiser le mot de passe</h2>
        <p>Definissez un nouveau mot de passe pour votre compte.</p>

        {message ? <div className="auth-simple-alert auth-simple-alert--success">{message}</div> : null}

        <form onSubmit={handleSubmit} className="auth-simple-form">
          <label>
            <span>Nouveau mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label>
            <span>Confirmer le mot de passe</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit">Valider</button>
        </form>

        <Link to="/login" className="auth-simple-link">Retour a la connexion</Link>
      </div>
    </div>
  );
}
