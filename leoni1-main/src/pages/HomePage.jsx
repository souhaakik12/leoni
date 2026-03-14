import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRecrutements } from "../context/RecrutementsContext.jsx";

const alertes = [
  { nom: "Fatima Zahra El Idrissi", matricule: "EMP001", dept: "Production",  expiration: "15/04/2026" },
  { nom: "Amina Bennani",           matricule: "EMP023", dept: "Logistique",  expiration: "20/04/2026" },
  { nom: "Khadija Alami",           matricule: "EMP045", dept: "Qualité",     expiration: "28/04/2026" },
];

const missionsChart = [
  { label: "Mission A", pct: 85, color: "#2563eb" },
  { label: "Mission B", pct: 72, color: "#16a34a" },
  { label: "Mission C", pct: 68, color: "#f59e0b" },
  { label: "Mission D", pct: 55, color: "#dc2626" },
];

// Simple pie chart using SVG
function PieChart({ data }) {
  const size = 180;
  const cx = size / 2, cy = size / 2, r = 70;
  let cumAngle = -Math.PI / 2;
  const total = data.reduce((s, d) => s + d.pct, 0);

  const slices = data.map(d => {
    const angle = (d.pct / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const mid = cumAngle - angle / 2;
    const lx = cx + (r + 28) * Math.cos(mid);
    const ly = cy + (r + 28) * Math.sin(mid);
    const large = angle > Math.PI ? 1 : 0;
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, lx, ly, mid };
  });

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.color} stroke="#fff" strokeWidth="2" />
          <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: 11, fontWeight: 600, fill: s.color }}>
            {s.label} ({s.pct}%)
          </text>
        </g>
      ))}
    </svg>
  );
}

function StatCard({ label, value, color, bg, border, icon }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "18px 20px", flex: "1 1 140px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color, letterSpacing: "-0.04em" }}>{value}</div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { entries, byDate, todayCount, todayStr } = useRecrutements();

  const totalCandidats = entries.reduce((s, e) => s + e.candidats.length, 0);
  const dateKeys = Object.keys(byDate).sort();
  const maxCount = Math.max(...Object.values(byDate), 1);

  // Latest today's entries for admin view
  const todayEntries = entries.filter(e => e.date === todayStr);
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Dashboard</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Missions" value="5" color="#2563eb" bg="#eff6ff" border="#bfdbfe"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16"/></svg>} />
        <StatCard label="Foyers" value="8" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>} />
        <StatCard label="Total Candidats" value={totalCandidats} color="#16a34a" bg="#dcfce7" border="#bbf7d0"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
        <StatCard label="Aujourd'hui" value={todayCount} color="#ea580c" bg="#fff7ed" border="#fed7aa"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
      </div>

      {/* Live Recruitment Panel */}
      <div style={{ background:"#fff",border:"1px solid var(--border)",borderRadius:12,padding:"20px 24px",marginBottom:20 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:10,height:10,borderRadius:"50%",background:todayCount>0 ? "#16a34a":"#d1d5db",boxShadow:todayCount>0?"0 0 0 3px #dcfce7":"none" }} />
            <h3 style={{ fontSize:14,fontWeight:700,color:"#111827" }}>Recrutements du jour — {todayStr}</h3>
            <span style={{ background: todayCount>0 ? "#dcfce7":"#f3f4f6",color: todayCount>0 ? "#16a34a":"#6b7280",borderRadius:99,padding:"2px 10px",fontSize:12,fontWeight:800 }}>
              {todayCount} candidat{todayCount!==1?"s":""}
            </span>
          </div>
        </div>

        {/* Sparkline */}
        {dateKeys.length > 0 && (
          <div style={{ display:"flex",alignItems:"flex-end",gap:6,height:60,marginBottom:16,padding:"0 4px" }}>
            {dateKeys.map(dk => {
              const val = byDate[dk];
              const pct = (val / maxCount) * 100;
              const isToday = dk === todayStr;
              return (
                <div key={dk} title={`${dk}: ${val} candidats`} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1 }}>
                  <span style={{ fontSize:9,fontWeight:800,color:isToday?"#2563eb":"#9ca3af" }}>{val}</span>
                  <div style={{ width:"100%",borderRadius:3,background:isToday?"#2563eb":"#bfdbfe",height:`${Math.max(pct,10)}%`,transition:"height 0.3s" }} />
                  <span style={{ fontSize:8,color:isToday?"#2563eb":"#9ca3af",fontWeight:isToday?700:400 }}>{dk.slice(0,5)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Today detail */}
        {todayEntries.length === 0 ? (
          <div style={{ background:"#f9fafb",borderRadius:8,padding:"16px",textAlign:"center",color:"#9ca3af",fontSize:13 }}>
            Aucune saisie recruteur pour aujourd'hui.
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {todayEntries.map(entry => (
              <div key={entry.id} style={{ background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:9,padding:"12px 16px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ background:"#fff7ed",color:"#ea580c",border:"1px solid #fed7aa",borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:800 }}>{entry.mission}</span>
                    <span style={{ fontSize:13,fontWeight:700,color:"#111827" }}>{entry.ville}</span>
                    <span style={{ fontSize:12,color:"#6b7280" }}>· {entry.responsable}</span>
                  </div>
                  <span style={{ background:"#dcfce7",color:"#16a34a",borderRadius:99,padding:"3px 12px",fontSize:12,fontWeight:800 }}>
                    {entry.candidats.length} personne{entry.candidats.length!==1?"s":""}
                  </span>
                </div>
                {entry.candidats.length > 0 && (
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {entry.candidats.map((c, i) => (
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:6,background:"#fff",border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 10px" }}>
                        <div style={{ width:22,height:22,borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#2563eb",flexShrink:0 }}>
                          {c.nom.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize:12,fontWeight:600,color:"#111827" }}>{c.nom}</div>
                          <div style={{ fontSize:10,color:"#9ca3af" }}>{c.poste}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts + Alerts row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

        {/* Pie chart */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", flex: "1 1 340px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>Missions les plus efficaces</h3>
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 10px" }}>
            <PieChart data={missionsChart} />
          </div>
        </div>

        {/* Contract alerts */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", flex: "1 1 340px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Alertes - Contrats proches d'expiration</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alertes.map((a, i) => (
              <div key={i} style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 8, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{a.nom}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{a.matricule} · {a.dept}</div>
                    <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, marginTop: 3 }}>Expiration: {a.expiration}</div>
                  </div>
                  <button onClick={() => navigate("/contracts")} style={{
                    background: "none", border: "none",
                    color: "#2563eb", fontSize: 12, fontWeight: 600,
                  }}>Voir</button>
                </div>
                <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 6 }}>
                  ⚠️ Ce contrat arrive à expiration, veuillez préparer le renouvellement.
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}