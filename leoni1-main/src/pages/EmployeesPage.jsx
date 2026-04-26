import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { buildRoleHeaders } from "../utils/roles.js";
import "./EmployeesPage.css";

const emptyForm = {
  id: null,
  NomComplet: "",
  Email: "",
  MotDePasse: "",
  Role: "recruteur",
  AccesFoyer: 1,
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const loadUsers = async (searchValue = "") => {
    setLoading(true);
    setError("");

    try {
      const query = searchValue.trim() ? `?search=${encodeURIComponent(searchValue.trim())}` : "";
      const response = await fetch(`http://localhost:3000/api/utilisateurs${query}`, {
        headers: buildRoleHeaders(user),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de charger les utilisateurs");
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        NomComplet: form.NomComplet,
        Email: form.Email,
        MotDePasse: form.MotDePasse,
        Role: form.Role,
        AccesFoyer: Number(form.AccesFoyer),
      };

      const isEditing = Boolean(editingId);
      const response = await fetch(
        isEditing
          ? `http://localhost:3000/api/utilisateurs/${editingId}`
          : "http://localhost:3000/api/utilisateurs",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildRoleHeaders(user),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Enregistrement impossible");
      }

      setMessage(isEditing ? "Utilisateur modifie avec succes." : "Utilisateur ajoute avec succes.");
      resetForm();
      await loadUsers(search);
    } catch (err) {
      setError(err.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (selectedUser) => {
    setEditingId(selectedUser.Id);
    setForm({
      id: selectedUser.Id,
      NomComplet: selectedUser.NomComplet || "",
      Email: selectedUser.Email || "",
      MotDePasse: "",
      Role: selectedUser.Role || "recruteur",
      AccesFoyer: Number(selectedUser.AccesFoyer ?? 0),
    });
    setMessage("");
    setError("");
  };

  const handleDeactivate = async (selectedUser) => {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`http://localhost:3000/api/utilisateurs/${selectedUser.Id}`, {
        method: "DELETE",
        headers: buildRoleHeaders(user),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Desactivation impossible");
      }

      if (editingId === selectedUser.Id) {
        resetForm();
      }

      setMessage(`Utilisateur ${selectedUser.NomComplet} desactive.`);
      await loadUsers(search);
    } catch (err) {
      setError(err.message || "Desactivation impossible");
    }
  };

  return (
    <div className="employees-page">
      <section className="employees-hero">
        <div>
          <h2>Gestion des utilisateurs</h2>
          <p>Administration des comptes, roles et acces foyer.</p>
        </div>
      </section>

      <div className="employees-layout">
        <section className="employees-card">
          <div className="employees-card__head">
            <div>
              <h3>Utilisateurs</h3>
              <p>Recherche, consultation et desactivation logique.</p>
            </div>
            <div className="employees-search">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par nom, email ou role"
              />
              <button type="button" onClick={() => loadUsers(search)}>Rechercher</button>
            </div>
          </div>

          {error && <div className="employees-alert employees-alert--error">{error}</div>}
          {message && <div className="employees-alert employees-alert--success">{message}</div>}

          <div className="employees-table">
            <div className="employees-table__row employees-table__row--head">
              <span>Nom</span>
              <span>Email</span>
              <span>Role</span>
              <span>Foyer</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>

            {loading ? (
              <div className="employees-table__empty">Chargement des utilisateurs...</div>
            ) : users.length === 0 ? (
              <div className="employees-table__empty">Aucun utilisateur trouve.</div>
            ) : (
              users.map((item) => (
                <div key={item.Id} className="employees-table__row">
                  <span>{item.NomComplet}</span>
                  <span>{item.Email}</span>
                  <span>{item.Role}</span>
                  <span>{Number(item.AccesFoyer) === 1 ? "Oui" : "Non"}</span>
                  <span>{Number(item.Actif) === 1 ? "Actif" : "Inactif"}</span>
                  <span className="employees-table__actions">
                    <button type="button" onClick={() => handleEdit(item)}>Modifier</button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeactivate(item)}
                      disabled={Number(item.Actif) === 0}
                    >
                      Desactiver
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="employees-card employees-card--form">
          <div className="employees-card__head">
            <div>
              <h3>{editingId ? "Modifier un utilisateur" : "Ajouter un utilisateur"}</h3>
              <p>{editingId ? "Le mot de passe est optionnel lors d'une modification." : "Creation d'un nouveau compte systeme."}</p>
            </div>
          </div>

          <form className="employees-form" onSubmit={handleSubmit}>
            <label>
              <span>Nom complet</span>
              <input
                type="text"
                value={form.NomComplet}
                onChange={(event) => setForm((current) => ({ ...current, NomComplet: event.target.value }))}
                required
              />
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                value={form.Email}
                onChange={(event) => setForm((current) => ({ ...current, Email: event.target.value }))}
                required
              />
            </label>

            <label>
              <span>Mot de passe</span>
              <input
                type="password"
                value={form.MotDePasse}
                onChange={(event) => setForm((current) => ({ ...current, MotDePasse: event.target.value }))}
                required={!editingId}
                placeholder={editingId ? "Laisser vide pour conserver l'ancien" : ""}
              />
            </label>

            <label>
              <span>Role</span>
              <select
                value={form.Role}
                onChange={(event) => setForm((current) => ({ ...current, Role: event.target.value }))}
              >
                <option value="admin">admin</option>
                <option value="recruteur">recruteur</option>
                <option value="contrats">contrats</option>
              </select>
            </label>

            <label>
              <span>Acces foyer</span>
              <select
                value={String(form.AccesFoyer)}
                onChange={(event) => setForm((current) => ({ ...current, AccesFoyer: Number(event.target.value) }))}
              >
                <option value="1">Oui</option>
                <option value="0">Non</option>
              </select>
            </label>

            <div className="employees-form__actions">
              <button type="submit" disabled={saving}>
                {saving ? "Enregistrement..." : editingId ? "Enregistrer" : "Ajouter"}
              </button>
              <button type="button" className="secondary" onClick={resetForm}>
                Annuler
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
