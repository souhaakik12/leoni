import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMissions } from "../context/MissionsContext.jsx";

const villes = ["Toutes les villes", "Tunis", "Sfax", "Sousse", "Bizerte", "Kairouan", "Gabès", "Gafsa", "Nabeul"];
const villesForm = ["Tunis", "Sfax", "Sousse", "Bizerte", "Kairouan", "Gabès", "Gafsa", "Nabeul"];
const transports = ["Bus", "Minibus", "Van", "Voiture de service"];
const statuts = ["Planifiée", "En cours", "Terminée"];

const statutConfig = {
  "Terminée":  { bg: "#dcfce7", color: "#16a34a" },
  "En cours":  { bg: "#dbeafe", color: "#2563eb" },
  "Planifiée": { bg: "#f3f4f6", color: "#6b7280" },
};

// ── Reusable input style ──────────────────────────────────────────────────────
const inp = (err) => ({
  width: "100%", padding: "9px 12px", boxSizing: "border-box",
  border: `1px solid ${err ? "#dc2626" : "#d1d5db"}`, borderRadius: 8,
  fontSize: 13, outline: "none", background: "#fff",
});

// ── VIEW MODAL ────────────────────────────────────────────────────────────────
function ViewModal({ mission, onClose, onEdit }) {
  const sc = statutConfig[mission.statut] || { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 520 }}>
        <ModalHeader title={`Détails — ${mission.id}`} onClose={onClose} />
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            {[
              ["ID Mission",    mission.id],
              ["Date",          mission.date],
              ["Ville",         mission.ville],
              ["Transport",     mission.transport],
              ["Objectif",      mission.objectif],
              ["Responsable",   mission.responsable],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Statut</div>
            <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: "4px 14px", fontSize: 13, fontWeight: 700 }}>{mission.statut}</span>
          </div>
          {mission.observations && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Observations</div>
              <div style={{ fontSize: 13, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", lineHeight: 1.6 }}>{mission.observations}</div>
            </div>
          )}
        </div>
        <ModalFooter>
          <BtnSecondary onClick={onClose}>Fermer</BtnSecondary>
          <BtnPrimary onClick={onEdit}>Modifier</BtnPrimary>
        </ModalFooter>
      </div>
    </Overlay>
  );
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────────
function EditModal({ mission, onClose, onSave }) {
  const [form, setForm] = useState({ ...mission });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.date)         e.date        = "Requis";
    if (!form.ville)        e.ville       = "Requis";
    if (!form.responsable)  e.responsable = "Requis";
    if (!form.transport)    e.transport   = "Requis";
    if (!form.objectif)     e.objectif    = "Requis";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave(form);
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 560 }}>
        <ModalHeader title={`Modifier — ${mission.id}`} onClose={onClose} />
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Date" error={errors.date}>
              <input type="date" value={form.date?.split("/").reverse().join("-") || ""} style={inp(errors.date)}
                onChange={e => set("date", e.target.value.split("-").reverse().join("/"))} />
            </Field>
            <Field label="Ville" error={errors.ville}>
              <select value={form.ville} onChange={e => set("ville", e.target.value)} style={inp(errors.ville)}>
                <option value="">-- Sélectionner --</option>
                {villesForm.map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Responsable" error={errors.responsable}>
            <input value={form.responsable} onChange={e => set("responsable", e.target.value)}
              placeholder="Nom du responsable" style={inp(errors.responsable)} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Transport" error={errors.transport}>
              <select value={form.transport} onChange={e => set("transport", e.target.value)} style={inp(errors.transport)}>
                <option value="">-- Sélectionner --</option>
                {transports.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Objectif" error={errors.objectif}>
              <input value={form.objectif} onChange={e => set("objectif", e.target.value)}
                placeholder="ex: 30" style={inp(errors.objectif)} />
            </Field>
          </div>

          <Field label="Statut">
            <select value={form.statut} onChange={e => set("statut", e.target.value)} style={inp(false)}>
              {statuts.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Observations">
            <textarea value={form.observations || ""} onChange={e => set("observations", e.target.value)}
              rows={3} placeholder="Notes ou commentaires..."
              style={{ ...inp(false), resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
          </Field>
        </div>
        <ModalFooter>
          <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
          <BtnPrimary onClick={handleSave}>Enregistrer</BtnPrimary>
        </ModalFooter>
      </div>
    </Overlay>
  );
}

// ── DELETE CONFIRM MODAL ──────────────────────────────────────────────────────
function DeleteModal({ mission, onClose, onConfirm }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 420 }}>
        <div style={{ padding: "28px 28px 0" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Supprimer la mission ?</h3>
          <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
            La mission <strong style={{ color: "#111827" }}>{mission.id}</strong> ({mission.ville} — {mission.date}) sera définitivement supprimée. Cette action est irréversible.
          </p>
        </div>
        <ModalFooter>
          <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
          <button onClick={onConfirm} style={{ padding: "9px 22px", border: "none", borderRadius: 8, background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Supprimer</button>
        </ModalFooter>
      </div>
    </Overlay>
  );
}

// ── SMALL SHARED COMPONENTS ───────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #f3f4f6" }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{title}</h3>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

function ModalFooter({ children }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 28px", borderTop: "1px solid #f3f4f6" }}>
      {children}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{error}</p>}
    </div>
  );
}

function BtnPrimary({ onClick, children }) {
  return <button onClick={onClick} style={{ padding: "9px 22px", border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{children}</button>;
}

function BtnSecondary({ onClick, children }) {
  return <button onClick={onClick} style={{ padding: "9px 22px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{children}</button>;
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function MissionsPage() {
  const navigate = useNavigate();
  const { missions, updateMission, deleteMission } = useMissions();

  const [filtreVille,  setFiltreVille]  = useState("Toutes les villes");
  const [filtreDate,   setFiltreDate]   = useState("");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [search,       setSearch]       = useState("");

  const [viewModal,   setViewModal]   = useState(null);
  const [editModal,   setEditModal]   = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = missions.filter(m => {
    const matchVille  = filtreVille  === "Toutes les villes" || m.ville   === filtreVille;
    const matchStatut = filtreStatut === "Tous"              || m.statut  === filtreStatut;
    const matchDate   = !filtreDate  || m.date.includes(filtreDate);
    const matchSearch = !search      || [m.id, m.ville, m.responsable].some(v => v.toLowerCase().includes(search.toLowerCase()));
    return matchVille && matchStatut && matchDate && matchSearch;
  });

  const handleUpdate = (updated) => {
    updateMission(updated);
    setEditModal(null);
    setViewModal(null);
    showToast(`Mission ${updated.id} mise à jour.`);
  };

  const handleDelete = (mission) => {
    deleteMission(mission.id);
    setDeleteModal(null);
    showToast(`Mission ${mission.id} supprimée.`, "error");
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 2000,
          background: toast.type === "error" ? "#fee2e2" : "#dcfce7",
          border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`,
          color: toast.type === "error" ? "#dc2626" : "#16a34a",
          borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {toast.type === "error"
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Gestion des Missions</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{missions.length} missions au total</p>
        </div>
        <button onClick={() => navigate("/missions/create")} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#2563eb", color: "#fff", border: "none", borderRadius: 8,
          padding: "9px 18px", fontSize: 13, fontWeight: 600,
          boxShadow: "0 2px 8px rgba(37,99,235,0.3)", cursor: "pointer",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvelle Mission
        </button>
      </div>

      {/* Stats pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { label: "Total",      val: missions.length,                               color: "#2563eb", bg: "#eff6ff" },
          { label: "Planifiées", val: missions.filter(m => m.statut==="Planifiée").length, color: "#6b7280", bg: "#f3f4f6" },
          { label: "En cours",   val: missions.filter(m => m.statut==="En cours").length,  color: "#d97706", bg: "#fffbeb" },
          { label: "Terminées",  val: missions.filter(m => m.statut==="Terminée").length,  color: "#16a34a", bg: "#dcfce7" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</span>
            <span style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Search */}
          <div style={{ flex: 2, minWidth: 200, position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher ID, ville, responsable..."
              style={{ width: "100%", padding: "7px 10px 7px 32px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>VILLE</label>
            <select value={filtreVille} onChange={e => setFiltreVille(e.target.value)} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, background: "#fff", outline: "none" }}>
              {villes.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>STATUT</label>
            <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, background: "#fff", outline: "none" }}>
              {["Tous", ...statuts].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>DATE</label>
            <input type="date" value={filtreDate} onChange={e => setFiltreDate(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 13, background: "#fff", outline: "none" }} />
          </div>

          <button onClick={() => { setFiltreVille("Toutes les villes"); setFiltreStatut("Tous"); setFiltreDate(""); setSearch(""); }}
            style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--border)", background: "#f9fafb", color: "#6b7280", fontSize: 12, fontWeight: 500, cursor: "pointer", height: 34 }}>
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--border)" }}>
              {["ID MISSION","DATE","VILLE","RESPONSABLE","TRANSPORT","OBJECTIF","STATUT","ACTIONS"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "50px", textAlign: "center" }}>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display: "block", margin: "0 auto 10px" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Aucune mission trouvée.
                  </div>
                </td>
              </tr>
            ) : filtered.map((m, i) => {
              const sc = statutConfig[m.statut] || { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <td style={{ padding: "13px 16px", fontWeight: 700, fontSize: 13, color: "#111827" }}>{m.id}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#6b7280" }}>{m.date}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{m.ville}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151" }}>{m.responsable}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#6b7280" }}>{m.transport}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#6b7280" }}>{m.objectif}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{m.statut}</span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {/* View */}
                      <ActionBtn title="Voir" color="#2563eb" bg="#eff6ff" onClick={() => setViewModal(m)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </ActionBtn>
                      {/* Edit */}
                      <ActionBtn title="Modifier" color="#d97706" bg="#fffbeb" onClick={() => setEditModal(m)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </ActionBtn>
                      {/* Delete */}
                      <ActionBtn title="Supprimer" color="#dc2626" bg="#fee2e2" onClick={() => setDeleteModal(m)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer count */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", background: "#f9fafb", fontSize: 12, color: "#6b7280" }}>
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
          {filtered.length !== missions.length && ` (sur ${missions.length} au total)`}
        </div>
      </div>

      {/* Modals */}
      {viewModal   && <ViewModal   mission={viewModal}   onClose={() => setViewModal(null)}   onEdit={() => { setEditModal(viewModal); setViewModal(null); }} />}
      {editModal   && <EditModal   mission={editModal}   onClose={() => setEditModal(null)}   onSave={handleUpdate} />}
      {deleteModal && <DeleteModal mission={deleteModal} onClose={() => setDeleteModal(null)} onConfirm={() => handleDelete(deleteModal)} />}
    </div>
  );
}

function ActionBtn({ title, color, bg, onClick, children }) {
  return (
    <button title={title} onClick={onClick}
      style={{ background: bg, border: "none", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      {children}
    </button>
  );
}