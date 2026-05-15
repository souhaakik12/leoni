import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./DormResidentsPage.css";

const STATUS_AU_FOYER = "Au foyer";
const STATUS_QUITTEE = "Quitt\u00e9e";
const statusOptions = [STATUS_AU_FOYER, STATUS_QUITTEE];
const statusStyle = {
  [STATUS_AU_FOYER]: { bg: "#dcfce7", color: "#15803d" },
  Quittee: { bg: "#fee2e2", color: "#dc2626" },
  [STATUS_QUITTEE]: { bg: "#fee2e2", color: "#dc2626" },
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
const ONE_MONTH_DAYS = 30;
const CIN_REGEX = /^\d{8}$/;
const DIGITS_ONLY_REGEX = /^\d+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDayNumber(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.getDate();
}

function isQuitteeStatus(status) {
  return String(status ?? "").toLowerCase().includes("quitt");
}

function normalizeResidentType(type) {
  const normalized = String(type ?? "").trim().toLowerCase();
  if (normalized === "ancienne" || normalized === "anciennes") return "ancienne";
  if (normalized === "nouvelle" || normalized === "nouvelles") return "nouvelle";
  return "";
}

function hasCompletedFirstMonth(entryDate) {
  if (!entryDate) return false;
  const entry = new Date(entryDate);
  if (Number.isNaN(entry.getTime())) return false;
  const now = new Date();
  const diffMs = now.getTime() - entry.getTime();
  return diffMs >= ONE_MONTH_DAYS * 24 * 60 * 60 * 1000;
}

function getMonthStamp(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear() * 12 + date.getMonth();
}

function computeResidentFinance(entryDate, exitDate, type, status) {
  let normalizedType = normalizeResidentType(type);
  const exitDay = getDayNumber(exitDate);
  const entryDay = getDayNumber(entryDate);

  if (!normalizedType) {
    normalizedType = hasCompletedFirstMonth(entryDate) ? "ancienne" : "nouvelle";
  }

  if (isQuitteeStatus(status) && exitDay === null) {
    return { type: normalizedType, cotisation: "", reste: "" };
  }

  if (isQuitteeStatus(status) && exitDay !== null) {
    const exitMonthStamp = getMonthStamp(exitDate);
    const currentMonthStamp = getMonthStamp(new Date());

    // La cotisation de sortie est due uniquement pendant le mois de sortie.
    if (exitMonthStamp === null || currentMonthStamp === null || exitMonthStamp !== currentMonthStamp) {
      return { type: normalizedType, cotisation: 0, reste: 0 };
    }

    const cotisation = exitDay <= 15 ? 30 : 60;
    return { type: normalizedType, cotisation, reste: 0 };
  }

  if (normalizedType === "nouvelle" && hasCompletedFirstMonth(entryDate)) {
    normalizedType = "ancienne";
  }

  if (normalizedType === "ancienne") {
    return { type: "ancienne", cotisation: 60, reste: 0 };
  }

  if (entryDay === null) {
    return { type: "nouvelle", cotisation: "", reste: "" };
  }

  const cotisation = entryDay >= 28 && entryDay <= 31
    ? 60
    : entryDay <= 15
      ? 60
      : 30;
  const reste = entryDay >= 28 && entryDay <= 31
    ? 0
    : cotisation + NEXT_MONTH_COTISATION;

  return {
    type: "nouvelle",
    cotisation,
    reste,
  };
}

function computeCotisation(entryDate, exitDate, type, status) {
  return computeResidentFinance(entryDate, exitDate, type, status).cotisation;
}

function computeReste(entryDate, exitDate, type, status) {
  return computeResidentFinance(entryDate, exitDate, type, status).reste;
}

function computeResidentType(entryDate, type, status) {
  if (isQuitteeStatus(status)) {
    return normalizeResidentType(type) || (hasCompletedFirstMonth(entryDate) ? "ancienne" : "nouvelle");
  }
  return computeResidentFinance(entryDate, "", type, status).type;
}

function getTypeBadge(type, status) {
  if (isQuitteeStatus(status)) {
    return { label: STATUS_QUITTEE, bg: "#fee2e2", color: "#dc2626" };
  }
  if (normalizeResidentType(type) === "nouvelle") {
    return { label: "Nouvelle", bg: "#dbeafe", color: "#1d4ed8" };
  }
  if (normalizeResidentType(type) === "ancienne") {
    return { label: "Ancienne", bg: "#dcfce7", color: "#15803d" };
  }
  return { label: "-", bg: "#e5e7eb", color: "#374151" };
}

function formatStatusLabel(status) {
  return isQuitteeStatus(status) ? STATUS_QUITTEE : STATUS_AU_FOYER;
}

function safeText(value) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text ? text : "-";
}

