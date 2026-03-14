import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMissions } from "../context/MissionsContext.jsx";

const responsables = [
  { id: 1, nom: "Ahmed Benjelloun", ville: "Tunis" },
  { id: 2, nom: "Sara El Amrani", ville: "Sfax" },
  { id: 3, nom: "Mohamed Alaoui", ville: "Sousse" },
  { id: 4, nom: "Fatima Rachidi", ville: "Bizerte" },
  { id: 5, nom: "Youssef Bennis", ville: "Kairouan" },
];

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

const governorates = Object.keys(delegationsByGovernorate);
const transportOptions = ["Bus", "Minibus", "Van", "Voiture de service"];
const monthLabels = ["Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"];
const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const card = { background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 14 };
const input = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff" };
const label = { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" };

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toLabel(key) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

function monthCells(year, month) {
  const start = (new Date(year, month, 1).getDay() + 6) % 7;
  const size = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < start; i += 1) cells.push(null);
  for (let i = 1; i <= size; i += 1) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function defaultPlan(dateKey) {
  return {
    dateKey,
    governorate: "",
    delegation: "",
    responsableIds: [],
    transport: "Bus",
    objectif: "",
    observations: "",
  };
}

function isComplete(plan) {
  return !!plan?.governorate && !!plan?.delegation && Array.isArray(plan?.responsableIds) && plan.responsableIds.length > 0;
}

function locationLabel(plan) {
  if (!plan) return "";
  if (plan.governorate && plan.delegation) return `${plan.governorate} - ${plan.delegation}`;
  return plan.delegation || plan.governorate || "";
}

function respNames(ids) {
  if (!Array.isArray(ids)) return [];
  return responsables.filter((r) => ids.some((id) => String(id) === String(r.id))).map((r) => r.nom);
}

function respSummary(ids) {
  const names = respNames(ids);
  if (!names.length) return "Responsable non defini";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function StepBullet({ active, done, n, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: active ? "#2563eb" : done ? "#16a34a" : "#e5e7eb", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {done ? "OK" : n}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: active ? "#2563eb" : done ? "#16a34a" : "#6b7280" }}>{text}</span>
    </div>
  );
}

