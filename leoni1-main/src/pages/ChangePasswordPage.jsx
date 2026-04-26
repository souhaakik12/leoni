import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import "./ChangePasswordPage.css";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Le nouveau mot de passe et sa confirmation doivent correspondre.");
      return;
    }

    setMessage(`Interface prete pour ${user?.NomComplet || user?.nom}. Le changement de mot de passe direct pourra etre branche a une route dediee plus tard.`);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <h2>Changer le mot de passe</h2>
        <p>Cette page est protegee et prete pour le branchement backend du changement de mot de passe.</p>

        {error ? <div className="change-password-alert change-password-alert--error">{error}</div> : null}
        {message ? <div className="change-password-alert change-password-alert--success">{message}</div> : null}

        <form className="change-password-form" onSubmit={handleSubmit}>
          <label>
            <span>Mot de passe actuel</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>

          <label>
            <span>Nouveau mot de passe</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>

          <label>
            <span>Confirmer le nouveau mot de passe</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          <button type="submit">Mettre a jour</button>
        </form>
      </div>
    </div>
  );
}
