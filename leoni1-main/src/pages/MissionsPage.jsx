import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMissions } from "../context/MissionsContext.jsx";
import "./MissionsPage.css";

const PLANIFIED_STATUS = "Planifi\u00e9e";
const IN_PROGRESS_STATUS = "En cours";
const COMPLETED_STATUS = "Termin\u00e9e";

const transports = ["Bus", "Minibus", "Van", "Voiture de service"];
const statuts = [PLANIFIED_STATUS, IN_PROGRESS_STATUS, COMPLETED_STATUS];
const statutConfig = {
  [COMPLETED_STATUS]: { bg: "#def4e9", color: "#1f885c" },
  [IN_PROGRESS_STATUS]: { bg: "#deedf9", color: "#1d6d9e" },
  [PLANIFIED_STATUS]: { bg: "#e8f2fa", color: "#4f6f88" },
};
const defaultStatutStyle = { bg: "#eef2f7", color: "#64748b" };
const ALL_DESTINATIONS = "Toutes les destinations";

const delegationsByGovernorate = {
  Tunis: ["Bab Bhar", "El Menzah", "La Marsa", "Le Bardo"],
  Ariana: ["Ariana Ville", "La Soukra", "Raoued", "Ettadhamen"],
  "Ben Arous": ["Ben Arous", "Hammam Lif", "Mornag", "Ezzahra"],
  Manouba: ["Manouba", "Oued Ellil", "Douar Hicher", "Tebourba"],
  Nabeul: ["Nabeul", "Hammamet", "Kelibia", "Menzel Temime"],
  Sousse: ["Sousse Ville", "Hammam Sousse", "Akouda", "Msaken"],
  Sfax: ["Sfax Ville", "Sakiet Ezzit", "Sakiet Eddaier", "Mahras"],
  Kairouan: ["Kairouan Ville", "Haffouz", "Sbikha", "Bouhajla"],
  Bizerte: ["Bizerte Nord", "Menzel Bourguiba", "Ras Jebel", "Mateur"],
  Gabes: ["Gabes Ville", "Mareth", "Metouia", "Ghannouche"],
};

const inp = (err) => ({
  width: "100%",
  padding: "10px 12px",
  boxSizing: "border-box",
  border: `1px solid ${err ? "#dc2626" : "#d1d5db"}`,
  borderRadius: 12,
  fontSize: 13,
  outline: "none",
  background: "#fff",
});

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (frMatch) return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function toDisplayDate(value) {
  const isoDate = toIsoDate(value);
  if (!isoDate) return normalizeText(value);

  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function splitVille(mission) {
  if (normalizeText(mission?.Gouvernorat) || normalizeText(mission?.Delegation)) {
    return {
      Gouvernorat: normalizeText(mission?.Gouvernorat),
      Delegation: normalizeText(mission?.Delegation),
    };
  }

  const parts = normalizeText(mission?.ville).split(" - ");
  return {
    Gouvernorat: normalizeText(parts[0]),
    Delegation: normalizeText(parts.slice(1).join(" - ")),
  };
}

function buildVille(gouvernorat, delegation) {
  const parts = [normalizeText(gouvernorat), normalizeText(delegation)].filter(Boolean);
  return parts.join(" - ");
}

function responsableName(item) {
  return item?.NomComplet || item?.nomComplet || item?.nom || "";
}

function resolveResponsableNames(responsablesIds, responsables) {
  return responsables
    .filter((item) => responsablesIds.some((id) => String(id) === String(item.Id)))
    .map((item) => responsableName(item))
    .join(", ");
}

function resolveCreatorName(mission) {
  return mission?.CreeParNom || mission?.createdBy || "Non renseigne";
}

function resolveCreatorEmail(mission) {
  return mission?.CreeParEmail || mission?.createdByEmail || "";
}

function resolveMissionLocation(mission) {
  return normalizeText(mission?.ville) || buildVille(mission?.Gouvernorat, mission?.Delegation);
}

function getStatutStyle(status) {
  return statutConfig[status] || defaultStatutStyle;
}

function getPlanningMissions(list) {
  const todayIso = toIsoDate(new Date());
  const sorted = [...list]
    .filter((mission) => toIsoDate(mission.DateMission || mission.date))
    .sort((left, right) => {
      const leftDate = toIsoDate(left.DateMission || left.date);
      const rightDate = toIsoDate(right.DateMission || right.date);
      return leftDate.localeCompare(rightDate);
    });

  const upcoming = sorted.filter((mission) => {
    const missionDate = toIsoDate(mission.DateMission || mission.date);
    return !todayIso || missionDate >= todayIso;
  });

  return (upcoming.length ? upcoming : sorted).slice(0, 7);
}

function ViewModal({ mission, onClose, onEdit }) {
  const statutStyle = getStatutStyle(mission.statut);
  const creatorName = resolveCreatorName(mission);
  const creatorEmail = resolveCreatorEmail(mission);

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 560 }}>
        <ModalHeader title={`Details - ${mission.id}`} onClose={onClose} />
        <div style={{ padding: "26px 30px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            {[
              ["ID Mission", mission.id],
              ["Type mission", mission.TypeMission],
              ["Date", mission.date],
              ["Destination", resolveMissionLocation(mission)],
              ["Responsable", mission.ResponsablesNoms || mission.responsable],
              ["Transport", mission.transport],
              ["Objectif", mission.objectif],
              ["Creee par", creatorName],
              ...(creatorEmail ? [["Email createur", creatorEmail]] : []),
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.45 }}>{value || "-"}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Statut</div>
            <span style={{ background: statutStyle.bg, color: statutStyle.color, borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>{mission.statut}</span>
          </div>

          {mission.observations ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Observations</div>
              <div style={{ fontSize: 13, color: "#334155", background: "#f8fbfd", border: "1px solid #e5edf4", borderRadius: 14, padding: "12px 14px", lineHeight: 1.65 }}>
                {mission.observations}
              </div>
            </div>
          ) : null}
        </div>
        <ModalFooter>
          <BtnSecondary onClick={onClose}>Fermer</BtnSecondary>
          <BtnPrimary onClick={onEdit}>Modifier</BtnPrimary>
        </ModalFooter>
      </div>
    </Overlay>
  );
}

