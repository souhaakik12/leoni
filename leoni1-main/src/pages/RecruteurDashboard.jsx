import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMissions } from "../context/MissionsContext.jsx";
import { useRecrutements } from "../context/RecrutementsContext.jsx";

const villes = ["Toutes les villes", "Tunis", "Sfax", "Sousse", "Bizerte", "Kairouan"];
const statutConfig = {
  "Terminée":  { bg: "#dcfce7", color: "#16a34a" },
  "En cours":  { bg: "#dbeafe", color: "#2563eb" },
  "Planifiée": { bg: "#f3f4f6", color: "#6b7280" },
};

// ── small shared UI ──────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",maxHeight:"92vh",overflowY:"auto",width:"100%",maxWidth:580 }}>
        {children}
      </div>
    </div>
  );
}
function ModalHdr({ title, sub, onClose }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"20px 24px",borderBottom:"1px solid #f3f4f6" }}>
      <div>
        <h3 style={{ fontSize:16,fontWeight:800,color:"#111827" }}>{title}</h3>
        {sub && <p style={{ fontSize:12,color:"#6b7280",marginTop:3 }}>{sub}</p>}
      </div>
      <button onClick={onClose} style={{ background:"none",border:"none",color:"#9ca3af",cursor:"pointer",marginTop:2 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}
const inp = { width:"100%",padding:"8px 11px",border:"1px solid #d1d5db",borderRadius:7,fontSize:13,outline:"none",boxSizing:"border-box" };

// ── New Entry Modal (choose mission for today) ────────────────────────────────
function NewEntryModal({ missions, onClose, onCreated }) {
  const { addEntry, todayStr } = useRecrutements();
  const [missionId, setMissionId] = useState("");
  const [err, setErr] = useState("");

  const activeMissions = missions.filter(m => m.statut !== "Terminée");

  const handle = () => {
    if (!missionId) { setErr("Veuillez sélectionner une mission."); return; }
    const m = missions.find(x => x.id === missionId);
    const entry = addEntry({ date: todayStr, mission: m.id, ville: m.ville, responsable: m.responsable, candidats: [] });
    onCreated(entry.id);
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHdr title="Nouvelle saisie du jour" sub={`Date : ${todayStr}`} onClose={onClose} />
      <div style={{ padding:"20px 24px" }}>
        <label style={{ fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6 }}>Mission concernée *</label>
        <select value={missionId} onChange={e=>{setMissionId(e.target.value);setErr("");}} style={{ ...inp, marginBottom:4, color: missionId ? "#111827" : "#9ca3af" }}>
          <option value="">-- Sélectionner une mission --</option>
          {activeMissions.map(m => <option key={m.id} value={m.id}>{m.id} — {m.ville} ({m.responsable})</option>)}
        </select>
        {err && <p style={{ fontSize:11,color:"#dc2626",marginTop:2 }}>{err}</p>}
      </div>
      <div style={{ display:"flex",justifyContent:"flex-end",gap:10,padding:"14px 24px",borderTop:"1px solid #f3f4f6" }}>
        <button onClick={onClose} style={{ padding:"8px 20px",border:"1px solid #e5e7eb",borderRadius:7,background:"#f9fafb",color:"#374151",fontSize:13,fontWeight:600,cursor:"pointer" }}>Annuler</button>
        <button onClick={handle} style={{ padding:"8px 20px",border:"none",borderRadius:7,background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>Créer</button>
      </div>
    </Overlay>
  );
}

// ── Add Candidat Modal ────────────────────────────────────────────────────────
function AddCandidatModal({ entry, onClose }) {
  const { addCandidatToEntry, postes } = useRecrutements();
  const [form, setForm] = useState({ nom:"", cin:"", telephone:"", poste: postes[0] });
  const [errors, setErrors] = useState({});

  const set = (k,v) => { setForm(p=>({...p,[k]:v})); if(errors[k]) setErrors(p=>({...p,[k]:""})); };

  const validate = () => {
    const e = {};
    if (!form.nom.trim())       e.nom       = "Requis";
    if (!form.cin.trim())       e.cin       = "Requis";
    if (!form.telephone.trim()) e.telephone = "Requis";
    return e;
  };

  const handle = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    addCandidatToEntry(entry.id, form);
    setForm({ nom:"", cin:"", telephone:"", poste: postes[0] });
    setErrors({});
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHdr title={`Ajouter un candidat`} sub={`Mission ${entry.mission} — ${entry.ville} — ${entry.date}`} onClose={onClose} />
      <div style={{ padding:"20px 24px" }}>

        {/* Current list */}
        {entry.candidats.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#374151",marginBottom:8,display:"flex",justifyContent:"space-between" }}>
              <span>Candidats enregistrés</span>
              <span style={{ background:"#dbeafe",color:"#2563eb",borderRadius:99,padding:"1px 10px",fontSize:11,fontWeight:800 }}>{entry.candidats.length}</span>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:180,overflowY:"auto" }}>
              {entry.candidats.map((c, i) => (
                <CandidatRow key={i} candidat={c} index={i} entryId={entry.id} />
              ))}
            </div>
          </div>
        )}

        {/* Add form */}
        <div style={{ background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"16px" }}>
          <p style={{ fontSize:12,fontWeight:700,color:"#374151",marginBottom:12 }}>➕ Nouveau candidat</p>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4 }}>Nom complet *</label>
              <input value={form.nom} onChange={e=>set("nom",e.target.value)} placeholder="Prénom Nom" style={{ ...inp, borderColor: errors.nom ? "#dc2626" : "#d1d5db" }} />
              {errors.nom && <p style={{ fontSize:10,color:"#dc2626",marginTop:2 }}>{errors.nom}</p>}
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4 }}>CIN *</label>
              <input value={form.cin} onChange={e=>set("cin",e.target.value)} placeholder="00000000" style={{ ...inp, borderColor: errors.cin ? "#dc2626" : "#d1d5db" }} />
              {errors.cin && <p style={{ fontSize:10,color:"#dc2626",marginTop:2 }}>{errors.cin}</p>}
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4 }}>Téléphone *</label>
              <input value={form.telephone} onChange={e=>set("telephone",e.target.value)} placeholder="XX XXX XXX" style={{ ...inp, borderColor: errors.telephone ? "#dc2626" : "#d1d5db" }} />
              {errors.telephone && <p style={{ fontSize:10,color:"#dc2626",marginTop:2 }}>{errors.telephone}</p>}
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4 }}>Poste</label>
              <select value={form.poste} onChange={e=>set("poste",e.target.value)} style={inp}>
                {postes.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handle} style={{ width:"100%",padding:"9px",border:"none",borderRadius:7,background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>
            + Ajouter ce candidat
          </button>
        </div>
      </div>
      <div style={{ display:"flex",justifyContent:"flex-end",padding:"14px 24px",borderTop:"1px solid #f3f4f6" }}>
        <button onClick={onClose} style={{ padding:"8px 24px",border:"none",borderRadius:7,background:"#16a34a",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>
          ✓ Terminer
        </button>
      </div>
    </Overlay>
  );
}

function CandidatRow({ candidat, index, entryId }) {
  const { removeCandidatFromEntry } = useRecrutements();
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px" }}>
      <div style={{ width:30,height:30,borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#2563eb",flexShrink:0 }}>
        {candidat.nom.charAt(0)}
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:600,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{candidat.nom}</div>
        <div style={{ fontSize:11,color:"#6b7280" }}>CIN: {candidat.cin} · {candidat.poste}</div>
      </div>
      <button onClick={() => removeCandidatFromEntry(entryId, index)} style={{ background:"none",border:"none",color:"#fca5a5",cursor:"pointer",padding:4 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function RecruteurDashboard() {
  const navigate  = useNavigate();
  const { missions } = useMissions();
  const { entries, todayStr, todayCount, byDate, deleteEntry } = useRecrutements();

  const [filtreVille, setFiltreVille] = useState("Toutes les villes");
  const [activeTab,   setActiveTab]   = useState("missions");   // "missions" | "saisie"
  const [showNewEntry,  setShowNewEntry]  = useState(false);
  const [addCandidatEntry, setAddCandidatEntry] = useState(null);

  const filteredMissions = missions.filter(m => filtreVille === "Toutes les villes" || m.ville === filtreVille);

  // Today's entries
  const todayEntries  = entries.filter(e => e.date === todayStr);
  const recentEntries = entries.slice().sort((a,b) => b.id - a.id);

  // Sort dates for sparkline
  const dateKeys  = Object.keys(byDate).sort();
  const maxCount  = Math.max(...Object.values(byDate), 1);

  const Tab = ({ id, label, badge }) => (
    <button onClick={() => setActiveTab(id)} style={{ padding:"8px 18px",border:"none",borderRadius:8,background: activeTab===id ? "#2563eb" : "transparent",color: activeTab===id ? "#fff" : "#6b7280",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all 0.15s" }}>
      {label}
      {badge != null && <span style={{ background: activeTab===id ? "rgba(255,255,255,0.25)" : "#e5e7eb",color: activeTab===id ? "#fff" : "#374151",borderRadius:99,padding:"1px 8px",fontSize:11,fontWeight:800 }}>{badge}</span>}
    </button>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:22,fontWeight:800,color:"var(--text-primary)" }}>Tableau de Bord — Recruteur</h2>
          <p style={{ fontSize:13,color:"var(--text-muted)",marginTop:3 }}>{todayStr} · {todayCount > 0 ? `${todayCount} candidat${todayCount>1?"s":""} recrutés aujourd'hui` : "Aucun candidat saisi aujourd'hui"}</p>
        </div>
        <button onClick={() => navigate("/missions/create")} style={{ display:"flex",alignItems:"center",gap:6,background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,boxShadow:"0 2px 8px rgba(37,99,235,0.3)",cursor:"pointer" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouvelle Mission
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
        {[
          { label:"Missions totales",   val: missions.length,                                    color:"#2563eb",bg:"#eff6ff",icon:"M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" },
          { label:"Candidats aujourd'hui", val: todayCount,                                      color:"#16a34a",bg:"#dcfce7",icon:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
          { label:"Total candidats",    val: entries.reduce((s,e)=>s+e.candidats.length,0),      color:"#7c3aed",bg:"#f3e8ff",icon:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
          { label:"Saisies ce mois",    val: entries.length,                                     color:"#d97706",bg:"#fffbeb",icon:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg,borderRadius:11,padding:"16px 18px",display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:"rgba(255,255,255,0.6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2"><path d={s.icon}/></svg>
            </div>
            <div>
              <div style={{ fontSize:24,fontWeight:800,color:s.color,lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:11,color:s.color,fontWeight:600,marginTop:3,opacity:0.8 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:4,background:"#f3f4f6",borderRadius:10,padding:4,marginBottom:20,width:"fit-content" }}>
        <Tab id="missions" label="Missions" badge={missions.length} />
        <Tab id="saisie"   label="Saisie du jour" badge={todayCount > 0 ? todayCount : undefined} />
      </div>

      {/* ── TAB: MISSIONS ─────────────────────────────────────────────────── */}
      {activeTab === "missions" && (
        <div>
          <div style={{ background:"#fff",border:"1px solid var(--border)",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12 }}>
            <span style={{ fontSize:13,fontWeight:600,color:"var(--text-secondary)" }}>Ville :</span>
            <select value={filtreVille} onChange={e=>setFiltreVille(e.target.value)} style={{ padding:"6px 10px",border:"1px solid var(--border)",borderRadius:7,fontSize:13,background:"#fff",outline:"none" }}>
              {villes.map(v=><option key={v}>{v}</option>)}
            </select>
          </div>

          <div style={{ background:"#fff",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f9fafb",borderBottom:"1px solid var(--border)" }}>
                  {["ID","DATE","VILLE","RESPONSABLE","TRANSPORT","OBJECTIF","STATUT","SAISIE"].map(h=>(
                    <th key={h} style={{ padding:"11px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.08em",textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMissions.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding:"40px",textAlign:"center",color:"#9ca3af",fontSize:13 }}>Aucune mission.</td></tr>
                ) : filteredMissions.map((m, i) => {
                  const sc = statutConfig[m.statut] || { bg:"#f3f4f6",color:"#6b7280" };
                  const mEntries = entries.filter(e => e.mission === m.id);
                  const mTotal   = mEntries.reduce((s,e)=>s+e.candidats.length, 0);
                  return (
                    <tr key={m.id} style={{ borderBottom: i<filteredMissions.length-1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                      onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                      <td style={{ padding:"12px 16px",fontWeight:700,fontSize:13 }}>{m.id}</td>
                      <td style={{ padding:"12px 16px",fontSize:13,color:"#6b7280" }}>{m.date}</td>
                      <td style={{ padding:"12px 16px",fontSize:13,fontWeight:500 }}>{m.ville}</td>
                      <td style={{ padding:"12px 16px",fontSize:13,color:"#374151" }}>{m.responsable}</td>
                      <td style={{ padding:"12px 16px",fontSize:13,color:"#6b7280" }}>{m.transport}</td>
                      <td style={{ padding:"12px 16px",fontSize:13,color:"#6b7280" }}>{m.objectif}</td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ background:sc.bg,color:sc.color,borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600 }}>{m.statut}</span>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          {mTotal > 0 && <span style={{ background:"#dcfce7",color:"#16a34a",borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:800 }}>{mTotal} recrutés</span>}
                          {m.statut !== "Terminée" && (
                            <button onClick={() => { setActiveTab("saisie"); setShowNewEntry(true); }}
                              style={{ padding:"4px 10px",border:"1px solid #bfdbfe",borderRadius:6,background:"#eff6ff",color:"#2563eb",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                              + Saisir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: SAISIE DU JOUR ───────────────────────────────────────────── */}
      {activeTab === "saisie" && (
        <div>
          {/* Today header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div>
              <h3 style={{ fontSize:16,fontWeight:800,color:"#111827" }}>Saisie du {todayStr}</h3>
              <p style={{ fontSize:13,color:"#6b7280",marginTop:2 }}>
                {todayEntries.length === 0 ? "Aucune saisie pour aujourd'hui" : `${todayEntries.length} saisie${todayEntries.length>1?"s":""} · ${todayCount} candidat${todayCount>1?"s":""} total`}
              </p>
            </div>
            <button onClick={() => setShowNewEntry(true)} style={{ display:"flex",alignItems:"center",gap:6,background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(22,163,74,0.3)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouvelle saisie
            </button>
          </div>

          {/* Sparkline bar chart */}
          {dateKeys.length > 0 && (
            <div style={{ background:"#fff",border:"1px solid var(--border)",borderRadius:12,padding:"20px 24px",marginBottom:20 }}>
              <p style={{ fontSize:12,fontWeight:700,color:"#6b7280",marginBottom:14,textTransform:"uppercase",letterSpacing:"0.07em" }}>Candidats recrutés par jour</p>
              <div style={{ display:"flex",alignItems:"flex-end",gap:8,height:80 }}>
                {dateKeys.map(dk => {
                  const val   = byDate[dk];
                  const pct   = (val / maxCount) * 100;
                  const isToday = dk === todayStr;
                  return (
                    <div key={dk} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:1 }}>
                      <span style={{ fontSize:10,fontWeight:700,color: isToday ? "#2563eb" : "#6b7280" }}>{val}</span>
                      <div style={{ width:"100%",borderRadius:4,background: isToday ? "#2563eb" : "#bfdbfe",height:`${Math.max(pct,8)}%`,transition:"height 0.3s" }} />
                      <span style={{ fontSize:9,color: isToday ? "#2563eb" : "#9ca3af",fontWeight: isToday ? 700 : 400,textAlign:"center",lineHeight:1.2 }}>
                        {dk.slice(0,5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's entries */}
          {todayEntries.length === 0 ? (
            <div style={{ background:"#fff",border:"2px dashed #e5e7eb",borderRadius:12,padding:"40px",textAlign:"center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ display:"block",margin:"0 auto 12px" }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              <p style={{ fontSize:14,fontWeight:600,color:"#6b7280",marginBottom:6 }}>Aucun candidat saisi aujourd'hui</p>
              <p style={{ fontSize:12,color:"#9ca3af",marginBottom:16 }}>Cliquez sur "Nouvelle saisie" pour commencer</p>
              <button onClick={() => setShowNewEntry(true)} style={{ padding:"8px 20px",border:"none",borderRadius:8,background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>
                + Commencer la saisie
              </button>
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {todayEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} onAddCandidat={() => setAddCandidatEntry(entry)} onDelete={() => deleteEntry(entry.id)} />
              ))}
            </div>
          )}

          {/* Past entries */}
          {recentEntries.filter(e => e.date !== todayStr).length > 0 && (
            <div style={{ marginTop:28 }}>
              <p style={{ fontSize:12,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12 }}>Historique</p>
              <div style={{ background:"#fff",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden" }}>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"#f9fafb",borderBottom:"1px solid var(--border)" }}>
                      {["DATE","MISSION","VILLE","RESPONSABLE","CANDIDATS"].map(h=>(
                        <th key={h} style={{ padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentEntries.filter(e => e.date !== todayStr).map((e, i, arr) => (
                      <tr key={e.id} style={{ borderBottom: i<arr.length-1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding:"11px 16px",fontSize:13,fontWeight:600,color:"#111827" }}>{e.date}</td>
                        <td style={{ padding:"11px 16px",fontSize:13 }}><span style={{ background:"#fff7ed",color:"#ea580c",border:"1px solid #fed7aa",borderRadius:5,padding:"2px 8px",fontSize:12,fontWeight:700 }}>{e.mission}</span></td>
                        <td style={{ padding:"11px 16px",fontSize:13,color:"#374151" }}>{e.ville}</td>
                        <td style={{ padding:"11px 16px",fontSize:13,color:"#6b7280" }}>{e.responsable}</td>
                        <td style={{ padding:"11px 16px" }}>
                          <span style={{ background:"#dcfce7",color:"#16a34a",borderRadius:99,padding:"3px 12px",fontSize:12,fontWeight:800 }}>
                            {e.candidats.length} personne{e.candidats.length!==1?"s":""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showNewEntry    && <NewEntryModal   missions={missions} onClose={() => setShowNewEntry(false)}    onCreated={id => setAddCandidatEntry(entries.find(e=>e.id===id) || entries[entries.length-1])} />}
      {addCandidatEntry && <AddCandidatModal entry={entries.find(e=>e.id===addCandidatEntry.id) || addCandidatEntry} onClose={() => setAddCandidatEntry(null)} />}
    </div>
  );
}

function EntryCard({ entry, onAddCandidat, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{ background:"#fff",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden" }}>
      {/* Card header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom: expanded ? "1px solid var(--border)" : "none",background:"#f9fafb" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ background:"#fff7ed",color:"#ea580c",border:"1px solid #fed7aa",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:800 }}>{entry.mission}</span>
          <div>
            <span style={{ fontSize:14,fontWeight:700,color:"#111827" }}>{entry.ville}</span>
            <span style={{ fontSize:12,color:"#6b7280",marginLeft:8 }}>{entry.responsable}</span>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ background:"#dcfce7",color:"#16a34a",borderRadius:99,padding:"4px 14px",fontSize:13,fontWeight:800 }}>
            {entry.candidats.length} candidat{entry.candidats.length!==1?"s":""}
          </span>
          <button onClick={onAddCandidat} style={{ padding:"5px 12px",border:"1px solid #bfdbfe",borderRadius:6,background:"#eff6ff",color:"#2563eb",fontSize:12,fontWeight:700,cursor:"pointer" }}>+ Ajouter</button>
          <button onClick={() => setExpanded(v=>!v)} style={{ background:"none",border:"none",cursor:"pointer",color:"#6b7280",display:"flex",alignItems:"center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <button onClick={onDelete} style={{ background:"none",border:"none",cursor:"pointer",color:"#fca5a5",display:"flex",alignItems:"center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </div>

      {/* Candidats list */}
      {expanded && (
        <div style={{ padding:"14px 18px" }}>
          {entry.candidats.length === 0 ? (
            <div style={{ textAlign:"center",padding:"20px",color:"#9ca3af",fontSize:13 }}>
              Aucun candidat — <button onClick={onAddCandidat} style={{ background:"none",border:"none",color:"#2563eb",cursor:"pointer",fontSize:13,fontWeight:600 }}>ajouter le premier</button>
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10 }}>
              {entry.candidats.map((c, i) => (
                <CandidatRow key={i} candidat={c} index={i} entryId={entry.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}