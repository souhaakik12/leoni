import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_ADMIN, ROLE_RECRUTEUR, ROLE_RESPONSABLE_CONTRAT, hasFoyerAccess, normalizeRole } from "../utils/roles.js";
import "./ProfilePage.css";

const roleInfo = {
  [ROLE_ADMIN]: {
    label: "Administrateur",
    color: "#1e40af",
    bg: "#dbeafe",
    border: "#93c5fd",
    dept: "Administration du systeme",
  },
  [ROLE_RECRUTEUR]: {
    label: "Recruteur RH",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    dept: "Ressources Humaines - Recrutement",
  },
  [ROLE_RESPONSABLE_CONTRAT]: {
    label: "Responsable Contrat",
    color: "#ea580c",
    bg: "#fff7ed",
    border: "#fed7aa",
    dept: "Gestion des Contrats & Renouvellements",
  },
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedRole = normalizeRole(user?.role);
  const info = roleInfo[normalizedRole] || {};
  const displayName = user?.NomComplet || user?.nom;
  const displayEmail = user?.Email || user?.email;
  const accesFoyerLabel = hasFoyerAccess(user) ? "Autorise" : "Non autorise";
  const statusLabel = "Actif";
  const permissions = normalizedRole === ROLE_RECRUTEUR
    ? ["Voir les missions", "Creer une mission", "Suivre les candidats"]
    : normalizedRole === ROLE_RESPONSABLE_CONTRAT
      ? ["Voir les contrats", "Receptionner les dossiers", "Gerer les seances contrat"]
      : ["Administrer les utilisateurs", "Superviser tous les modules", "Consulter les tableaux de bord"];

  useEffect(() => {
    setProfileName(displayName || "");
    setProfileEmail(displayEmail || "");
  }, [displayName, displayEmail]);

  const handleProfileEdit = () => {
    setProfileError("");
    setProfileSuccess("");
    setProfileName(displayName || "");
    setProfileEmail(displayEmail || "");
    setIsEditingProfile(true);
  };

  const handleProfileCancel = () => {
    setIsEditingProfile(false);
    setProfileError("");
    setProfileName(displayName || "");
    setProfileEmail(displayEmail || "");
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!profileName.trim() || !profileEmail.trim()) {
      setProfileError("Le nom complet et l'adresse e-mail sont obligatoires.");
      return;
    }

    setIsSavingProfile(true);

    try {
      const response = await fetch("http://localhost:3000/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: displayEmail,
          nom: profileName.trim(),
          newEmail: profileEmail.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false || !data?.user) {
        throw new Error(data?.message || "Impossible de mettre a jour le profil.");
      }

      updateUser({
        ...user,
        ...data.user,
        NomComplet: data.user.NomComplet,
        Email: data.user.Email,
        avatar: undefined,
      });
      setProfileSuccess(data?.message || "Profil mis a jour avec succes.");
      setIsEditingProfile(false);
    } catch (error) {
      setProfileError(error.message || "Impossible de mettre a jour le profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSecurityToggle = () => {
    setPasswordError("");
    setPasswordSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsEditingSecurity(true);
  };

  const handleSecurityCancel = () => {
    setPasswordError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsEditingSecurity(false);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Les trois champs sont obligatoires.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Le nouveau mot de passe et la confirmation doivent etre identiques.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: displayEmail,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Impossible de modifier le mot de passe.");
      }

      setPasswordSuccess(data?.message || "Mot de passe modifie avec succes.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsEditingSecurity(false);
    } catch (error) {
      setPasswordError(error.message || "Impossible de modifier le mot de passe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-page">
      <section className="profile-banner">
        <div className="profile-banner__overlay" />
        <div className="profile-banner__content">
          <div className="profile-banner__avatar">{user?.avatar}</div>
          <div className="profile-banner__identity">
            <p className="profile-banner__eyebrow">Profil utilisateur</p>
            <h1>{displayName}</h1>
            <div className="profile-banner__meta">
              <span
                className="profile-banner__badge"
                style={{ background: info.bg, color: info.color, borderColor: info.border }}
              >
                {info.label}
              </span>
              <span>{displayEmail}</span>
              <span>{info.dept}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="profile-page__grid">
        <section className="profile-card">
          <div className="profile-card__head">
            <div>
              <h3 className="profile-card__title">Informations du compte</h3>
              <p className="profile-card__subtitle">Coordonnees et informations principales du compte connecte.</p>
            </div>
            {!isEditingProfile ? (
              <button type="button" className="profile-card__action" onClick={handleProfileEdit}>
                Modifier
              </button>
            ) : null}
          </div>

          {profileError ? <div className="profile-card__alert profile-card__alert--error">{profileError}</div> : null}
          {profileSuccess ? <div className="profile-card__alert profile-card__alert--success">{profileSuccess}</div> : null}

          {isEditingProfile ? (
            <form className="profile-edit-form" onSubmit={handleProfileSubmit}>
              <label className="profile-edit-form__field">
                <span>Nom complet</span>
                <input
                  type="text"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                />
              </label>

              <label className="profile-edit-form__field">
                <span>Adresse e-mail</span>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(event) => setProfileEmail(event.target.value)}
                />
              </label>

              <div className="profile-card__row">
                <span>Departement</span>
                <strong>{info.dept}</strong>
              </div>
              <div className="profile-card__row">
                <span>Role</span>
                <strong>{info.label}</strong>
              </div>
              <div className="profile-card__row">
                <span>Statut</span>
                <strong>{statusLabel}</strong>
              </div>

              <div className="profile-edit-form__actions">
                <button type="submit" className="profile-card__action" disabled={isSavingProfile}>
                  {isSavingProfile ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button type="button" className="profile-card__action profile-card__action--ghost" onClick={handleProfileCancel}>
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-card__rows">
              {[
                { label: "Nom complet", value: displayName },
                { label: "Adresse e-mail", value: displayEmail },
                { label: "Departement", value: info.dept },
                { label: "Role", value: info.label },
                { label: "Statut", value: statusLabel },
              ].map((row) => (
                <div key={row.label} className="profile-card__row">
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="profile-card">
          <div className="profile-card__head">
            <h3 className="profile-card__title">Securite</h3>
            {!isEditingSecurity ? (
              <button type="button" className="profile-card__action" onClick={handleSecurityToggle}>
                Modifier
              </button>
            ) : null}
          </div>
          <div>
            <p className="profile-card__subtitle">Gerez la securite du compte et l'etat de la session.</p>
          </div>

        {passwordError ? <div className="profile-card__alert profile-card__alert--error">{passwordError}</div> : null}
        {passwordSuccess ? <div className="profile-card__alert profile-card__alert--success">{passwordSuccess}</div> : null}

        {!isEditingSecurity ? (
          <>
            <div className="profile-card__rows">
              <div className="profile-card__row">
                <span>Mot de passe</span>
                <strong>********</strong>
              </div>
              <div className="profile-card__row">
                <span>Session</span>
                <strong>Connecte</strong>
              </div>
              <div className="profile-card__row">
                <span>Acces foyer</span>
                <strong>{accesFoyerLabel}</strong>
              </div>
            </div>

            <div className="profile-card__permissions">
              {permissions.map((perm) => (
                <div key={perm} className="profile-card__permission">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {perm}
                </div>
              ))}
            </div>
          </>
        ) : (
          <form className="profile-password-form" onSubmit={handlePasswordSubmit}>
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

            <div className="profile-password-form__actions">
              <button type="submit" className="profile-card__action" disabled={isSubmitting}>
                {isSubmitting ? "Mise a jour..." : "Mettre a jour"}
              </button>
              <button type="button" className="profile-card__action profile-card__action--ghost" onClick={handleSecurityCancel}>
                Annuler
              </button>
            </div>
          </form>
        )}
      </section>
      </div>
    </div>
  );
}
