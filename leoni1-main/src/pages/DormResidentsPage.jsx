import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./DormResidentsPage.css";

const statusOptions = ["Au foyer", "Malade", "Absente", "Quittée"];
const statusStyle = {
  "Au foyer": { bg: "#dcfce7", color: "#15803d" },
  "Malade": { bg: "#ffedd5", color: "#c2410c" },
  "Absente": { bg: "#e5e7eb", color: "#374151" },
  "Quittée": { bg: "#fee2e2", color: "#dc2626" },
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 7,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const NEXT_MONTH_COTISATION = 60;

function getDayNumber(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.getDate();
}

function computeCotisation(entryDate, exitDate) {
  const exitDay = getDayNumber(exitDate);
  if (exitDay !== null) {
    return exitDay <= 15 ? 30 : 60;
  }

  const entryDay = getDayNumber(entryDate);
  if (entryDay === null) return "";
  return entryDay <= 15 ? 60 : 30;
}

function computeReste(cotisation) {
  if (cotisation === "" || cotisation === null || cotisation === undefined) return "";
  return Number(cotisation) + NEXT_MONTH_COTISATION;
}

function emptyResident() {
  return {
    fullName: "",
    matricule: "",
    age: "",
    phone: "",
    parentPhone: "",
    room: "",
    status: "Au foyer",
    entryDate: "",
    exitDate: "",
    cin: "",
    email: "",
  };
}

function normalizeDormId(rawDormId) {
  const numeric = Number(rawDormId);
  if (!Number.isNaN(numeric)) return numeric;

  const matchedDigits = String(rawDormId || "").match(/\d+/)?.[0];
  if (!matchedDigits) return rawDormId;
  return Number(matchedDigits);
}

function mapResidentFromApi(r) {
  return {
    id: r.id,
    fullName: r.nom_complet ?? r.fullName ?? "",
    matricule: r.matricule == null ? "" : String(r.matricule),
    age: r.age ?? "",
    phone: r.telephone ?? r.phone ?? "",
    parentPhone: r.tel_parent ?? r.parentPhone ?? "",
    room: r.chambre ?? r.room ?? "",
    status: r.etat ?? r.status ?? "Au foyer",
    entryDate: r.date_entree ?? r.entryDate ?? "",
    exitDate: r.date_sortie ?? r.exitDate ?? "",
    cin: r.cin ?? "",
    email: r.email ?? "",
  };
}

function mapDormFromApi(d) {
  return {
    id: d.id,
    nom: d.nom ?? d.name ?? "",
    adresse: d.adresse ?? d.address ?? "",
    telephone: d.telephone ?? d.phone ?? "",
    capacite: Number(d.capacite ?? d.capacity ?? 0),
  };
}

function ResidentFormModal({ initialData, onClose, onSave }) {
  const isEdit = !!initialData?.id;
  const [form, setForm] = useState(
    initialData ? { ...initialData, exitDate: initialData.exitDate || "" } : emptyResident()
  );
  const [errors, setErrors] = useState({});
  useEffect(() => {
    setForm(initialData ? { ...initialData, exitDate: initialData.exitDate || "" } : emptyResident());
  }, [initialData]);
  const autoCotisation = useMemo(
    () => computeCotisation(form.entryDate, form.exitDate),
    [form.entryDate, form.exitDate]
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Required";
    if (!String(form.age).trim()) next.age = "Required";
    if (!form.phone.trim()) next.phone = "Required";
    if (!form.parentPhone.trim()) next.parentPhone = "Required";
    if (!form.room.trim()) next.room = "Required";
    if (!form.entryDate) next.entryDate = "Required";
    return next;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    await onSave({ ...form, cotisation: autoCotisation });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 760,
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #f3f4f6" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
            {isEdit ? "Modifier la residente" : "Ajouter une residente"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ padding: "20px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
          {[
            { key: "fullName", label: "Nom complet", type: "text" },
            { key: "matricule", label: "Matricule", type: "text" },
            { key: "age", label: "Age", type: "number" },
            { key: "phone", label: "Telephone", type: "text" },
            { key: "parentPhone", label: "Tel. parent", type: "text" },
            { key: "room", label: "Chambre", type: "text" },
            { key: "entryDate", label: "Date d'entree", type: "date" },
            { key: "exitDate", label: "Date de sortie", type: "date" },
            { key: "cin", label: "CIN", type: "text" },
            { key: "email", label: "Email", type: "email" },
          ].map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                {f.label}
              </label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                style={{ ...inputStyle, borderColor: errors[f.key] ? "#dc2626" : "#d1d5db" }}
              />
              {errors[f.key] && <p style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{errors[f.key]}</p>}
            </div>
          ))}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              Etat
            </label>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)} style={inputStyle}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              Cotisation (auto)
            </label>
            <div
              style={{
                ...inputStyle,
                background: "#f9fafb",
                color: "#111827",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                minHeight: 35,
              }}
            >
              {autoCotisation === "" ? "-" : `${autoCotisation} DT`}
            </div>
            <p style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
              Entree 1-15 = 60 DT, Entree 16+ = 30 DT, Sortie 1-15 = 30 DT, Sortie 16+ = 60 DT.
            </p>
          </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid #f3f4f6" }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 600 }}>
            Annuler
            </button>
            <button type="submit" style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700 }}>
              {isEdit ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DormResidentsPage() {
  const navigate = useNavigate();
  const { dormId } = useParams();
  const normalizedDormId = normalizeDormId(dormId);

  const [foyer, setFoyer] = useState(null);
  const [isFoyerLoading, setIsFoyerLoading] = useState(true);
  const [residents, setResidents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingResident, setEditingResident] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadFoyer = async () => {
      setIsFoyerLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/api/foyer/${normalizedDormId}`);
        if (!res.ok) {
          throw new Error(`Foyer fetch failed with status ${res.status}`);
        }

        const data = await res.json();
        const rawFoyer = Array.isArray(data) ? data[0] : data;
        if (isMounted) {
          setFoyer(rawFoyer ? mapDormFromApi(rawFoyer) : null);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setFoyer(null);
        }
      } finally {
        if (isMounted) {
          setIsFoyerLoading(false);
        }
      }
    };

    loadFoyer();
    return () => {
      isMounted = false;
    };
  }, [normalizedDormId]);

  useEffect(() => {
    let isMounted = true;

    const loadResidents = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/resident/${normalizedDormId}`);
        if (!res.ok) {
          throw new Error(`Fetch failed with status ${res.status}`);
        }

        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        console.log("Residents API matricules:", rows.map((r) => r.matricule));
        if (isMounted) {
          setResidents(rows.map(mapResidentFromApi));
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setResidents([]);
        }
      }
    };

    loadResidents();
    setShowForm(false);
    setEditingResident(null);

    return () => {
      isMounted = false;
    };
  }, [normalizedDormId]);

  const stats = useMemo(() => {
    const total = foyer?.capacite || 0;
    const occupied = residents.length;
    const available = Math.max(total - occupied, 0);
    const ratio = total > 0 ? (occupied / total) * 100 : 0;
    return {
      total,
      occupied,
      available,
      ratio: ratio.toFixed(1),
    };
  }, [foyer, residents]);

  const startCreate = () => {
    setEditingResident(null);
    setShowForm(true);
  };

  const handleEdit = (resident) => {
    setEditingResident(resident);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const residentToDelete = residents.find((r) => r.id === id);
    if (!window.confirm(`Supprimer ${residentToDelete?.fullName || "cette residente"} ?`)) return;

    try {
      const res = await fetch(`http://localhost:3000/api/resident/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Delete failed with status ${res.status}`);
      }

      setResidents((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (formData) => {
    console.log("Saving:", formData);
    const resolvedExitDate =
      formData.status === "Quittée" && !formData.exitDate
        ? new Date().toISOString().slice(0, 10)
        : formData.exitDate;
    const cotisation = computeCotisation(formData.entryDate, resolvedExitDate);
    const reste = computeReste(cotisation);
    const payload = {
      nom_complet: formData.fullName,
      matricule: String(formData.matricule ?? "").trim(),
      age: formData.age,
      telephone: formData.phone,
      tel_parent: formData.parentPhone,
      chambre: formData.room,
      etat: formData.status,
      date_entree: formData.entryDate,
      date_sortie: resolvedExitDate || null,
      cin: formData.cin,
      email: formData.email,
      foyer_id: normalizedDormId,
      cotisation,
      reste,
    };
    console.log("Saving resident matricule:", payload.matricule);

    const url = editingResident
      ? `http://localhost:3000/api/resident/${editingResident.id}`
      : "http://localhost:3000/api/resident";
    const method = editingResident ? "PUT" : "POST";

    try {
      const saveRes = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) {
        const errorBody = await saveRes.text();
        console.error("Save API error:", errorBody);
        throw new Error(`Save failed with status ${saveRes.status}`);
      }
      let apiResident = null;
      try {
        const data = await saveRes.json();
        if (data && typeof data === "object" && "id" in data) {
          apiResident = mapResidentFromApi(data);
          console.log("Resident save response matricule:", data.matricule);
        }
      } catch {
        apiResident = null;
      }

      if (apiResident) {
        if (editingResident) {
          setResidents((prev) => prev.map((r) => (r.id === editingResident.id ? apiResident : r)));
        } else {
          setResidents((prev) => [...prev, apiResident]);
        }
      } else {
        const residentsRes = await fetch(`http://localhost:3000/api/resident/${normalizedDormId}`);
        if (!residentsRes.ok) {
          throw new Error(`Reload failed with status ${residentsRes.status}`);
        }

        const data = await residentsRes.json();
        const rows = Array.isArray(data) ? data : [];
        setResidents(rows.map(mapResidentFromApi));
      }

      setShowForm(false);
      setEditingResident(null);
    } catch (err) {
      console.error(err);
    }
  };
  if (isFoyerLoading) {
    return (
      <div className="dorm-page-state">
        <h2>Chargement du foyer...</h2>
      </div>
    );
  }

  if (!foyer) {
    return (
      <div className="dorm-page-state">
        <h2>Foyer introuvable</h2>
        <button onClick={() => navigate("/dorms")} className="dorm-ghost-btn">
          Retour aux foyers
        </button>
      </div>
    );
  }

  return (
    <div className="dorm-dashboard">
      <div className="dorm-header">
        <div>
          <button onClick={() => navigate("/dorms")} className="dorm-back-btn">
            {"< Retour"}
          </button>
          <h2 className="dorm-title">{foyer.nom}</h2>
          <div className="dorm-meta">
            <span>{foyer.adresse}</span>
            <span>{foyer.telephone}</span>
          </div>
        </div>
        <button onClick={startCreate} className="dorm-primary-btn">
          + Ajouter une residente
        </button>
      </div>

      <div className="dorm-stats-grid">
        <div className="dorm-stat-card">
          <p className="dorm-stat-label">Capacite Totale</p>
          <p className="dorm-stat-value">{stats.total}</p>
        </div>
        <div className="dorm-stat-card">
          <p className="dorm-stat-label">Places Occupees</p>
          <p className="dorm-stat-value dorm-stat-primary">{stats.occupied}</p>
        </div>
        <div className="dorm-stat-card">
          <p className="dorm-stat-label">Places Disponibles</p>
          <p className="dorm-stat-value dorm-stat-success">{stats.available}</p>
        </div>
        <div className="dorm-stat-card">
          <p className="dorm-stat-label">Taux d'Occupation</p>
          <p className="dorm-stat-value dorm-stat-alert">{stats.ratio}%</p>
        </div>
      </div>

      <div className="dorm-panel">
        <div className="dorm-panel-head">
          <h3>Residentes Actives ({residents.length})</h3>
        </div>

        <div className="dorm-table-wrap">
          <table className="dorm-table">
            <thead>
              <tr>
                {["NOM COMPLET", "MATRICULE", "AGE", "TELEPHONE", "TEL. PARENT", "CHAMBRE", "ETAT", "COTISATION", "RESTE", "DATE D'ENTREE", "DATE DE SORTIE", "ACTIONS"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {residents.length === 0 ? (
                <tr>
                  <td colSpan={12} className="dorm-empty-cell">
                    Aucune residente pour le moment.
                  </td>
                </tr>
              ) : (
                residents.map((r, i) => {
                  const st = statusStyle[r.status] || statusStyle["Absente"];
                  const cotisation = computeCotisation(r.entryDate, r.exitDate);
                  const reste = computeReste(cotisation);
                  return (
                    <tr key={r.id} className="dorm-row" style={{ borderBottom: i < residents.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                      <td className="dorm-name-cell">{r.fullName}</td>
                      <td>{String(r.matricule ?? "").trim() || "-"}</td>
                      <td>{r.age} ans</td>
                      <td className="dorm-phone-cell">{r.phone}</td>
                      <td>{r.parentPhone}</td>
                      <td className="dorm-room-cell">{r.room}</td>
                      <td>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                          {r.status}
                        </span>
                      </td>
                      <td className="dorm-money-success">{cotisation === "" ? "-" : `${cotisation} DT`}</td>
                      <td className="dorm-money-alert">{reste === "" ? "-" : `${reste} DT`}</td>
                      <td>{new Date(r.entryDate).toLocaleDateString("fr-FR")}</td>
                      <td>{r.exitDate ? new Date(r.exitDate).toLocaleDateString("fr-FR") : "-"}</td>
                      <td>
                        <div className="dorm-actions">
                          <button onClick={() => handleEdit(r)} title="Modifier" className="dorm-icon-btn dorm-icon-edit">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(r.id)} title="Supprimer" className="dorm-icon-btn dorm-icon-delete">
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ResidentFormModal
          initialData={editingResident}
          onClose={() => {
            setShowForm(false);
            setEditingResident(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

