import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { dormsCatalog, initialResidentsByDorm } from "../data/dormsData.js";

const statusOptions = ["Au foyer", "Malade", "Absente"];
const statusStyle = {
  "Au foyer": { bg: "#dcfce7", color: "#15803d" },
  "Malade": { bg: "#ffedd5", color: "#c2410c" },
  "Absente": { bg: "#e5e7eb", color: "#374151" },
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

function emptyResident() {
  return {
    fullName: "",
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

function ResidentFormModal({ initialData, onClose, onSave }) {
  const isEdit = !!initialData?.id;
  const [form, setForm] = useState(
    initialData ? { ...initialData, exitDate: initialData.exitDate || "" } : emptyResident()
  );
  const [errors, setErrors] = useState({});
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

  const handleSubmit = () => {
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    onSave({ ...form, cotisation: autoCotisation });
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

        <div style={{ padding: "20px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
          {[
            { key: "fullName", label: "Nom complet", type: "text" },
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
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 600 }}>
            Annuler
          </button>
          <button onClick={handleSubmit} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700 }}>
            {isEdit ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DormResidentsPage() {
  const navigate = useNavigate();
  const { dormId } = useParams();

  const dorm = dormsCatalog.find((d) => d.id === dormId);

  const [residents, setResidents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingResident, setEditingResident] = useState(null);

  useEffect(() => {
    const seed = initialResidentsByDorm[dormId] || [];
    setResidents(seed.map((r) => ({ ...r, exitDate: r.exitDate || "" })));
    setShowForm(false);
    setEditingResident(null);
  }, [dormId]);

  const stats = useMemo(() => {
    const total = dorm?.capacite || 0;
    const occupied = residents.length;
    const available = Math.max(total - occupied, 0);
    const ratio = total > 0 ? (occupied / total) * 100 : 0;
    return {
      total,
      occupied,
      available,
      ratio: ratio.toFixed(1),
    };
  }, [dorm, residents]);

  const startCreate = () => {
    setEditingResident(null);
    setShowForm(true);
  };

  const startEdit = (resident) => {
    setEditingResident(resident);
    setShowForm(true);
  };

  const handleDelete = (resident) => {
    if (!window.confirm(`Supprimer ${resident.fullName} ?`)) return;
    setResidents((prev) => prev.filter((r) => r.id !== resident.id));
  };

  const handleSave = (formData) => {
    const normalized = {
      ...formData,
      exitDate: formData.exitDate || "",
      cotisation: computeCotisation(formData.entryDate, formData.exitDate),
    };

    if (editingResident) {
      setResidents((prev) =>
        prev.map((r) => (r.id === editingResident.id ? { ...r, ...normalized } : r))
      );
    } else {
      const newResident = { ...normalized, id: `R${Date.now()}` };
      setResidents((prev) => [...prev, newResident]);
    }
    setShowForm(false);
    setEditingResident(null);
  };

  if (!dorm) {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Foyer introuvable</h2>
        <button onClick={() => navigate("/dorms")} style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>
          Retour aux foyers
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <button onClick={() => navigate("/dorms")} style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            ← Retour
          </button>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: "#111827" }}>{dorm.nom}</h2>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 6, color: "#4b5563", fontSize: 15 }}>
            <span>{dorm.adresse}</span>
            <span>{dorm.telephone}</span>
          </div>
        </div>
        <button
          onClick={startCreate}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 20px",
            fontSize: 20,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 14px rgba(37,99,235,0.28)",
          }}
        >
          + Ajouter une residente
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Capacite Totale</p>
          <p style={{ fontSize: 42, lineHeight: 1, fontWeight: 800, color: "#111827" }}>{stats.total}</p>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Places Occupees</p>
          <p style={{ fontSize: 42, lineHeight: 1, fontWeight: 800, color: "#2563eb" }}>{stats.occupied}</p>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Places Disponibles</p>
          <p style={{ fontSize: 42, lineHeight: 1, fontWeight: 800, color: "#16a34a" }}>{stats.available}</p>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Taux d'Occupation</p>
          <p style={{ fontSize: 42, lineHeight: 1, fontWeight: 800, color: "#ea580c" }}>{stats.ratio}%</p>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 37, fontWeight: 800, color: "#111827" }}>
            Residentes Actives ({residents.length})
          </h3>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
              {["NOM COMPLET", "AGE", "TELEPHONE", "TEL. PARENT", "CHAMBRE", "ETAT", "COTISATION", "DATE D'ENTREE", "DATE DE SORTIE", "ACTIONS"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6b7280",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {residents.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: "36px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  Aucune residente pour le moment.
                </td>
              </tr>
            ) : (
              residents.map((r, i) => {
                const st = statusStyle[r.status] || statusStyle["Absente"];
                const cotisation = computeCotisation(r.entryDate, r.exitDate);
                return (
                  <tr key={r.id} style={{ borderBottom: i < residents.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#111827" }}>{r.fullName}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151" }}>{r.age} ans</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#2563eb" }}>{r.phone}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151" }}>{r.parentPhone}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#111827", fontWeight: 700 }}>{r.room}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
                      {cotisation === "" ? "-" : `${cotisation} DT`}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151" }}>{new Date(r.entryDate).toLocaleDateString("fr-FR")}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151" }}>
                      {r.exitDate ? new Date(r.exitDate).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => startEdit(r)}
                          title="Modifier"
                          style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#eff6ff", color: "#2563eb" }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          title="Supprimer"
                          style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#fee2e2", color: "#dc2626" }}
                        >
                          🗑
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