function formatAge(age) {
  return age !== null && age !== undefined && String(age).trim() !== ""
    ? `${age} ans`
    : "-";
}

function formatDateValue(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR");
}

function toInputDateValue(dateValue) {
  if (!dateValue) return "";
  if (typeof dateValue === "string") {
    const match = dateValue.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyResident() {
  return {
    fullName: "",
    matricule: "",
    age: "",
    phone: "",
    parentPhone: "",
    room: "",
    chambre: "",
    type: "nouvelle",
    status: STATUS_AU_FOYER,
    entryDate: "",
    exitDate: "",
    cin: "",
    email: "",
    cotisation: "",
    reste: "",
  };
}

function validateResidentForm(form) {
  const next = {};

  const fullName = String(form.fullName ?? "").trim();
  const matricule = String(form.matricule ?? "").trim();
  const cin = String(form.cin ?? "").trim();
  const age = String(form.age ?? "").trim();
  const phone = String(form.phone ?? "").trim();
  const parentPhone = String(form.parentPhone ?? "").trim();
  const email = String(form.email ?? "").trim();
  const status = String(form.status ?? "").trim();
  const entryDate = String(form.entryDate ?? "").trim();
  const exitDate = String(form.exitDate ?? "").trim();

  if (!fullName) {
    next.fullName = "Le nom complet est obligatoire";
  }

  if (!matricule) {
    next.matricule = "Le matricule est obligatoire";
  } else if (!DIGITS_ONLY_REGEX.test(matricule)) {
    next.matricule = "Le matricule doit contenir uniquement des chiffres";
  }

  if (!cin || !CIN_REGEX.test(cin)) {
    next.cin = "Le CIN doit contenir exactement 8 chiffres";
  }

  const ageNumber = Number(age);
  if (!/^\d{2}$/.test(age) || !Number.isInteger(ageNumber) || ageNumber < 18 || ageNumber > 99) {
    next.age = "L\u2019\u00e2ge doit \u00eatre compris entre 18 et 99 ans";
  }

  if (phone && !/^[0-9]{1,8}$/.test(phone)) {
    next.phone = "Le téléphone doit contenir uniquement 8 chiffres maximum";
  }

  if (parentPhone && !/^[0-9]{1,8}$/.test(parentPhone)) {
    next.parentPhone = "Le téléphone du parent doit contenir uniquement 8 chiffres maximum";
  }

  if (email && !EMAIL_REGEX.test(email)) {
    next.email = "Email invalide";
  }

  if (!entryDate) {
    next.entryDate = "La date d'entrée est obligatoire";
  }

  if (!status) {
    next.status = "L'état est obligatoire";
  } else if (!(status === STATUS_AU_FOYER || status === STATUS_QUITTEE)) {
    next.status = "L'état doit être 'Au foyer' ou 'Quittée'";
  }

  if (isQuitteeStatus(status) && !exitDate) {
    next.exitDate = "La date de sortie est obligatoire pour une résidente quittée";
  }

  return next;
}

function normalizeDormId(rawDormId) {
  const numeric = Number(rawDormId);
  if (!Number.isNaN(numeric)) return numeric;

  const matchedDigits = String(rawDormId || "").match(/\d+/)?.[0];
  if (!matchedDigits) return rawDormId;
  return Number(matchedDigits);
}

function mapResidentFromApi(r) {
  const rawStatus = r.etat ?? r.status ?? STATUS_AU_FOYER;
  const entryDate = toInputDateValue(r.date_entree ?? r.entryDate ?? "");
  const exitDate = toInputDateValue(r.date_sortie ?? r.exitDate ?? "");
  const normalizedType = normalizeResidentType(r.type) || (hasCompletedFirstMonth(entryDate) ? "ancienne" : "nouvelle");
  return {
    id: r.id,
    fullName: r.nom_complet ?? r.fullName ?? "",
    matricule: r.matricule == null ? "" : String(r.matricule),
    age: r.age ?? "",
    phone: r.telephone ?? r.phone ?? "",
    parentPhone: r.tel_parent ?? r.parentPhone ?? "",
    chambre: r.chambre ?? r.room ?? "",
    room: r.chambre ?? r.room ?? "",
    status: isQuitteeStatus(rawStatus) ? STATUS_QUITTEE : STATUS_AU_FOYER,
    type: normalizedType,
    cotisation: r.cotisation ?? "",
    reste: r.reste ?? "",
    entryDate,
    exitDate,
    cin: r.cin ?? "",
    email: r.email ?? "",
    foyer_id: r.foyer_id ?? r.foyerId ?? "",
  };
}

function normalizeResidentFormData(data) {
  if (!data) return emptyResident();
  const roomValue = data.room ?? data.chambre ?? "";
  return {
    ...emptyResident(),
    ...data,
    room: roomValue,
    chambre: data.chambre ?? roomValue,
    entryDate: toInputDateValue(data.entryDate),
    exitDate: toInputDateValue(data.exitDate),
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
  const isAddMode = !isEdit;
  const [form, setForm] = useState(
    normalizeResidentFormData(initialData)
  );
  const [errors, setErrors] = useState({});
  useEffect(() => {
    const normalized = normalizeResidentFormData(initialData);
    if (isAddMode) {
      setForm({
        ...normalized,
        status: STATUS_AU_FOYER,
        type: "nouvelle",
        exitDate: "",
      });
      return;
    }
    setForm(normalized);
  }, [initialData, isAddMode]);
  const autoCotisation = useMemo(
    () => computeCotisation(form.entryDate, form.exitDate, form.type, form.status),
    [form.entryDate, form.exitDate, form.status, form.type]
  );

  const setField = (key, value) => {
    setForm((prev) => {
      if (key === "room") {
        return { ...prev, room: value, chambre: value };
      }
      if (key === "age") {
        const sanitizedAge = String(value ?? "").replace(/\D/g, "").slice(0, 2);
        return { ...prev, age: sanitizedAge };
      }
      if (key === "status" && isAddMode) {
        return { ...prev, status: STATUS_AU_FOYER, type: "nouvelle", exitDate: "" };
      }
      if (key === "status" && !isQuitteeStatus(value)) {
        return { ...prev, status: value, exitDate: "" };
      }
      if (key === "exitDate" && (isAddMode || !isQuitteeStatus(prev.status))) {
        return { ...prev, exitDate: "" };
      }
      return { ...prev, [key]: value };
    });
    setErrors((prev) => {
      const next = { ...prev };
      if (next[key]) next[key] = "";
      if (next.submit) next.submit = "";
      if (key === "status" && !isQuitteeStatus(value) && next.exitDate) {
        next.exitDate = "";
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validateResidentForm(form);
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    const result = await onSave({
      ...form,
      status: isAddMode ? STATUS_AU_FOYER : form.status,
      type: isAddMode ? "nouvelle" : form.type,
      exitDate: isAddMode ? "" : form.exitDate,
      cotisation: autoCotisation,
    });
    if (result && result.ok === false) {
      setErrors((prev) => ({
        ...prev,
        submit: result.message || "Erreur lors de l'enregistrement.",
      }));
    }
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

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
          {[
            { key: "fullName", label: "Nom complet", type: "text" },
            { key: "matricule", label: "Matricule", type: "text" },
            { key: "age", label: "Age", type: "text" },
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
                disabled={f.key === "exitDate" && (isAddMode || !isQuitteeStatus(form.status))}
                inputMode={f.key === "age" ? "numeric" : undefined}
                maxLength={f.key === "age" ? 2 : undefined}
                style={{
                  ...inputStyle,
                  borderColor: errors[f.key] ? "#dc2626" : "#d1d5db",
                  background: f.key === "exitDate" && (isAddMode || !isQuitteeStatus(form.status)) ? "#f3f4f6" : inputStyle.background,
                  color: f.key === "exitDate" && (isAddMode || !isQuitteeStatus(form.status)) ? "#9ca3af" : "#111827",
                  cursor: f.key === "exitDate" && (isAddMode || !isQuitteeStatus(form.status)) ? "not-allowed" : "text",
                }}
              />
              {errors[f.key] && <p style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{errors[f.key]}</p>}
            </div>
          ))}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
              Etat
            </label>
            <select
              value={isAddMode ? STATUS_AU_FOYER : form.status}
              onChange={(e) => setField("status", e.target.value)}
              disabled={isAddMode}
              style={{
                ...inputStyle,
                background: isAddMode ? "#f3f4f6" : inputStyle.background,
                color: isAddMode ? "#6b7280" : "#111827",
                cursor: isAddMode ? "not-allowed" : "pointer",
              }}
            >
              {(isAddMode ? [STATUS_AU_FOYER] : statusOptions).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.status && <p style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{errors.status}</p>}
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
              Nouvelle: 1-15 = 60/120, 16-27 = 30/90, 28-31 = 60/0. Ancienne: 60/0.
            </p>
          </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid #f3f4f6" }}>
            {errors.submit && (
              <p style={{ width: "100%", margin: 0, marginRight: "auto", fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                {errors.submit}
              </p>
            )}
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
  const [residentFilter, setResidentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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
    setSearchTerm("");

    return () => {
      isMounted = false;
    };
  }, [normalizedDormId]);

  const safeResidents = Array.isArray(residents) ? residents : [];
  const filteredResidents = useMemo(() => {
    return safeResidents.filter((r) => {
      const effectiveType = computeResidentType(r.entryDate, r.type, r.status);
      if (residentFilter === "nouvelle") {
        return effectiveType === "nouvelle" && !isQuitteeStatus(r.status);
      }
      if (residentFilter === "ancienne") {
        return effectiveType === "ancienne" && !isQuitteeStatus(r.status);
      }
      if (residentFilter === "quittee") {
        return isQuitteeStatus(r.status);
      }
      return true;
    });
  }, [safeResidents, residentFilter]);
  const searchedResidents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return filteredResidents;

    return filteredResidents.filter((r) => {
      const fields = [
        r.fullName,
        r.matricule,
        r.cin,
        r.phone,
        r.chambre ?? r.room,
        r.type,
        computeResidentType(r.entryDate, r.type, r.status),
        r.status,
        formatStatusLabel(r.status),
      ];

      return fields.some((fieldValue) =>
        String(fieldValue ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [filteredResidents, searchTerm]);

  const stats = useMemo(() => {
    const total = foyer?.capacite || 0;
    const occupied = safeResidents.filter((r) => !isQuitteeStatus(r.status)).length;
    const available = Math.max(total - occupied, 0);
    const ratio = total > 0 ? (occupied / total) * 100 : 0;
    return {
      total,
      occupied,
      available,
      ratio: ratio.toFixed(1),
    };
  }, [foyer, safeResidents]);

  const startCreate = () => {
    setEditingResident(null);
    setShowForm(true);
  };

  const handleEdit = (resident) => {
    setEditingResident(resident);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const residentToDelete = safeResidents.find((r) => r.id === id);
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
    const entryDate = toInputDateValue(formData.entryDate);
    const resolvedExitDate =
      isQuitteeStatus(formData.status)
        ? toInputDateValue(formData.exitDate) || null
        : null;
    const baseType = editingResident
      ? normalizeResidentType(editingResident.type) || "nouvelle"
      : "nouvelle";
    const finance = computeResidentFinance(
      entryDate,
      resolvedExitDate,
      baseType,
      formData.status
    );
    const editFoyerId = Number(editingResident?.foyer_id);
    const resolvedFoyerId = editingResident && Number.isFinite(editFoyerId) && editFoyerId > 0
      ? editFoyerId
      : Number(normalizedDormId);
    const payload = {
      nom_complet: formData.fullName,
      matricule: String(formData.matricule ?? "").trim(),
      age: formData.age,
      telephone: formData.phone,
      tel_parent: formData.parentPhone,
      chambre: formData.chambre ?? formData.room,
      etat: isQuitteeStatus(formData.status) ? "Quittee" : STATUS_AU_FOYER,
      type: finance.type,
      date_entree: entryDate,
      date_sortie: resolvedExitDate || null,
      cin: formData.cin,
      email: formData.email,
      foyer_id: resolvedFoyerId,
      cotisation: finance.cotisation,
      reste: finance.reste,
    };

    const url = editingResident
      ? `http://localhost:3000/api/resident/${editingResident.id}`
      : "http://localhost:3000/api/resident";
    const method = editingResident ? "PUT" : "POST";

    try {
      console.log("CHECK MATRICULE:", payload.matricule);
      const saveRes = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) {
        let errorMessage = "Erreur lors de l'enregistrement.";
        const contentType = saveRes.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errorData = await saveRes.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } else {
          const errorText = await saveRes.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
        return { ok: false, message: errorMessage };
      }
      const residentsRes = await fetch(`http://localhost:3000/api/resident/${normalizedDormId}`);
      if (!residentsRes.ok) {
        return { ok: false, message: "Enregistrement réussi, mais le rechargement a échoué." };
      }
      const data = await residentsRes.json();
      const rows = Array.isArray(data) ? data : [];
      setResidents(rows.map(mapResidentFromApi));

      setShowForm(false);
      setEditingResident(null);
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, message: "Erreur réseau lors de l'enregistrement." };
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
          <h3>Residentes Actives ({stats.occupied})</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {[
              { key: "all", label: "All" },
              { key: "nouvelle", label: "Nouvelles" },
              { key: "ancienne", label: "Anciennes" },
              { key: "quittee", label: "Quittées" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setResidentFilter(f.key)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: residentFilter === f.key ? "1px solid #2563eb" : "1px solid #d1d5db",
                  background: residentFilter === f.key ? "#eff6ff" : "#fff",
                  color: residentFilter === f.key ? "#1d4ed8" : "#4b5563",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, matricule, CIN, telephone..."
              style={{
                width: "100%",
                maxWidth: 420,
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                fontSize: 13,
                color: "#111827",
                background: "#fff",
                outlineColor: "#2563eb",
              }}
            />
          </div>
        </div>

        <div className="dorm-table-wrap">
          <table className="dorm-table">
            <thead>
              <tr>
                {["NOM COMPLET", "MATRICULE", "AGE", "TELEPHONE", "TEL. PARENT", "CHAMBRE", "TYPE", "ETAT", "COTISATION", "RESTE", "DATE D'ENTREE", "DATE DE SORTIE", "ACTIONS"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {searchedResidents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="dorm-empty-cell">
                    Aucune résidente trouvée.
                  </td>
                </tr>
              ) : (
                searchedResidents.map((r, i) => {
                  const st = isQuitteeStatus(r.status)
                    ? { bg: "#fee2e2", color: "#dc2626" }
                    : statusStyle[r.status] || statusStyle["Au foyer"];
                  const finance = computeResidentFinance(
                    r.entryDate,
                    r.exitDate,
                    r.type,
                    r.status
                  );
                  const typeBadge = getTypeBadge(finance.type, r.status);
                  return (
                    <tr key={r.id} className="dorm-row" style={{ borderBottom: i < searchedResidents.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                      <td className="dorm-name-cell">{safeText(r.fullName)}</td>
                      <td>{safeText(r.matricule)}</td>
                      <td>{formatAge(r.age)}</td>
                      <td className="dorm-phone-cell">{safeText(r.phone)}</td>
                      <td>{safeText(r.parentPhone)}</td>
                      <td className="dorm-room-cell">{safeText(r.chambre ?? r.room)}</td>
                      <td>
                        <span style={{ background: typeBadge.bg, color: typeBadge.color, borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                          {typeBadge.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                          {formatStatusLabel(r.status)}
                        </span>
                      </td>
                      <td className="dorm-money-success">{finance.cotisation === "" ? "-" : `${finance.cotisation} DT`}</td>
                      <td className="dorm-money-alert">{finance.reste === "" ? "-" : `${finance.reste} DT`}</td>
                      <td>{formatDateValue(r.entryDate)}</td>
                      <td>{formatDateValue(r.exitDate)}</td>
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
