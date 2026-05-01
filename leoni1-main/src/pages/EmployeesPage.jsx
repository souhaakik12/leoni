import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { buildRoleHeaders } from "../utils/roles.js";
import "./EmployeesPage.css";

const API_URL = "http://localhost:3000/api/utilisateurs";

const emptyForm = {
  id: null,
  NomComplet: "",
  Email: "",
  Role: "recruteur",
  AccesFoyer: "1",
};

const filters = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "inactive", label: "Inactifs" },
];

const roleLabels = {
  admin: "Admin",
  recruteur: "Recruteur",
  contrats: "Contrats",
};

function normalizeValue(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getInitials(fullName = "") {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const currentUserId = user?.Id || user?.id;
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const totalCount = users.length;
  const activeCount = users.filter((item) => Number(item.Actif) === 1).length;
  const inactiveCount = totalCount - activeCount;

  const filteredUsers = users.filter((item) => {
    const normalizedSearch = normalizeValue(search.trim());
    const normalizedName = normalizeValue(item.NomComplet);
    const normalizedEmail = normalizeValue(item.Email);
    const normalizedRole = normalizeValue(item.Role);
    const matchesSearch =
      !normalizedSearch ||
      normalizedName.includes(normalizedSearch) ||
      normalizedEmail.includes(normalizedSearch) ||
      normalizedRole.includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (activeFilter === "active") {
      return Number(item.Actif) === 1;
    }

    if (activeFilter === "inactive") {
      return Number(item.Actif) === 0;
    }

    return true;
  });

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        headers: buildRoleHeaders(user),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Impossible de charger les utilisateurs.");
      }

      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (requestError) {
      setError(requestError.message || "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    loadUsers();
  }, [user]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const closeModal = () => {
    resetForm();
    setError("");
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    resetForm();
    setMessage("");
    setError("");
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError("");
    setIsDeleting(false);
  };

  const handleEdit = (selectedUser) => {
    setEditingId(selectedUser.Id);
    setForm({
      id: selectedUser.Id,
      NomComplet: selectedUser.NomComplet || "",
      Email: selectedUser.Email || "",
      Role: selectedUser.Role || "recruteur",
      AccesFoyer: String(Number(selectedUser.AccesFoyer ?? 0)),
    });
    setMessage("");
    setError("");
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (selectedUser) => {
    if (selectedUser.Id === currentUserId) {
      return;
    }

    setDeleteTarget(selectedUser);
    setDeleteError("");
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      NomComplet: form.NomComplet.trim(),
      Email: form.Email.trim(),
      Role: form.Role,
      AccesFoyer: Number(form.AccesFoyer),
    };

    if (!payload.NomComplet || !payload.Email || !payload.Role) {
      setError("Veuillez renseigner tous les champs obligatoires.");
      setSaving(false);
      return;
    }

    try {
      const isEditing = Boolean(editingId);
      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: buildRoleHeaders(user, {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Enregistrement impossible.");
      }

      setMessage(
        data?.message ||
          (isEditing
            ? "Utilisateur modifie avec succes."
            : "Utilisateur cree avec succes.")
      );

      closeModal();
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteTarget.Id === currentUserId) {
      return;
    }

    setDeleteError("");
    setError("");
    setMessage("");
    setIsDeleting(true);

    try {
      const response = await fetch(`${API_URL}/${deleteTarget.Id}`, {
        method: "DELETE",
        headers: buildRoleHeaders(user),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Suppression impossible.");
      }

      setMessage(data?.message || "Utilisateur supprime avec succes.");
      if (editingId === deleteTarget.Id) {
        closeModal();
      }
      closeDeleteModal();
      await loadUsers();
    } catch (requestError) {
      setDeleteError(requestError.message || "Suppression impossible.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="employees-page">
      <section className="employees-hero">
        <div className="employees-hero__copy">
          <span className="employees-hero__eyebrow">Administration RH</span>
          <h1>Equipe interne</h1>
          <p>Collaborateurs du bureau - acces administrateur uniquement</p>
        </div>

        <button
          type="button"
          className="employees-button employees-button--primary"
          onClick={openCreateModal}
        >
          + Ajouter un employe
        </button>
      </section>

      {message && (
        <div className="employees-alert employees-alert--success">{message}</div>
      )}

      {!isModalOpen && error && (
        <div className="employees-alert employees-alert--error">{error}</div>
      )}

      <section className="employees-stats">
        <article className="employees-stat">
          <span className="employees-stat__label">Total</span>
          <strong>{totalCount}</strong>
          <p>Collaborateurs enregistres</p>
        </article>

        <article className="employees-stat">
          <span className="employees-stat__label">Actifs</span>
          <strong>{activeCount}</strong>
          <p>Comptes actuellement actifs</p>
        </article>

        <article className="employees-stat">
          <span className="employees-stat__label">Inactifs</span>
          <strong>{inactiveCount}</strong>
          <p>Profils desactives</p>
        </article>
      </section>

      <section className="employees-toolbar">
        <label className="employees-search" htmlFor="employees-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16L21 21" />
          </svg>
          <input
            id="employees-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un nom, un email ou un role"
          />
        </label>

        <div className="employees-filters" aria-label="Filtres utilisateurs">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`employees-filter${
                activeFilter === filter.key ? " employees-filter--active" : ""
              }`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className="employees-directory">
        <div className="employees-directory__head">
          <div>
            <h2>Liste des collaborateurs</h2>
            <p>{filteredUsers.length} profil(s) affiche(s)</p>
          </div>
        </div>

        {loading ? (
          <div className="employees-empty">
            <h3>Chargement des utilisateurs</h3>
            <p>Les collaborateurs sont en cours de recuperation.</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="employees-empty">
            <h3>Aucun utilisateur trouve</h3>
            <p>Essayez de modifier la recherche ou le filtre selectionne.</p>
          </div>
        ) : (
          <div className="employees-grid">
            {filteredUsers.map((item) => {
              const isActive = Number(item.Actif) === 1;
              const hasHomeAccess =
                item.AccesFoyer !== undefined && item.AccesFoyer !== null;
              const isCurrentUser = item.Id === currentUserId;

              return (
                <article key={item.Id} className="employee-card">
                  <div className="employee-card__header">
                    <div className="employee-card__identity">
                      <div className="employee-avatar">
                        {getInitials(item.NomComplet)}
                      </div>

                      <div className="employee-card__text">
                        <h3>{item.NomComplet}</h3>
                        <p>{item.Email}</p>
                      </div>
                    </div>

                    <span
                      className={`employee-badge ${
                        isActive
                          ? "employee-badge--status-active"
                          : "employee-badge--status-inactive"
                      }`}
                    >
                      {isActive ? "Actif" : "Inactif"}
                    </span>
                  </div>

                  <div className="employee-card__details">
                    <span
                      className={`employee-badge employee-badge--role employee-badge--role-${item.Role}`}
                    >
                      {roleLabels[item.Role] || item.Role}
                    </span>

                    {hasHomeAccess && (
                      <span
                        className={`employee-badge ${
                          Number(item.AccesFoyer) === 1
                            ? "employee-badge--access-yes"
                            : "employee-badge--access-no"
                        }`}
                      >
                        Acces foyer : {Number(item.AccesFoyer) === 1 ? "Oui" : "Non"}
                      </span>
                    )}
                  </div>

                  <div className="employee-card__actions">
                    <button
                      type="button"
                      className="employees-button employees-button--ghost"
                      onClick={() => handleEdit(item)}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      className="employees-button employees-button--danger"
                      onClick={() => handleDeleteRequest(item)}
                      disabled={isCurrentUser}
                      title={
                        isCurrentUser
                          ? "Vous ne pouvez pas supprimer votre propre compte."
                          : undefined
                      }
                    >
                      Supprimer
                    </button>
                  </div>

                  {isCurrentUser ? (
                    <p className="employee-card__hint">
                      Vous ne pouvez pas supprimer votre propre compte.
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="employees-modal-backdrop" onClick={closeModal}>
          <div
            className="employees-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="employees-modal__header">
              <div>
                <h2>
                  {editingId ? "Modifier un utilisateur" : "Ajouter un utilisateur"}
                </h2>
                <p>
                  {editingId
                    ? "Mettez a jour les informations du collaborateur."
                    : "Creez un nouveau compte interne avec invitation email."}
                </p>
              </div>

              <button
                type="button"
                className="employees-modal__close"
                onClick={closeModal}
                aria-label="Fermer"
              >
                X
              </button>
            </div>

            {error && (
              <div className="employees-alert employees-alert--error">{error}</div>
            )}

            <form className="employees-form" onSubmit={handleSubmit}>
              <label>
                <span>Nom complet</span>
                <input
                  type="text"
                  value={form.NomComplet}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      NomComplet: event.target.value,
                    }))
                  }
                  placeholder="Ex. Salma Ben Ali"
                  required
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={form.Email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, Email: event.target.value }))
                  }
                  placeholder="nom.prenom@leoni.local"
                  required
                />
              </label>

              <div className="employees-form__grid">
                <label>
                  <span>Role</span>
                  <select
                    value={form.Role}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, Role: event.target.value }))
                    }
                  >
                    <option value="admin">admin</option>
                    <option value="recruteur">recruteur</option>
                    <option value="contrats">contrats</option>
                  </select>
                </label>

                <label>
                  <span>Acces foyer</span>
                  <select
                    value={form.AccesFoyer}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        AccesFoyer: event.target.value,
                      }))
                    }
                  >
                    <option value="1">Oui</option>
                    <option value="0">Non</option>
                  </select>
                </label>
              </div>

              <div className="employees-form__actions">
                <button
                  type="button"
                  className="employees-button employees-button--secondary"
                  onClick={closeModal}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="employees-button employees-button--primary"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingId
                      ? "Enregistrer"
                      : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="employees-modal-backdrop" onClick={closeDeleteModal}>
          <div
            className="employees-modal employees-modal--confirm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="employees-modal__header">
              <div>
                <h2>Confirmer la suppression</h2>
                <p>
                  Voulez-vous vraiment supprimer cet utilisateur ? Cette action est definitive.
                </p>
              </div>

              <button
                type="button"
                className="employees-modal__close"
                onClick={closeDeleteModal}
                aria-label="Fermer"
              >
                X
              </button>
            </div>

            {deleteError ? (
              <div className="employees-alert employees-alert--error">{deleteError}</div>
            ) : null}

            <div className="employees-confirm">
              <div className="employees-confirm__user">
                <strong>{deleteTarget.NomComplet}</strong>
                <span>{deleteTarget.Email}</span>
              </div>

              <div className="employees-form__actions employees-form__actions--confirm">
                <button
                  type="button"
                  className="employees-button employees-button--secondary"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                >
                  Annuler
                </button>

                <button
                  type="button"
                  className="employees-button employees-button--danger"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Suppression..." : "Supprimer definitivement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