function ResponsablesSelector({ responsables, value, onToggle, error }) {
  return (
    <Field label="Responsables" error={error}>
      <div style={{ border: `1px solid ${error ? "#dc2626" : "#d1d5db"}`, borderRadius: 12, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {responsables.map((item) => (
          <label key={item.Id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "#374151" }}>
            <input type="checkbox" checked={value.some((id) => String(id) === String(item.Id))} onChange={() => onToggle(item.Id)} />
            <span>
              <strong style={{ display: "block", color: "#111827" }}>{responsableName(item)}</strong>
              <span style={{ color: "#6b7280" }}>{item.Email} - {item.Role}</span>
            </span>
          </label>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{value.length} responsable(s) selectionne(s)</div>
    </Field>
  );
}

function EditModal({ mission, responsables, onClose, onSave, saving }) {
  const parsedVille = splitVille(mission);
  const [form, setForm] = useState({
    ...mission,
    TypeMission: normalizeText(mission.TypeMission),
    DateMission: normalizeText(mission.DateMission),
    Gouvernorat: parsedVille.Gouvernorat,
    Delegation: parsedVille.Delegation,
    Transport: normalizeText(mission.Transport || mission.transport),
    Objectif: normalizeText(mission.Objectif || mission.objectif),
    Observations: normalizeText(mission.Observations || mission.observations),
    Statut: normalizeText(mission.Statut || mission.statut) || PLANIFIED_STATUS,
    responsablesIds: Array.isArray(mission.responsablesIds) ? mission.responsablesIds : [],
  });
  const [errors, setErrors] = useState({});

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const toggleResponsable = (responsableId) => {
    setForm((prev) => {
      const hasResponsable = prev.responsablesIds.some((id) => String(id) === String(responsableId));
      const nextIds = hasResponsable
        ? prev.responsablesIds.filter((id) => String(id) !== String(responsableId))
        : [...prev.responsablesIds, responsableId];

      return { ...prev, responsablesIds: nextIds };
    });

    if (errors.responsablesIds) {
      setErrors((prev) => ({ ...prev, responsablesIds: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.TypeMission) nextErrors.TypeMission = "Requis";
    if (!form.DateMission) nextErrors.DateMission = "Requis";
    if (!form.Gouvernorat) nextErrors.Gouvernorat = "Requis";
    if (!form.Delegation) nextErrors.Delegation = "Requis";
    if (!form.Transport) nextErrors.Transport = "Requis";
    if (!form.responsablesIds.length) nextErrors.responsablesIds = "Selectionnez au moins un responsable";

    return nextErrors;
  };

  const handleSave = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const responsable = resolveResponsableNames(form.responsablesIds, responsables);
    onSave({
      ...mission,
      ...form,
      date: toDisplayDate(form.DateMission),
      ville: buildVille(form.Gouvernorat, form.Delegation),
      Transport: form.Transport,
      transport: form.Transport,
      Objectif: form.Objectif,
      objectif: form.Objectif,
      Observations: form.Observations,
      observations: form.Observations,
      Statut: form.Statut,
      statut: form.Statut,
      ResponsablesNoms: responsable,
      responsable,
    });
  };

  const delegationOptions = Array.from(new Set([
    form.Delegation,
    ...(delegationsByGovernorate[form.Gouvernorat] || []),
  ].filter(Boolean)));

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 680 }}>
        <ModalHeader title={`Modifier - ${mission.id}`} onClose={onClose} />
        <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Type mission" error={errors.TypeMission}>
              <input value={form.TypeMission} onChange={(event) => setValue("TypeMission", event.target.value)} placeholder="Ex: Recrutement terrain" style={inp(errors.TypeMission)} />
            </Field>

            <Field label="Date" error={errors.DateMission}>
              <input type="date" value={form.DateMission || ""} style={inp(errors.DateMission)} onChange={(event) => setValue("DateMission", event.target.value)} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Gouvernorat" error={errors.Gouvernorat}>
              <select value={form.Gouvernorat} onChange={(event) => setValue("Gouvernorat", event.target.value)} style={inp(errors.Gouvernorat)}>
                <option value="">-- Selectionner --</option>
                {Object.keys(delegationsByGovernorate).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>

            <Field label="Delegation" error={errors.Delegation}>
              <select value={form.Delegation} onChange={(event) => setValue("Delegation", event.target.value)} style={inp(errors.Delegation)} disabled={!form.Gouvernorat && delegationOptions.length === 0}>
                <option value="">{form.Gouvernorat ? "-- Selectionner --" : "-- Choisir un gouvernorat --"}</option>
                {delegationOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
          </div>

          <ResponsablesSelector responsables={responsables} value={form.responsablesIds} onToggle={toggleResponsable} error={errors.responsablesIds} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Transport" error={errors.Transport}>
              <select value={form.Transport} onChange={(event) => setValue("Transport", event.target.value)} style={inp(errors.Transport)}>
                <option value="">-- Selectionner --</option>
                {transports.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>

            <Field label="Objectif">
              <input value={form.Objectif} onChange={(event) => setValue("Objectif", event.target.value)} placeholder="Ex: 30 recrutements" style={inp(false)} />
            </Field>
          </div>

          <Field label="Statut">
            <select value={form.Statut} onChange={(event) => setValue("Statut", event.target.value)} style={inp(false)}>
              {statuts.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>

          <Field label="Observations">
            <textarea value={form.Observations || ""} onChange={(event) => setValue("Observations", event.target.value)} rows={3} placeholder="Notes ou commentaires..." style={{ ...inp(false), resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
          </Field>
        </div>
        <ModalFooter>
          <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
          <BtnPrimary onClick={handleSave} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</BtnPrimary>
        </ModalFooter>
      </div>
    </Overlay>
  );
}

function DeleteModal({ mission, onClose, onConfirm, saving }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 460 }}>
        <div style={{ padding: "30px 30px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Supprimer la mission ?</h3>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
            La mission <strong style={{ color: "#0f172a" }}>{mission.id}</strong> ({resolveMissionLocation(mission)} - {mission.date}) sera definitivement supprimee.
            Cette action est irreversible.
          </p>
        </div>
        <ModalFooter>
          <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
          <button onClick={onConfirm} disabled={saving} style={{ padding: "10px 22px", border: "none", borderRadius: 12, background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.75 : 1 }}>
            {saving ? "Suppression..." : "Supprimer"}
          </button>
        </ModalFooter>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ background: "#fff", borderRadius: 24, border: "1px solid #e6edf5", boxShadow: "0 30px 70px rgba(15, 23, 42, 0.22)", maxHeight: "90vh", overflowY: "auto", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 30px", borderBottom: "1px solid #edf2f7" }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{title}</h3>
      <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "#f8fbfd", border: "1px solid #e6edf5", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}

function ModalFooter({ children }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "18px 30px", borderTop: "1px solid #edf2f7", background: "#fbfdff" }}>
      {children}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="mission-field">
      <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
      {error ? <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{error}</p> : null}
    </div>
  );
}

function BtnPrimary({ onClick, children, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "10px 22px", border: "none", borderRadius: 12, background: "linear-gradient(135deg, #2f84bc 0%, #3757c7 100%)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: disabled ? 0.75 : 1 }}>
      {children}
    </button>
  );
}

function BtnSecondary({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: "10px 22px", border: "1px solid #dbe4ec", borderRadius: 12, background: "#f8fbfd", color: "#334155", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
      {children}
    </button>
  );
}

export default function MissionsPage() {
  const navigate = useNavigate();
  const {
    missions,
    responsables,
    loadingMissions,
    missionsError,
    updateMission,
    deleteMission,
  } = useMissions();

  const [filtreVille, setFiltreVille] = useState(ALL_DESTINATIONS);
  const [filtreDate, setFiltreDate] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [search, setSearch] = useState("");

  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [savingMissionId, setSavingMissionId] = useState(null);
  const [deletingMissionId, setDeletingMissionId] = useState(null);

  const destinations = [
    ALL_DESTINATIONS,
    ...Array.from(
      new Set(
        missions
          .map((mission) => normalizeText(mission.Gouvernorat) || resolveMissionLocation(mission))
          .filter(Boolean)
      )
    ),
  ];

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = missions.filter((mission) => {
    const missionLocation = resolveMissionLocation(mission);
    const missionGovernorate = normalizeText(mission.Gouvernorat);
    const missionResponsables = mission.ResponsablesNoms || mission.responsable;

    const matchVille = filtreVille === ALL_DESTINATIONS
      || missionGovernorate === filtreVille
      || missionLocation === filtreVille;
    const matchStatut = filtreStatut === "Tous" || mission.statut === filtreStatut;
    const matchDate = !filtreDate || normalizeText(mission.DateMission).startsWith(filtreDate);
    const searchNeedle = search.toLowerCase();
    const searchableValues = [
      mission.id,
      mission.CodeMission,
      mission.TypeMission,
      missionLocation,
      missionGovernorate,
      missionResponsables,
      mission.transport,
      mission.objectif,
      resolveCreatorName(mission),
    ].map((value) => normalizeText(value).toLowerCase());

    const matchSearch = !searchNeedle || searchableValues.some((value) => value.includes(searchNeedle));
    return matchVille && matchStatut && matchDate && matchSearch;
  });

  const planningMissions = getPlanningMissions(filtered);
  const stats = [
    {
      label: "Total missions",
      value: missions.length,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8" />
          <path d="M8 13h8" />
        </svg>
      ),
    },
    {
      label: "Planifiees",
      value: missions.filter((mission) => mission.statut === PLANIFIED_STATUS).length,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
        </svg>
      ),
    },
    {
      label: "En cours",
      value: missions.filter((mission) => mission.statut === IN_PROGRESS_STATUS).length,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 12h16" />
          <path d="M12 4l8 8-8 8" />
        </svg>
      ),
    },
    {
      label: "Terminees",
      value: missions.filter((mission) => mission.statut === COMPLETED_STATUS).length,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
  ];

  const handleUpdate = async (updatedMission) => {
    setSavingMissionId(updatedMission.Id);

    try {
      const mission = await updateMission(updatedMission);
      setEditModal(null);
      setViewModal(null);
      showToast(`Mission ${mission.id} mise a jour.`);
    } catch (error) {
      showToast(error?.message || "Mise a jour impossible.", "error");
    } finally {
      setSavingMissionId(null);
    }
  };

  const handleDelete = async (mission) => {
    setDeletingMissionId(mission.Id);

    try {
      await deleteMission(mission.Id);
      setDeleteModal(null);
      showToast(`Mission ${mission.id} supprimee.`, "error");
    } catch (error) {
      showToast(error?.message || "Suppression impossible.", "error");
    } finally {
      setDeletingMissionId(null);
    }
  };

  return (
    <div className="missions-page">
      {toast ? (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 2000, background: toast.type === "error" ? "#fee2e2" : "#dcfce7", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#dc2626" : "#16a34a", borderRadius: 14, padding: "12px 18px", fontSize: 13, fontWeight: 700, boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.type === "error"
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>}
          {toast.msg}
        </div>
      ) : null}

      <section className="missions-header">
        <div className="missions-header__copy">
          <p className="missions-header__eyebrow">Pilotage terrain</p>
          <h2>Gestion des Missions</h2>
          <p className="missions-header__subtitle">Planifiez, suivez et mettez a jour vos missions terrain depuis une vue claire et moderne.</p>
        </div>

        <button type="button" className="missions-header__action" onClick={() => navigate("/missions/create")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle Mission
        </button>
      </section>

      {missionsError ? (
        <div className="missions-error-banner">
          {missionsError}
        </div>
      ) : null}

      <section className="missions-stats">
        {stats.map((stat) => (
          <article key={stat.label} className="missions-stat-card">
            <div className="missions-stat-card__icon">{stat.icon}</div>
            <div>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="missions-filters-panel">
        <div className="missions-filters__head">
          <div>
            <h3>Filtres</h3>
            <p>Recherchez rapidement une mission par destination, statut, date ou responsable.</p>
          </div>
          <button
            type="button"
            className="missions-reset-btn"
            onClick={() => {
              setFiltreVille(ALL_DESTINATIONS);
              setFiltreStatut("Tous");
              setFiltreDate("");
              setSearch("");
            }}
          >
            Reinitialiser
          </button>
        </div>

        <div className="missions-filters-grid">
          <label className="missions-filter">
            <span>Recherche</span>
            <div className="missions-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID, type mission, destination, responsable..." />
            </div>
          </label>

          <label className="missions-filter">
            <span>Ville / Gouvernorat</span>
            <select value={filtreVille} onChange={(event) => setFiltreVille(event.target.value)}>
              {destinations.map((destination) => <option key={destination}>{destination}</option>)}
            </select>
          </label>

          <label className="missions-filter">
            <span>Statut</span>
            <select value={filtreStatut} onChange={(event) => setFiltreStatut(event.target.value)}>
              {["Tous", ...statuts].map((statut) => <option key={statut}>{statut}</option>)}
            </select>
          </label>

          <label className="missions-filter">
            <span>Date</span>
            <input type="date" value={filtreDate} onChange={(event) => setFiltreDate(event.target.value)} />
          </label>
        </div>
      </section>

      <div className="missions-layout">
        <section className="missions-main-column">
          <div className="missions-section-card">
            <div className="missions-section-head">
              <div>
                <h3>Liste des missions</h3>
                <p>{filtered.length} mission(s) affichee(s){filtered.length !== missions.length ? ` sur ${missions.length}` : ""}</p>
              </div>
            </div>

            {loadingMissions ? (
              <div className="missions-empty-card">Chargement des missions...</div>
            ) : filtered.length === 0 ? (
              <div className="missions-empty-card">Aucune mission trouvee avec les filtres actuels.</div>
            ) : (
              <div className="missions-cards">
                {filtered.map((mission) => {
                  const location = resolveMissionLocation(mission) || "Destination non renseignee";
                  const statusStyle = getStatutStyle(mission.statut);
                  const responsablesLabel = mission.ResponsablesNoms || mission.responsable || "Non renseigne";
                  const creatorName = resolveCreatorName(mission);

                  return (
                    <article key={mission.Id || mission.id} className="mission-card">
                      <div className="mission-card__header">
                        <div>
                          <p className="mission-card__eyebrow">{mission.TypeMission || "Mission terrain"}</p>
                          <h3>{mission.id}</h3>
                        </div>
                        <span className="mission-status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {mission.statut || PLANIFIED_STATUS}
                        </span>
                      </div>

                      <div className="mission-card__meta">
                        <span>{toDisplayDate(mission.DateMission || mission.date)}</span>
                        <span>{creatorName}</span>
                      </div>

                      <div className="mission-card__destination">
                        <div className="mission-card__map-pin">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 21s-6-5.33-6-11a6 6 0 1 1 12 0c0 5.67-6 11-6 11z" />
                            <circle cx="12" cy="10" r="2.2" />
                          </svg>
                        </div>
                        <div className="mission-card__destination-copy">
                          <p>Destination</p>
                          <strong>{location}</strong>
                        </div>
                        <div className="mission-card__map-visual" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>

                      <div className="mission-card__grid">
                        <div className="mission-card__item">
                          <span>Responsables</span>
                          <strong>{responsablesLabel}</strong>
                        </div>
                        <div className="mission-card__item">
                          <span>Transport</span>
                          <strong>{mission.transport || "Non renseigne"}</strong>
                        </div>
                        <div className="mission-card__item">
                          <span>Objectif</span>
                          <strong>{mission.objectif || "Non renseigne"}</strong>
                        </div>
                        <div className="mission-card__item">
                          <span>Creee par</span>
                          <strong>{creatorName}</strong>
                        </div>
                      </div>

                      {mission.observations ? (
                        <div className="mission-card__note">
                          <span>Observations</span>
                          <p>{mission.observations}</p>
                        </div>
                      ) : null}

                      <div className="mission-card__actions">
                        <ActionBtn title="Voir details" label="Voir details" color="#2563eb" bg="#eff6ff" onClick={() => setViewModal(mission)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        </ActionBtn>
                        <ActionBtn title="Modifier" label="Modifier" color="#d97706" bg="#fffbeb" onClick={() => setEditModal(mission)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </ActionBtn>
                        <ActionBtn title="Supprimer" label="Supprimer" color="#dc2626" bg="#fee2e2" onClick={() => setDeleteModal(mission)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                        </ActionBtn>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="missions-sidebar">
          <section className="missions-section-card planning-panel">
            <div className="missions-section-head">
              <div>
                <h3>Planning des missions</h3>
                <p>Prochaines missions triees par date.</p>
              </div>
            </div>

            {loadingMissions ? (
              <div className="planning-empty">Chargement du planning...</div>
            ) : planningMissions.length === 0 ? (
              <div className="planning-empty">Aucune mission a afficher dans le planning.</div>
            ) : (
              <div className="planning-list">
                {planningMissions.map((mission) => {
                  const planningStatus = getStatutStyle(mission.statut);
                  return (
                    <div key={`planning-${mission.Id || mission.id}`} className="planning-item">
                      <div className="planning-item__date">
                        <span>{toDisplayDate(mission.DateMission || mission.date)}</span>
                      </div>
                      <div className="planning-item__body">
                        <strong>{resolveMissionLocation(mission) || "Destination non renseignee"}</strong>
                        <p>{mission.ResponsablesNoms || mission.responsable || "Responsable non renseigne"}</p>
                      </div>
                      <span className="planning-item__status" style={{ background: planningStatus.bg, color: planningStatus.color }}>
                        {mission.statut}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>

      {viewModal ? <ViewModal mission={viewModal} onClose={() => setViewModal(null)} onEdit={() => { setEditModal(viewModal); setViewModal(null); }} /> : null}
      {editModal ? <EditModal mission={editModal} responsables={responsables} onClose={() => setEditModal(null)} onSave={handleUpdate} saving={savingMissionId === editModal.Id} /> : null}
      {deleteModal ? <DeleteModal mission={deleteModal} onClose={() => setDeleteModal(null)} onConfirm={() => handleDelete(deleteModal)} saving={deletingMissionId === deleteModal.Id} /> : null}
    </div>
  );
}

function ActionBtn({ title, label = "", color, bg, onClick, children }) {
  const iconOnly = !label;

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        background: bg,
        border: "1px solid rgba(148, 163, 184, 0.2)",
        borderRadius: 12,
        minWidth: iconOnly ? 38 : "auto",
        height: 38,
        padding: iconOnly ? "0 11px" : "0 14px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: "pointer",
        color,
        fontSize: 12,
        fontWeight: 700,
      }}
      onMouseEnter={(event) => { event.currentTarget.style.opacity = "0.78"; }}
      onMouseLeave={(event) => { event.currentTarget.style.opacity = "1"; }}
    >
      {children}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