function ResponsablesPicker({ value, onToggle, error }) {
  return (
    <div>
      <label style={label}>Responsables * (selection multiple)</label>
      <div style={{ border: `1px solid ${error ? "#dc2626" : "#d1d5db"}`, borderRadius: 8, padding: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {responsables.map((r) => (
          <label key={r.id} style={{ fontSize: 12, color: "#374151", display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={value.some((id) => String(id) === String(r.id))} onChange={() => onToggle(r.id)} />
            <span>{r.nom} ({r.ville})</span>
          </label>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{value.length} responsable(s) selectionne(s)</div>
      {error && <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{error}</div>}
    </div>
  );
}

export default function CreateMissionPage() {
  const navigate = useNavigate();
  const { addMission } = useMissions();

  const now = new Date();
  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());

  const [step, setStep] = useState("dates");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [plans, setPlans] = useState({});
  const [errors, setErrors] = useState({});
  const [activeDate, setActiveDate] = useState("");
  const [saving, setSaving] = useState(false);

  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const sortedDates = useMemo(() => [...selectedDates].sort(), [selectedDates]);

  const setPlan = (dateKey, patch) => {
    setPlans((prev) => ({ ...prev, [dateKey]: { ...(prev[dateKey] || defaultPlan(dateKey)), ...patch } }));
    Object.keys(patch).forEach((k) => {
      const ek = `${dateKey}:${k}`;
      if (errors[ek]) setErrors((prev) => ({ ...prev, [ek]: "" }));
    });
  };

  const setGovernorate = (dateKey, value) => setPlan(dateKey, { governorate: value, delegation: "" });

  const toggleResp = (dateKey, respId) => {
    setPlans((prev) => {
      const p = prev[dateKey] || defaultPlan(dateKey);
      const has = p.responsableIds.some((id) => String(id) === String(respId));
      const ids = has ? p.responsableIds.filter((id) => String(id) !== String(respId)) : [...p.responsableIds, respId];
      return { ...prev, [dateKey]: { ...p, responsableIds: ids } };
    });
    const ek = `${dateKey}:responsableIds`;
    if (errors[ek]) setErrors((prev) => ({ ...prev, [ek]: "" }));
  };

  const validate = () => {
    const next = {};
    sortedDates.forEach((d) => {
      const p = plans[d] || {};
      if (!p.governorate) next[`${d}:governorate`] = "Gouvernorat requis";
      if (!p.delegation) next[`${d}:delegation`] = "Delegation requise";
      if (!p.responsableIds?.length) next[`${d}:responsableIds`] = "Au moins un responsable requis";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goToDetails = () => {
    if (!sortedDates.length) return;
    setPlans((prev) => {
      const next = { ...prev };
      sortedDates.forEach((d) => { if (!next[d]) next[d] = defaultPlan(d); });
      Object.keys(next).forEach((k) => { if (!selectedDates.has(k)) delete next[k]; });
      return next;
    });
    setStep("details");
  };

  const goToPlanning = () => {
    if (!validate()) return;
    setActiveDate(sortedDates[0] || "");
    setStep("planning");
  };

  const save = () => {
    if (!validate()) {
      setStep("details");
      return;
    }
    setSaving(true);
    sortedDates.forEach((d) => {
      const p = plans[d];
      addMission({
        date: d,
        ville: locationLabel(p),
        responsable: respNames(p.responsableIds).join(", "),
        transport: p.transport,
        objectif: p.objectif,
        observations: p.observations,
        statut: "Planifiée",
      });
    });
    setTimeout(() => navigate("/missions"), 700);
  };

  const activePlan = activeDate ? plans[activeDate] : null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate("/missions")} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff" }}>{"<"}</button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Planification des Missions</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Selection des dates, choix gouvernorat/delegation, selection de plusieurs responsables, puis edition du planning.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <StepBullet n={1} text="Dates" active={step === "dates"} done={["details", "planning"].includes(step)} />
        <StepBullet n={2} text="Affectation" active={step === "details"} done={step === "planning"} />
        <StepBullet n={3} text="Planning" active={step === "planning"} done={false} />
      </div>

      {(step === "dates" || step === "planning") && (
        <div style={{ ...card, marginBottom: 14, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", padding: "12px 14px" }}>
            <button onClick={() => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }} style={{ ...input, width: 40, padding: 6 }}>{"<"}</button>
            <div style={{ fontWeight: 800, color: "#111827" }}>{monthLabels[month]} {year}</div>
            <button onClick={() => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }} style={{ ...input, width: 40, padding: 6 }}>{">"}</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
            {dayLabels.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#6b7280", padding: 8 }}>{d}</div>)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: 8 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} style={{ minHeight: 90 }} />;
              const key = toKey(year, month, d);
              const past = key < todayKey;
              const selected = selectedDates.has(key);
              const p = plans[key];
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (past) return;
                    if (step === "dates") {
                      setSelectedDates((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      });
                    } else if (plans[key]) setActiveDate(key);
                  }}
                  style={{ minHeight: 90, margin: 2, borderRadius: 10, border: selected ? "1px solid #bfdbfe" : "1px solid #f3f4f6", background: selected ? "#eff6ff" : "#fff", padding: 6, textAlign: "left", opacity: past ? 0.45 : 1 }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>{d}</div>
                  {!!p && (
                    <div style={{ marginTop: 4, border: `1px solid ${isComplete(p) ? "#86efac" : "#fed7aa"}`, background: isComplete(p) ? "#dcfce7" : "#fff7ed", borderRadius: 6, padding: "3px 5px", fontSize: 10 }}>
                      <div style={{ fontWeight: 700 }}>{locationLabel(p) || "Lieu non defini"}</div>
                      <div>{respSummary(p.responsableIds)}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === "dates" && (
        <>
          {!!sortedDates.length && (
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>Dates selectionnees</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sortedDates.map((d) => <span key={d} style={{ border: "1px solid #bfdbfe", color: "#1d4ed8", background: "#eff6ff", borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{toLabel(d)}</span>)}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => navigate("/missions")} style={{ ...input, width: "auto", background: "#f9fafb" }}>Annuler</button>
            <button onClick={goToDetails} disabled={!sortedDates.length} style={{ ...input, width: "auto", border: "none", background: sortedDates.length ? "#2563eb" : "#d1d5db", color: "#fff", fontWeight: 700 }}>Continuer</button>
          </div>
        </>
      )}

      {step === "details" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            {sortedDates.map((d) => {
              const p = plans[d] || defaultPlan(d);
              return (
                <div key={d} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{toLabel(d)}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{isComplete(p) ? "Complet" : "A completer"}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={label}>Gouvernorat *</label>
                      <select value={p.governorate} onChange={(e) => setGovernorate(d, e.target.value)} style={{ ...input, borderColor: errors[`${d}:governorate`] ? "#dc2626" : "#d1d5db" }}>
                        <option value="">-- Choisir --</option>
                        {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {errors[`${d}:governorate`] && <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{errors[`${d}:governorate`]}</div>}
                    </div>

                    <div>
                      <label style={label}>Delegation *</label>
                      <select value={p.delegation} onChange={(e) => setPlan(d, { delegation: e.target.value })} disabled={!p.governorate} style={{ ...input, borderColor: errors[`${d}:delegation`] ? "#dc2626" : "#d1d5db" }}>
                        <option value="">{p.governorate ? "-- Choisir --" : "-- Choisir un gouvernorat --"}</option>
                        {(delegationsByGovernorate[p.governorate] || []).map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      {errors[`${d}:delegation`] && <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{errors[`${d}:delegation`]}</div>}
                    </div>

                    <div>
                      <label style={label}>Transport</label>
                      <select value={p.transport} onChange={(e) => setPlan(d, { transport: e.target.value })} style={input}>
                        {transportOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={label}>Objectif</label>
                      <input value={p.objectif} onChange={(e) => setPlan(d, { objectif: e.target.value })} style={input} placeholder="Ex: 30" />
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <ResponsablesPicker value={p.responsableIds} onToggle={(id) => toggleResp(d, id)} error={errors[`${d}:responsableIds`]} />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label style={label}>Observations</label>
                    <textarea rows={2} value={p.observations} onChange={(e) => setPlan(d, { observations: e.target.value })} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button onClick={() => setStep("dates")} style={{ ...input, width: "auto", background: "#f9fafb" }}>Retour</button>
            <button onClick={goToPlanning} style={{ ...input, width: "auto", border: "none", background: "#2563eb", color: "#fff", fontWeight: 700 }}>Voir planning</button>
          </div>
        </>
      )}

      {step === "planning" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14, marginBottom: 14 }}>
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Missions planifiees</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                {sortedDates.map((d) => {
                  const p = plans[d];
                  return (
                    <button key={d} onClick={() => setActiveDate(d)} style={{ textAlign: "left", borderRadius: 8, border: `1px solid ${activeDate === d ? "#93c5fd" : "#e5e7eb"}`, background: activeDate === d ? "#eff6ff" : "#f9fafb", padding: "9px 10px" }}>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>{toLabel(d)}</div>
                      <div style={{ fontSize: 12 }}>{locationLabel(p) || "Lieu non defini"}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{respSummary(p?.responsableIds)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Modifier {activeDate ? `(${toLabel(activeDate)})` : ""}</div>
              {!activePlan ? (
                <div style={{ fontSize: 13, color: "#9ca3af" }}>Cliquez sur une mission planifiee.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div>
                    <label style={label}>Gouvernorat *</label>
                    <select value={activePlan.governorate} onChange={(e) => setGovernorate(activeDate, e.target.value)} style={input}>
                      <option value="">-- Choisir --</option>
                      {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={label}>Delegation *</label>
                    <select value={activePlan.delegation} onChange={(e) => setPlan(activeDate, { delegation: e.target.value })} disabled={!activePlan.governorate} style={input}>
                      <option value="">{activePlan.governorate ? "-- Choisir --" : "-- Choisir un gouvernorat --"}</option>
                      {(delegationsByGovernorate[activePlan.governorate] || []).map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>

                  <ResponsablesPicker value={activePlan.responsableIds} onToggle={(id) => toggleResp(activeDate, id)} error="" />

                  <div>
                    <label style={label}>Transport</label>
                    <select value={activePlan.transport} onChange={(e) => setPlan(activeDate, { transport: e.target.value })} style={input}>
                      {transportOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={label}>Objectif</label>
                    <input value={activePlan.objectif} onChange={(e) => setPlan(activeDate, { objectif: e.target.value })} style={input} />
                  </div>

                  <div>
                    <label style={label}>Observations</label>
                    <textarea rows={3} value={activePlan.observations} onChange={(e) => setPlan(activeDate, { observations: e.target.value })} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button onClick={() => setStep("details")} disabled={saving} style={{ ...input, width: "auto", background: "#f9fafb" }}>Retour</button>
            <button onClick={save} disabled={saving} style={{ ...input, width: "auto", border: "none", background: saving ? "#93c5fd" : "#2563eb", color: "#fff", fontWeight: 700 }}>
              {saving ? "Enregistrement..." : "Enregistrer le planning"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
