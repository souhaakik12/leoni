import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useMissions } from "../context/MissionsContext.jsx";
import { gouvernorats, delegationsParGouvernorat } from "../data/gouvernoratsDelegations";
import { buildRoleHeaders } from "../utils/roles.js";
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
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

function isPastDateKey(dateKey, todayKey) {
  return Boolean(dateKey) && dateKey < todayKey;
}

function monthCells(year, month) {
  const start = (new Date(year, month, 1).getDay() + 6) % 7;
  const size = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < start; index += 1) cells.push(null);
  for (let day = 1; day <= size; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function defaultPlan(dateKey) {
  return {
    dateKey,
    typeMission: "",
    governorate: "",
    delegation: "",
    responsableIds: [],
    transport: "Bus",
    objectif: "",
    observations: "",
  };
}

function isComplete(plan) {
  return (
    !!plan?.typeMission
    && !!plan?.governorate
    && !!plan?.delegation
    && Array.isArray(plan?.responsableIds)
    && plan.responsableIds.length > 0
  );
}

function locationLabel(plan) {
  if (!plan) return "";
  if (plan.governorate && plan.delegation) return `${plan.governorate} - ${plan.delegation}`;
  return plan.delegation || plan.governorate || "";
}

function responsableName(item) {
  return item?.NomComplet || item?.nomComplet || item?.nom || "";
}

function respNames(ids, responsables) {
  if (!Array.isArray(ids)) return [];
  return responsables
    .filter((item) => ids.some((id) => String(id) === String(item.Id)))
    .map((item) => responsableName(item));
}

function respSummary(ids, responsables) {
  const names = respNames(ids, responsables);
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

function ResponsablesPicker({ responsables, value, onToggle, error, loading, requestError, availabilityLoading, busyMap = {} }) {
  return (
    <div>
      <label style={label}>Responsables * (selection multiple)</label>
      <div style={{ border: `1px solid ${error ? "#dc2626" : "#d1d5db"}`, borderRadius: 8, padding: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {loading ? (
          <div style={{ fontSize: 12, color: "#6b7280", gridColumn: "1 / -1" }}>Chargement des responsables...</div>
        ) : responsables.length === 0 ? (
          <div style={{ fontSize: 12, color: requestError ? "#dc2626" : "#6b7280", gridColumn: "1 / -1" }}>
            {requestError || "Aucun responsable actif disponible."}
          </div>
        ) : responsables.map((item) => {
          const isSelected = value.some((id) => String(id) === String(item.Id));
          const busyInfo = busyMap[String(item.Id)];
          const isBusy = Boolean(busyInfo);

          return (
            <label key={item.Id} style={{ fontSize: 12, color: isBusy ? "#9ca3af" : "#374151", display: "flex", gap: 8, alignItems: "flex-start", opacity: isBusy && !isSelected ? 0.68 : 1 }}>
              <input type="checkbox" checked={isSelected} disabled={isBusy && !isSelected} onChange={() => onToggle(item.Id)} />
              <span>
                <strong style={{ display: "block", color: "#111827" }}>{responsableName(item)}</strong>
                <span style={{ color: "#6b7280" }}>{item.Email} - {item.Role}</span>
                {isBusy ? (
                  <span style={{ display: "block", marginTop: 3, color: "#dc2626", fontSize: 10, fontWeight: 700 }}>
                    Deja en mission ce jour{busyInfo?.busyMission ? ` (${busyInfo.busyMission})` : ""}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{value.length} responsable(s) selectionne(s)</div>
      {availabilityLoading ? <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Verification de disponibilite...</div> : null}
      {error && <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{error}</div>}
    </div>
  );
}

export default function CreateMissionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addMission, responsables, loadingResponsables, responsablesError } = useMissions();

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
  const [submitError, setSubmitError] = useState("");
  const [busyResponsablesByDate, setBusyResponsablesByDate] = useState({});
  const [loadingBusyByDate, setLoadingBusyByDate] = useState({});

  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const sortedDates = useMemo(() => [...selectedDates].sort(), [selectedDates]);

  useEffect(() => {
    let isCancelled = false;

    if (!sortedDates.length) {
      setBusyResponsablesByDate({});
      setLoadingBusyByDate({});
      return () => {
        isCancelled = true;
      };
    }

    sortedDates.forEach((dateKey) => {
      setLoadingBusyByDate((prev) => ({ ...prev, [dateKey]: true }));

      fetch(`http://localhost:3000/api/missions/responsables?date=${encodeURIComponent(dateKey)}`, {
        headers: buildRoleHeaders(user),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok || data?.success === false) {
            throw new Error(data?.message || "Impossible de verifier la disponibilite des responsables.");
          }

          const nextBusyMap = {};
          (Array.isArray(data?.responsables) ? data.responsables : []).forEach((item) => {
            if (item?.busy) {
              nextBusyMap[String(item.Id)] = item;
            }
          });

          if (!isCancelled) {
            setBusyResponsablesByDate((prev) => ({ ...prev, [dateKey]: nextBusyMap }));
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setBusyResponsablesByDate((prev) => ({ ...prev, [dateKey]: {} }));
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setLoadingBusyByDate((prev) => ({ ...prev, [dateKey]: false }));
          }
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [sortedDates, user]);

  const setPlan = (dateKey, patch) => {
    setPlans((prev) => ({ ...prev, [dateKey]: { ...(prev[dateKey] || defaultPlan(dateKey)), ...patch } }));
    Object.keys(patch).forEach((key) => {
      const errorKey = `${dateKey}:${key}`;
      if (errors[errorKey]) {
        setErrors((prev) => ({ ...prev, [errorKey]: "" }));
      }
    });
  };

  const setGovernorate = (dateKey, value) => setPlan(dateKey, { governorate: value, delegation: "" });

  const toggleResp = (dateKey, respId) => {
    setPlans((prev) => {
      const currentPlan = prev[dateKey] || defaultPlan(dateKey);
      const hasResponsable = currentPlan.responsableIds.some((id) => String(id) === String(respId));
      const ids = hasResponsable
        ? currentPlan.responsableIds.filter((id) => String(id) !== String(respId))
        : [...currentPlan.responsableIds, respId];

      return { ...prev, [dateKey]: { ...currentPlan, responsableIds: ids } };
    });

    const errorKey = `${dateKey}:responsableIds`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    sortedDates.forEach((dateKey) => {
      const plan = plans[dateKey] || {};
      if (!plan.typeMission) nextErrors[`${dateKey}:typeMission`] = "Type mission requis";
      if (!plan.governorate) nextErrors[`${dateKey}:governorate`] = "Gouvernorat requis";
      if (!plan.delegation) nextErrors[`${dateKey}:delegation`] = "Delegation requise";
      if (!plan.responsableIds?.length) nextErrors[`${dateKey}:responsableIds`] = "Au moins un responsable requis";
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToDetails = () => {
    if (!sortedDates.length) return;
    if (sortedDates.some((dateKey) => isPastDateKey(dateKey, todayKey))) {
      setSubmitError("Impossible de creer une mission avec une date passee.");
      return;
    }

    setPlans((prev) => {
      const next = { ...prev };
      sortedDates.forEach((dateKey) => {
        if (!next[dateKey]) next[dateKey] = defaultPlan(dateKey);
      });
      Object.keys(next).forEach((key) => {
        if (!selectedDates.has(key)) delete next[key];
      });
      return next;
    });

    setStep("details");
  };

  const goToPlanning = () => {
    if (!validate()) return;
    setActiveDate(sortedDates[0] || "");
    setStep("planning");
  };

  const save = async () => {
    if (!validate()) {
      setStep("details");
      return;
    }
    if (sortedDates.some((dateKey) => isPastDateKey(dateKey, todayKey))) {
      setSubmitError("Impossible de creer une mission avec une date passee.");
      setStep("dates");
      return;
    }

    setSaving(true);
    setSubmitError("");

    try {
      for (const dateKey of sortedDates) {
        const plan = plans[dateKey];
        await addMission({
          TypeMission: plan.typeMission,
          DateMission: dateKey,
          Gouvernorat: plan.governorate,
          Delegation: plan.delegation,
          Transport: plan.transport,
          Objectif: plan.objectif,
          Observations: plan.observations,
          CreePar: user?.Id ?? user?.id ?? null,
          responsablesIds: plan.responsableIds,
        });
      }

      navigate("/missions");
    } catch (error) {
      setSubmitError(error?.message || "Enregistrement du planning impossible.");
    } finally {
      setSaving(false);
    }
  };

  const activePlan = activeDate ? plans[activeDate] : null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate("/missions")} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff" }}>{"<"}</button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Planification des Missions</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Selection des dates, choix gouvernorat/delegation, responsables et type de mission.</p>
        </div>
      </div>

      {submitError ? (
        <div style={{ ...card, borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c", marginBottom: 14 }}>
          {submitError}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <StepBullet n={1} text="Dates" active={step === "dates"} done={["details", "planning"].includes(step)} />
        <StepBullet n={2} text="Affectation" active={step === "details"} done={step === "planning"} />
        <StepBullet n={3} text="Planning" active={step === "planning"} done={false} />
      </div>

      {(step === "dates" || step === "planning") && (
        <div style={{ ...card, marginBottom: 14, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", padding: "12px 14px" }}>
            <button onClick={() => { if (month === 0) { setMonth(11); setYear((value) => value - 1); } else setMonth((value) => value - 1); }} style={{ ...input, width: 40, padding: 6 }}>{"<"}</button>
            <div style={{ fontWeight: 800, color: "#111827" }}>{monthLabels[month]} {year}</div>
            <button onClick={() => { if (month === 11) { setMonth(0); setYear((value) => value + 1); } else setMonth((value) => value + 1); }} style={{ ...input, width: 40, padding: 6 }}>{">"}</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
            {dayLabels.map((day) => <div key={day} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#6b7280", padding: 8 }}>{day}</div>)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: 8 }}>
            {cells.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} style={{ minHeight: 90 }} />;

              const key = toKey(year, month, day);
              const isPast = key < todayKey;
              const selected = selectedDates.has(key);
              const plan = plans[key];

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isPast) {
                      setSubmitError("Impossible de creer une mission avec une date passee.");
                      return;
                    }
                    if (step === "dates") {
                      setSubmitError("");
                      setSelectedDates((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      });
                    } else if (plans[key]) {
                      setActiveDate(key);
                    }
                  }}
                  style={{ minHeight: 90, margin: 2, borderRadius: 10, border: selected ? "1px solid #bfdbfe" : "1px solid #f3f4f6", background: selected ? "#eff6ff" : "#fff", padding: 6, textAlign: "left", opacity: isPast ? 0.45 : 1 }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>{day}</div>
                  {plan ? (
                    <div style={{ marginTop: 4, border: `1px solid ${isComplete(plan) ? "#86efac" : "#fed7aa"}`, background: isComplete(plan) ? "#dcfce7" : "#fff7ed", borderRadius: 6, padding: "3px 5px", fontSize: 10 }}>
                      <div style={{ fontWeight: 700 }}>{locationLabel(plan) || "Lieu non defini"}</div>
                      <div>{respSummary(plan.responsableIds, responsables)}</div>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === "dates" && (
        <>
          {sortedDates.length > 0 ? (
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>Dates selectionnees</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sortedDates.map((dateKey) => <span key={dateKey} style={{ border: "1px solid #bfdbfe", color: "#1d4ed8", background: "#eff6ff", borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{toLabel(dateKey)}</span>)}
              </div>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => navigate("/missions")} style={{ ...input, width: "auto", background: "#f9fafb" }}>Annuler</button>
            <button onClick={goToDetails} disabled={!sortedDates.length} style={{ ...input, width: "auto", border: "none", background: sortedDates.length ? "#2563eb" : "#d1d5db", color: "#fff", fontWeight: 700 }}>Continuer</button>
          </div>
        </>
      )}

      {step === "details" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            {sortedDates.map((dateKey) => {
              const plan = plans[dateKey] || defaultPlan(dateKey);
              return (
                <div key={dateKey} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{toLabel(dateKey)}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{isComplete(plan) ? "Complet" : "A completer"}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                    <div>
                      <label style={label}>Type mission *</label>
                      <input value={plan.typeMission} onChange={(event) => setPlan(dateKey, { typeMission: event.target.value })} style={{ ...input, borderColor: errors[`${dateKey}:typeMission`] ? "#dc2626" : "#d1d5db" }} placeholder="Ex: Recrutement terrain" />
                      {errors[`${dateKey}:typeMission`] ? <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{errors[`${dateKey}:typeMission`]}</div> : null}
                    </div>

                    <div>
                      <label style={label}>Gouvernorat *</label>
                      <select value={plan.governorate} onChange={(event) => setGovernorate(dateKey, event.target.value)} style={{ ...input, borderColor: errors[`${dateKey}:governorate`] ? "#dc2626" : "#d1d5db" }}>
                        <option value="">-- Choisir --</option>
                        {gouvernorats.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      {errors[`${dateKey}:governorate`] ? <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{errors[`${dateKey}:governorate`]}</div> : null}
                    </div>

                    <div>
                      <label style={label}>Delegation *</label>
                      <select value={plan.delegation} onChange={(event) => setPlan(dateKey, { delegation: event.target.value })} disabled={!plan.governorate} style={{ ...input, borderColor: errors[`${dateKey}:delegation`] ? "#dc2626" : "#d1d5db" }}>
                        <option value="">{plan.governorate ? "-- Choisir --" : "-- Choisir un gouvernorat --"}</option>
                        {(delegationsParGouvernorat[plan.governorate] || []).map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      {errors[`${dateKey}:delegation`] ? <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{errors[`${dateKey}:delegation`]}</div> : null}
                    </div>

                    <div>
                      <label style={label}>Transport</label>
                      <select value={plan.transport} onChange={(event) => setPlan(dateKey, { transport: event.target.value })} style={input}>
                        {transportOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={label}>Objectif</label>
                      <input value={plan.objectif} onChange={(event) => setPlan(dateKey, { objectif: event.target.value })} style={input} placeholder="Ex: 30" />
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <ResponsablesPicker
                      responsables={responsables}
                      value={plan.responsableIds}
                      onToggle={(id) => toggleResp(dateKey, id)}
                      error={errors[`${dateKey}:responsableIds`]}
                      loading={loadingResponsables}
                      requestError={responsablesError}
                      availabilityLoading={Boolean(loadingBusyByDate[dateKey])}
                      busyMap={busyResponsablesByDate[dateKey] || {}}
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label style={label}>Observations</label>
                    <textarea rows={2} value={plan.observations} onChange={(event) => setPlan(dateKey, { observations: event.target.value })} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
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
                {sortedDates.map((dateKey) => {
                  const plan = plans[dateKey];
                  return (
                    <button key={dateKey} onClick={() => setActiveDate(dateKey)} style={{ textAlign: "left", borderRadius: 8, border: `1px solid ${activeDate === dateKey ? "#93c5fd" : "#e5e7eb"}`, background: activeDate === dateKey ? "#eff6ff" : "#f9fafb", padding: "9px 10px" }}>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>{toLabel(dateKey)}</div>
                      <div style={{ fontSize: 12 }}>{locationLabel(plan) || "Lieu non defini"}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{respSummary(plan?.responsableIds, responsables)}</div>
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
                    <label style={label}>Type mission *</label>
                    <input value={activePlan.typeMission} onChange={(event) => setPlan(activeDate, { typeMission: event.target.value })} style={input} />
                  </div>

                  <div>
                    <label style={label}>Gouvernorat *</label>
                    <select value={activePlan.governorate} onChange={(event) => setGovernorate(activeDate, event.target.value)} style={input}>
                      <option value="">-- Choisir --</option>
                      {gouvernorats.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={label}>Delegation *</label>
                    <select value={activePlan.delegation} onChange={(event) => setPlan(activeDate, { delegation: event.target.value })} disabled={!activePlan.governorate} style={input}>
                      <option value="">{activePlan.governorate ? "-- Choisir --" : "-- Choisir un gouvernorat --"}</option>
                      {(delegationsParGouvernorat[activePlan.governorate] || []).map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>

                  <ResponsablesPicker
                    responsables={responsables}
                    value={activePlan.responsableIds}
                    onToggle={(id) => toggleResp(activeDate, id)}
                    error=""
                    loading={loadingResponsables}
                    requestError={responsablesError}
                    availabilityLoading={Boolean(loadingBusyByDate[activeDate])}
                    busyMap={busyResponsablesByDate[activeDate] || {}}
                  />

                  <div>
                    <label style={label}>Transport</label>
                    <select value={activePlan.transport} onChange={(event) => setPlan(activeDate, { transport: event.target.value })} style={input}>
                      {transportOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={label}>Objectif</label>
                    <input value={activePlan.objectif} onChange={(event) => setPlan(activeDate, { objectif: event.target.value })} style={input} />
                  </div>

                  <div>
                    <label style={label}>Observations</label>
                    <textarea rows={3} value={activePlan.observations} onChange={(event) => setPlan(activeDate, { observations: event.target.value })} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
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
