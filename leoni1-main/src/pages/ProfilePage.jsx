import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_ADMIN, ROLE_RECRUTEUR, ROLE_RESPONSABLE_CONTRAT, buildRoleHeaders, hasFoyerAccess, normalizeRole } from "../utils/roles.js";
import { validatePassword } from "../utils/passwordValidation.js";
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

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeComparableText(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(value) {
  const raw = normalizeText(value);
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const frMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function toDisplayDate(value) {
  const isoDate = toIsoDate(value);
  if (isoDate) {
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  }

  const raw = normalizeText(value);
  if (!raw) return "Non renseignee";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  return raw;
}

function normalizeMissionStatus(value) {
  return normalizeComparableText(value);
}

function getMissionStatusClass(value) {
  const normalized = normalizeMissionStatus(value);
  if (normalized === "terminee") return "profile-mission-card__status profile-mission-card__status--done";
  if (normalized === "en cours") return "profile-mission-card__status profile-mission-card__status--progress";
  return "profile-mission-card__status profile-mission-card__status--planned";
}

function getPotentialCandidatesCount(mission) {
  const directValue = mission?.NombreCandidatsPotentiels ?? mission?.nombreCandidatsPotentiels;
  if (directValue !== undefined && directValue !== null && directValue !== "") {
    const parsed = Number(directValue);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  const rawResult = normalizeText(mission?.ResultatMission || mission?.resultatMission);
  const normalizedResult = normalizeComparableText(rawResult);
  if (/^\d+$/.test(normalizedResult)) {
    return Number(normalizedResult);
  }

  if (!normalizedResult.includes("resultat saisi") && !normalizedResult.includes("candidat")) {
    return null;
  }

  const match = rawResult.match(/(\d+)/);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function hasMissionResult(mission) {
  if (getPotentialCandidatesCount(mission) !== null) {
    return true;
  }

  return normalizeComparableText(mission?.ResultatMission || mission?.resultatMission).includes("resultat saisi");
}

function getMissionDisplayStatus(mission) {
  if (hasMissionResult(mission)) return "Termin\u00e9e";

  const rawDate = mission?.DateMission || mission?.date || mission?.dateMission;
  if (!rawDate) {
    return mission?.statutAffichage || mission?.Statut || mission?.statut || "Planifi\u00e9e";
  }

  const missionDate = toIsoDate(rawDate);
  const today = todayIso();

  if (!missionDate) {
    return mission?.statutAffichage || mission?.Statut || mission?.statut || "Planifi\u00e9e";
  }

  if (missionDate < today) return "Termin\u00e9e";
  if (missionDate === today) return "En cours";
  return "Planifi\u00e9e";
}

function canSubmitMissionResult(mission) {
  const missionDate = toIsoDate(mission?.DateMission || mission?.date || mission?.dateMission);
  return Boolean(missionDate) && missionDate <= todayIso();
}

function missionCodeLabel(mission) {
  return mission?.CodeMission || mission?.id || `M${mission?.Id || ""}`;
}

function getWelcomeMessage(role) {
  if (role === ROLE_ADMIN) return "Vous gerez l'ensemble du systeme RH.";
  if (role === ROLE_RECRUTEUR) return "Vous pouvez suivre vos missions et les candidats.";
  if (role === ROLE_RESPONSABLE_CONTRAT) return "Vous pouvez gerer les dossiers et contrats.";
  return "Retrouvez ici les informations essentielles de votre compte.";
}

function getInitials(name) {
  const words = normalizeText(name).split(/\s+/).filter(Boolean);
  if (!words.length) return "U";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function MissionResultModal({ mission, form, error, saving, onChange, onClose, onSubmit }) {
  return (
    <div className="profile-modal-backdrop" role="presentation" onClick={saving ? undefined : onClose}>
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-result-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-modal__head">
          <div>
            <p className="profile-modal__eyebrow">Mission affectee</p>
            <h3 id="mission-result-modal-title">Saisir resultat - {missionCodeLabel(mission)}</h3>
            <p className="profile-modal__subtitle">
              {toDisplayDate(mission?.DateMission || mission?.date)} - {normalizeText(mission?.Gouvernorat) || "Non renseigne"} - {normalizeText(mission?.Delegation) || "Non renseignee"}
            </p>
          </div>

          <button type="button" className="profile-modal__close" onClick={onClose} disabled={saving} aria-label="Fermer la fenetre">
            &times;
          </button>
        </div>

        {error ? <div className="profile-card__alert profile-card__alert--error">{error}</div> : null}

        <form className="profile-modal__form" onSubmit={onSubmit}>
          <label className="profile-modal__field">
            <span>Nombre de candidats potentiels</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.NombreCandidatsPotentiels}
              onChange={(event) => onChange("NombreCandidatsPotentiels", event.target.value)}
              placeholder="Ex: 18"
            />
          </label>

          <label className="profile-modal__field">
            <span>Observations</span>
            <textarea
              rows="4"
              value={form.Observations}
              onChange={(event) => onChange("Observations", event.target.value)}
              placeholder="Commentaires ou retours de mission..."
            />
          </label>

          <div className="profile-modal__footer">
            <button type="button" className="profile-card__action profile-card__action--ghost" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="profile-card__action" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const userId = user?.Id || user?.id;
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
  const [assignedMissions, setAssignedMissions] = useState([]);
  const [assignedMissionsError, setAssignedMissionsError] = useState("");
  const [assignedMissionsSuccess, setAssignedMissionsSuccess] = useState("");
  const [isLoadingAssignedMissions, setIsLoadingAssignedMissions] = useState(false);
  const [resultMission, setResultMission] = useState(null);
  const [resultError, setResultError] = useState("");
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [resultForm, setResultForm] = useState({
    NombreCandidatsPotentiels: "",
    Observations: "",
  });
  const normalizedRole = normalizeRole(user?.role);
  const info = roleInfo[normalizedRole] || {};
  const displayName = user?.NomComplet || user?.nom;
  const displayEmail = user?.Email || user?.email;
  const accesFoyerLabel = hasFoyerAccess(user) ? "Autorise" : "Non autorise";
  const statusLabel = "Actif";
  const welcomeMessage = getWelcomeMessage(normalizedRole);
  const avatarLabel = user?.avatar || getInitials(displayName);

  useEffect(() => {
    setProfileName(displayName || "");
    setProfileEmail(displayEmail || "");
  }, [displayName, displayEmail]);

  useEffect(() => {
    let isMounted = true;

    const fetchAssignedMissions = async () => {
      if (!userId) {
        if (isMounted) {
          setAssignedMissions([]);
          setAssignedMissionsError("");
          setIsLoadingAssignedMissions(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingAssignedMissions(true);
        setAssignedMissionsError("");
        setAssignedMissionsSuccess("");
      }

      try {
        const response = await fetch(`http://localhost:3000/api/missions/assigned/${userId}`, {
          headers: buildRoleHeaders(user),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data?.success === false) {
          throw new Error(data?.message || "Impossible de charger les missions affectees.");
        }

        if (isMounted) {
          setAssignedMissions(Array.isArray(data?.missions) ? data.missions : []);
        }
      } catch (error) {
        if (isMounted) {
          setAssignedMissions([]);
          setAssignedMissionsError(error?.message || "Impossible de charger les missions affectees.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingAssignedMissions(false);
        }
      }
    };

    fetchAssignedMissions();

    return () => {
      isMounted = false;
    };
  }, [user, userId]);

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

    if (!userId) {
      setProfileError("Impossible d'identifier l'utilisateur connecte.");
      return;
    }

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
          id: userId,
          NomComplet: profileName.trim(),
          Email: profileEmail.trim(),
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

  const openResultModal = (mission) => {
    setAssignedMissionsSuccess("");
    setResultError("");
    setResultMission(mission);
    setResultForm({
      NombreCandidatsPotentiels: getPotentialCandidatesCount(mission)?.toString() || "",
      Observations: normalizeText(mission?.Observations || mission?.observations),
    });
  };

  const closeResultModal = () => {
    setResultMission(null);
    setResultError("");
    setResultForm({
      NombreCandidatsPotentiels: "",
      Observations: "",
    });
  };

  const handleResultFieldChange = (key, value) => {
    setResultForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (resultError) {
      setResultError("");
    }
  };

  const handleResultSubmit = async (event) => {
    event.preventDefault();
    setResultError("");
    setAssignedMissionsSuccess("");

    if (!userId) {
      setResultError("Impossible d'identifier l'utilisateur connecte.");
      return;
    }

    if (!resultMission?.Id) {
      setResultError("Mission introuvable.");
      return;
    }

    if (!canSubmitMissionResult(resultMission)) {
      setResultError("Impossible de saisir le resultat d'une mission future.");
      return;
    }

    const rawCount = normalizeText(resultForm.NombreCandidatsPotentiels);
    if (!rawCount) {
      setResultError("Le nombre de candidats potentiels est obligatoire.");
      return;
    }

    const parsedCount = Number(rawCount);
    if (!Number.isInteger(parsedCount) || parsedCount < 0) {
      setResultError("Le nombre de candidats potentiels doit etre un entier positif ou nul.");
      return;
    }

    setIsSavingResult(true);

    try {
      const response = await fetch(`http://localhost:3000/api/missions/${resultMission.Id}/resultat`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...buildRoleHeaders(user),
        },
        body: JSON.stringify({
          userId,
          NombreCandidatsPotentiels: parsedCount,
          Observations: normalizeText(resultForm.Observations),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false || !data?.mission) {
        throw new Error(data?.message || "Impossible d'enregistrer le resultat de la mission.");
      }

      setAssignedMissions((prev) => prev.map((mission) => (
        String(mission.Id) === String(data.mission.Id) ? { ...mission, ...data.mission } : mission
      )));
      setAssignedMissionsSuccess(data?.message || "Resultat de mission enregistre avec succes.");
      closeResultModal();
    } catch (error) {
      setResultError(error?.message || "Impossible d'enregistrer le resultat de la mission.");
    } finally {
      setIsSavingResult(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!userId || !displayEmail) {
      setPasswordError("Impossible d'identifier l'utilisateur connecte.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Les trois champs sont obligatoires.");
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.message);
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
          id: userId,
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
      <section className="profile-hero">
        <div className="profile-hero__content">
          <p className="profile-hero__eyebrow">Espace personnel</p>
          <h1>Bonjour {displayName || "Utilisateur"} !</h1>
          <p className="profile-hero__text">{welcomeMessage}</p>

          <div className="profile-hero__meta">
            <span
              className="profile-hero__badge"
              style={{ background: info.bg, color: info.color, borderColor: info.border }}
            >
              {info.label || "Compte utilisateur"}
            </span>
          </div>
        </div>

        <div className="profile-hero__visual" aria-hidden="true">
          <div className="profile-hero__shape profile-hero__shape--large" />
          <div className="profile-hero__shape profile-hero__shape--small" />
          <div className="profile-hero__avatar">{avatarLabel}</div>
        </div>
      </section>

      <div className="profile-dashboard">
        <div className="profile-dashboard__main">
          <section className="profile-card profile-card--wide">
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

                <div className="profile-card__rows">
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
                  <div className="profile-card__row">
                    <span>Acces foyer</span>
                    <strong>{accesFoyerLabel}</strong>
                  </div>
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
                  { label: "Acces foyer", value: accesFoyerLabel },
                ].map((row) => (
                  <div key={row.label} className="profile-card__row">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="profile-card profile-missions">
            <div className="profile-card__head">
              <div>
                <h3 className="profile-card__title">Mes missions affectees</h3>
                <p className="profile-card__subtitle">Missions ou vous etes designe comme responsable.</p>
              </div>
            </div>

            {assignedMissionsError ? (
              <div className="profile-card__alert profile-card__alert--error">{assignedMissionsError}</div>
            ) : null}
            {assignedMissionsSuccess ? (
              <div className="profile-card__alert profile-card__alert--success">{assignedMissionsSuccess}</div>
            ) : null}

            {isLoadingAssignedMissions ? (
              <div className="profile-missions__empty">Chargement des missions affectees...</div>
            ) : assignedMissions.length === 0 ? (
              <div className="profile-missions__empty">Aucune mission affectee pour le moment.</div>
            ) : (
              <div className="profile-missions__list">
                {assignedMissions.map((mission) => {
                  const displayStatus = getMissionDisplayStatus(mission);
                  const canCaptureResult = canSubmitMissionResult(mission);
                  const potentialCandidates = getPotentialCandidatesCount(mission);
                  const observations = normalizeText(mission.Observations || mission.observations);

                  return (
                    <article key={mission.Id || mission.CodeMission} className="profile-mission-card">
                      <div className="profile-mission-card__head">
                        <div>
                          <p className="profile-mission-card__eyebrow">Mission affectee</p>
                          <h4>{missionCodeLabel(mission)}</h4>
                        </div>
                        <span className={getMissionStatusClass(displayStatus)}>{displayStatus}</span>
                      </div>

                      <div className="profile-mission-card__summary">
                        <span>{toDisplayDate(mission.DateMission || mission.date)}</span>
                        <span>{`${normalizeText(mission.Gouvernorat) || "Non renseigne"} - ${normalizeText(mission.Delegation) || "Non renseignee"}`}</span>
                      </div>

                      <div className="profile-mission-card__grid">
                        <div className="profile-mission-card__item">
                          <span>Transport</span>
                          <strong>{normalizeText(mission.Transport || mission.transport) || "Non renseigne"}</strong>
                        </div>
                        <div className="profile-mission-card__item">
                          <span>Objectif</span>
                          <strong>{normalizeText(mission.Objectif || mission.objectif) || "Non renseigne"}</strong>
                        </div>
                        <div className="profile-mission-card__item">
                          <span>Creee par</span>
                          <strong>{normalizeText(mission.CreeParNom || mission.createdBy) || "Non renseigne"}</strong>
                        </div>
                      </div>

                      <div className="profile-mission-card__actions">
                        {canCaptureResult ? (
                          <button type="button" className="profile-card__action profile-mission-card__action" onClick={() => openResultModal(mission)}>
                            Saisir resultat
                          </button>
                        ) : (
                          <span className="profile-mission-card__helper">Resultat disponible le jour de la mission</span>
                        )}
                      </div>

                      {potentialCandidates !== null || observations ? (
                        <div className="profile-mission-card__note profile-mission-card__note--result">
                          {potentialCandidates !== null ? (
                            <div className="profile-mission-card__result-row">
                              <span>Nombre de candidats potentiels</span>
                              <strong>{potentialCandidates}</strong>
                            </div>
                          ) : null}
                          {observations ? (
                            <div className="profile-mission-card__result-copy">
                              <span>Observations</span>
                              <p>{observations}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="profile-dashboard__side">
          <section className="profile-card">
            <div className="profile-card__head">
              <div>
                <h3 className="profile-card__title">Securite</h3>
                <p className="profile-card__subtitle">Gerez la securite du compte et l'etat de la session.</p>
              </div>
              {!isEditingSecurity ? (
                <button type="button" className="profile-card__action" onClick={handleSecurityToggle}>
                  Modifier
                </button>
              ) : null}
            </div>

            {passwordError ? <div className="profile-card__alert profile-card__alert--error">{passwordError}</div> : null}
            {passwordSuccess ? <div className="profile-card__alert profile-card__alert--success">{passwordSuccess}</div> : null}

            {!isEditingSecurity ? (
              <div className="profile-card__rows">
                <div className="profile-card__row">
                  <span>Mot de passe</span>
                  <strong>********</strong>
                </div>
                <div className="profile-card__row">
                  <span>Session</span>
                  <strong>Connecte</strong>
                </div>
              </div>
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
        </aside>
      </div>

      {resultMission ? (
        <MissionResultModal
          mission={resultMission}
          form={resultForm}
          error={resultError}
          saving={isSavingResult}
          onChange={handleResultFieldChange}
          onClose={closeResultModal}
          onSubmit={handleResultSubmit}
        />
      ) : null}
    </div>
  );
}
