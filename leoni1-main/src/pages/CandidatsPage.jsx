import { useState } from "react";
import { useRecrutements } from "../context/RecrutementsContext.jsx";

// ─── Data ────────────────────────────────────────────────────────────────────
const niveauxEtudes = [
  "Sans diplôme", "Certificat primaire", "Brevet collège (9ème)", "Baccalauréat",
  "BTS / BTP", "Licence", "Master", "Ingénieur", "Doctorat",
];
const gouvernorats = [
  "Tunis","Ariana","Ben Arous","Manouba","Nabeul","Zaghouan","Bizerte","Béja",
  "Jendouba","Le Kef","Siliana","Sousse","Monastir","Mahdia","Sfax","Kairouan",
  "Kasserine","Sidi Bouzid","Gabès","Médenine","Tataouine","Gafsa","Tozeur","Kébili",
];
const postes = [
  "Opérateur câblage","Technicien contrôle","Agent qualité",
  "Agent logistique","Technicien maintenance","Opérateur production",
];
const statuts = ["Nouveau", "Réintégré"];
const statutColors = {
  "Nouveau":    { bg: "#eff6ff", color: "#2563eb" },
  "Réintégré":  { bg: "#dcfce7", color: "#16a34a" },
};

// ─── Shared UI primitives ────────────────────────────────────────────────────
const S = {
  inp: (err) => ({
    width:"100%", padding:"8px 11px", boxSizing:"border-box",
    border:`1px solid ${err ? "#dc2626" : "#d1d5db"}`, borderRadius:7,
    fontSize:13, outline:"none", background:"#fff", fontFamily:"inherit",
  }),
};

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,overflowY:"auto" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:14,boxShadow:"0 24px 60px rgba(0,0,0,0.22)",width:"100%",maxWidth:680,margin:"auto",position:"relative" }}>
        {children}
      </div>
    </div>
  );
}
function MHdr({ title, sub, onClose }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"20px 24px 16px",borderBottom:"1px solid #f3f4f6" }}>
      <div><h3 style={{ fontSize:17,fontWeight:800,color:"#111827" }}>{title}</h3>
        {sub && <p style={{ fontSize:12,color:"#6b7280",marginTop:2 }}>{sub}</p>}</div>
      <button onClick={onClose} style={{ background:"none",border:"none",color:"#9ca3af",cursor:"pointer",marginTop:2 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}
function MFtr({ children }) {
  return <div style={{ display:"flex",justifyContent:"flex-end",gap:10,padding:"16px 24px",borderTop:"1px solid #f3f4f6" }}>{children}</div>;
}
function Btn({ onClick, color="primary", children, ...rest }) {
  const styles = {
    primary:   { background:"#2563eb",color:"#fff",border:"none" },
    success:   { background:"#16a34a",color:"#fff",border:"none" },
    danger:    { background:"#dc2626",color:"#fff",border:"none" },
    secondary: { background:"#f9fafb",color:"#374151",border:"1px solid #e5e7eb" },
  };
  return <button onClick={onClick} {...rest} style={{ padding:"9px 22px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",...styles[color] }}>{children}</button>;
}
function Field({ label, required, error, children, half }) {
  return (
    <div style={{ gridColumn: half ? "span 1" : "span 1" }}>
      <label style={{ fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5 }}>
        {label}{required && <span style={{ color:"#dc2626",marginLeft:2 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize:10,color:"#dc2626",marginTop:2 }}>{error}</p>}
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
        <div style={{ height:1,width:16,background:"#e5e7eb" }} />
        <span style={{ fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>{title}</span>
        <div style={{ height:1,flex:1,background:"#e5e7eb" }} />
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
        {children}
      </div>
    </div>
  );
}

// ─── EMPTY FORM ──────────────────────────────────────────────────────────────
const emptyForm = () => ({
  // Identity
  nomComplet:"", cin:"", dateNaissance:"", sexe:"Homme",
  // Contact
  telephone:"", email:"",
  // Address
  adresse:"", gouvernoratResidence:"", delegation:"",
  // Origin
  gouvernoratOrigine:"", villeOrigine:"",
  // Education
  niveauEtudes:"Baccalauréat", specialite:"", etablissement:"",
  // Mission
  posteVise: postes[0], missionId:"", statut:"Nouveau",
  // Notes
  notes:"",
});

// ─── CANDIDAT FORM MODAL ─────────────────────────────────────────────────────
function CandidatFormModal({ initial, missionsList, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm]     = useState(initial ? { ...initial } : emptyForm());
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p=>({...p,[k]:v})); if(errors[k]) setErrors(p=>({...p,[k]:""})); };

  const validate = () => {
    const e = {};
    if (!form.nomComplet.trim()) e.nomComplet = "Requis";
    if (!form.cin.trim())        e.cin        = "Requis";
    if (!form.telephone.trim())  e.telephone  = "Requis";
    if (!form.gouvernoratResidence) e.gouvernoratResidence = "Requis";
    return e;
  };

  const handle = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  };

  return (
    <Overlay onClose={onClose}>
      <MHdr title={isEdit ? "Modifier le candidat" : "Nouveau candidat"} sub={isEdit ? `ID: ${initial.id}` : "Remplissez les informations"} onClose={onClose} />
      <div style={{ padding:"20px 24px", maxHeight:"72vh", overflowY:"auto" }}>

        <Section title="Identité">
          <Field label="Nom complet" required error={errors.nomComplet}>
            <input value={form.nomComplet} onChange={e=>set("nomComplet",e.target.value)} placeholder="Prénom Nom" style={S.inp(errors.nomComplet)} />
          </Field>
          <Field label="CIN" required error={errors.cin}>
            <input value={form.cin} onChange={e=>set("cin",e.target.value)} placeholder="00000000" style={S.inp(errors.cin)} maxLength={8} />
          </Field>
          <Field label="Date de naissance">
            <input type="date" value={form.dateNaissance} onChange={e=>set("dateNaissance",e.target.value)} style={S.inp(false)} />
          </Field>
          <Field label="Sexe">
            <select value={form.sexe} onChange={e=>set("sexe",e.target.value)} style={S.inp(false)}>
              <option>Homme</option><option>Femme</option>
            </select>
          </Field>
        </Section>

        <Section title="Contact">
          <Field label="Téléphone" required error={errors.telephone}>
            <input value={form.telephone} onChange={e=>set("telephone",e.target.value)} placeholder="XX XXX XXX" style={S.inp(errors.telephone)} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="exemple@mail.com" style={S.inp(false)} />
          </Field>
        </Section>

        <Section title="Adresse de résidence">
          <Field label="Gouvernorat de résidence" required error={errors.gouvernoratResidence} style={{ gridColumn:"span 2" }}>
            <select value={form.gouvernoratResidence} onChange={e=>set("gouvernoratResidence",e.target.value)} style={S.inp(errors.gouvernoratResidence)}>
              <option value="">-- Sélectionner --</option>
              {gouvernorats.map(g=><option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Délégation / Ville">
            <input value={form.delegation} onChange={e=>set("delegation",e.target.value)} placeholder="Ex: Akouda" style={S.inp(false)} />
          </Field>
          <Field label="Adresse complète">
            <input value={form.adresse} onChange={e=>set("adresse",e.target.value)} placeholder="Rue, n°..." style={S.inp(false)} />
          </Field>
        </Section>

        <Section title="Région d'origine">
          <Field label="Gouvernorat d'origine">
            <select value={form.gouvernoratOrigine} onChange={e=>set("gouvernoratOrigine",e.target.value)} style={S.inp(false)}>
              <option value="">-- Sélectionner --</option>
              {gouvernorats.map(g=><option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Ville d'origine">
            <input value={form.villeOrigine} onChange={e=>set("villeOrigine",e.target.value)} placeholder="Ex: Douz" style={S.inp(false)} />
          </Field>
        </Section>

        <Section title="Formation & Diplôme">
          <Field label="Niveau d'études">
            <select value={form.niveauEtudes} onChange={e=>set("niveauEtudes",e.target.value)} style={S.inp(false)}>
              {niveauxEtudes.map(n=><option key={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Spécialité / Filière">
            <input value={form.specialite} onChange={e=>set("specialite",e.target.value)} placeholder="Ex: Électrotechnique" style={S.inp(false)} />
          </Field>
          <Field label="Établissement">
            <input value={form.etablissement} onChange={e=>set("etablissement",e.target.value)} placeholder="Ex: ISET Sousse" style={S.inp(false)} />
          </Field>
        </Section>

        <Section title="Mission & Poste">
          <Field label="Poste visé">
            <select value={form.posteVise} onChange={e=>set("posteVise",e.target.value)} style={S.inp(false)}>
              {postes.map(p=><option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Statut">
            <select value={form.statut} onChange={e=>set("statut",e.target.value)} style={S.inp(false)}>
              {statuts.map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Mission liée">
            <select value={form.missionId} onChange={e=>set("missionId",e.target.value)} style={S.inp(false)}>
              <option value="">-- Aucune --</option>
              {missionsList.map(m=><option key={m.id} value={m.id}>{m.id} — {m.ville} ({m.date})</option>)}
            </select>
          </Field>
        </Section>

        <div>
          <label style={{ fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5 }}>Observations / Notes</label>
          <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Remarques supplémentaires..."
            style={{ ...S.inp(false), resize:"vertical", lineHeight:1.5 }} />
        </div>
      </div>
      <MFtr>
        <Btn color="secondary" onClick={onClose}>Annuler</Btn>
        <Btn color={isEdit ? "success" : "primary"} onClick={handle}>{isEdit ? "Enregistrer" : "Ajouter"}</Btn>
      </MFtr>
    </Overlay>
  );
}

// ─── VIEW MODAL ──────────────────────────────────────────────────────────────
function ViewModal({ candidat, onClose, onEdit }) {
  const sc = statutColors[candidat.statut] || statutColors["Candidat"];
  const Row = ({ label, val }) => val ? (
    <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
      <span style={{ fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em" }}>{label}</span>
      <span style={{ fontSize:13,fontWeight:600,color:"#111827" }}>{val}</span>
    </div>
  ) : null;

  return (
    <Overlay onClose={onClose}>
      <MHdr title={candidat.nomComplet} sub={`CIN: ${candidat.cin}`} onClose={onClose} />
      <div style={{ padding:"20px 24px", maxHeight:"72vh", overflowY:"auto" }}>

        {/* Top badge */}
        <div style={{ display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" }}>
          <span style={{ ...sc,borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700 }}>{candidat.statut}</span>
          {candidat.missionId && <span style={{ background:"#fff7ed",color:"#ea580c",border:"1px solid #fed7aa",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700 }}>{candidat.missionId}</span>}
          <span style={{ background:"#f3f4f6",color:"#374151",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:600 }}>{candidat.posteVise}</span>
        </div>

        {[
          { title:"Identité", rows:[["Nom complet",candidat.nomComplet],["CIN",candidat.cin],["Date de naissance",candidat.dateNaissance],["Sexe",candidat.sexe]] },
          { title:"Contact", rows:[["Téléphone",candidat.telephone],["Email",candidat.email]] },
          { title:"Résidence", rows:[["Gouvernorat",candidat.gouvernoratResidence],["Délégation",candidat.delegation],["Adresse",candidat.adresse]] },
          { title:"Origine", rows:[["Gouvernorat d'origine",candidat.gouvernoratOrigine],["Ville d'origine",candidat.villeOrigine]] },
          { title:"Formation", rows:[["Niveau d'études",candidat.niveauEtudes],["Spécialité",candidat.specialite],["Établissement",candidat.etablissement]] },
        ].map(sec => (
          <div key={sec.title} style={{ marginBottom:18 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
              <div style={{ height:1,width:14,background:"#e5e7eb" }} />
              <span style={{ fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.08em" }}>{sec.title}</span>
              <div style={{ height:1,flex:1,background:"#e5e7eb" }} />
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,background:"#f9fafb",borderRadius:8,padding:"12px 14px" }}>
              {sec.rows.map(([l,v])=><Row key={l} label={l} val={v} />)}
            </div>
          </div>
        ))}

        {candidat.notes && (
          <div>
            <label style={{ fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",display:"block",marginBottom:6 }}>Observations</label>
            <div style={{ background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#374151",lineHeight:1.6 }}>{candidat.notes}</div>
          </div>
        )}
      </div>
      <MFtr>
        <Btn color="secondary" onClick={onClose}>Fermer</Btn>
        <Btn color="primary" onClick={onEdit}>Modifier</Btn>
      </MFtr>
    </Overlay>
  );
}

// ─── DELETE CONFIRM ──────────────────────────────────────────────────────────
function DeleteModal({ candidat, onClose, onConfirm }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ padding:"28px 28px 0" }}>
        <div style={{ width:48,height:48,borderRadius:"50%",background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
        <h3 style={{ fontSize:17,fontWeight:800,color:"#111827",marginBottom:8 }}>Supprimer ce candidat ?</h3>
        <p style={{ fontSize:13,color:"#6b7280",lineHeight:1.6,paddingBottom:20 }}>
          <strong style={{ color:"#111827" }}>{candidat.nomComplet}</strong> (CIN : {candidat.cin}) sera définitivement supprimé.
        </p>
      </div>
      <MFtr>
        <Btn color="secondary" onClick={onClose}>Annuler</Btn>
        <Btn color="danger" onClick={onConfirm}>Supprimer</Btn>
      </MFtr>
    </Overlay>
  );
}

// ─── ACTION BUTTON ───────────────────────────────────────────────────────────
function ActionBtn({ title, color, bg, onClick, children }) {
  return (
    <button title={title} onClick={onClick} style={{ background:bg,border:"none",borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color }}
      onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
      onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
      {children}
    </button>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function CandidatsPage() {
  const { candidats, addCandidat, updateCandidat, deleteCandidat } = useRecrutements();
  // We'll get missions from context too for the dropdown
  const [missionsList] = useState([
    { id:"M001",ville:"Tunis",date:"15/03/2026" },
    { id:"M002",ville:"Sfax",date:"10/03/2026" },
    { id:"M003",ville:"Sousse",date:"12/03/2026" },
    { id:"M004",ville:"Bizerte",date:"18/03/2026" },
    { id:"M005",ville:"Kairouan",date:"20/03/2026" },
  ]);

  const [search,        setSearch]       = useState("");
  const [filtreStatut,  setFiltreStatut] = useState("Tous");
  const [filtreGouv,    setFiltreGouv]   = useState("Tous");
  const [filtreNiveau,  setFiltreNiveau] = useState("Tous");

  const [viewModal,   setViewModal]   = useState(null);
  const [editModal,   setEditModal]   = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const filtered = candidats.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || [c.nomComplet,c.cin,c.telephone,c.gouvernoratResidence,c.posteVise].some(v=>(v||"").toLowerCase().includes(q));
    const matchStatut = filtreStatut === "Tous" || c.statut === filtreStatut;
    const matchGouv   = filtreGouv   === "Tous" || c.gouvernoratResidence === filtreGouv;
    const matchNiveau = filtreNiveau === "Tous" || c.niveauEtudes === filtreNiveau;
    return matchSearch && matchStatut && matchGouv && matchNiveau;
  });

  const handleCreate = (form) => {
    addCandidat(form);
    setShowCreate(false);
    showToast("Candidat ajouté avec succès !");
  };
  const handleUpdate = (form) => {
    updateCandidat(form);
    setEditModal(null);
    setViewModal(null);
    showToast("Candidat mis à jour.");
  };
  const handleDelete = (c) => {
    deleteCandidat(c.id);
    setDeleteModal(null);
    showToast(`${c.nomComplet} supprimé.`, "error");
  };

  // Stat counts
  const stats = statuts.map(s => ({ label:s, count: candidats.filter(c=>c.statut===s).length, ...statutColors[s] }));

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed",top:20,right:20,zIndex:2000,background:toast.type==="error"?"#fee2e2":"#dcfce7",border:`1px solid ${toast.type==="error"?"#fca5a5":"#86efac"}`,color:toast.type==="error"?"#dc2626":"#16a34a",borderRadius:10,padding:"12px 20px",fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",display:"flex",alignItems:"center",gap:8 }}>
          {toast.type==="error"
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:22,fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.02em" }}>Gestion des Candidats</h2>
          <p style={{ fontSize:13,color:"var(--text-muted)",marginTop:3 }}>{candidats.length} candidats enregistrés</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display:"flex",alignItems:"center",gap:6,background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,boxShadow:"0 2px 8px rgba(37,99,235,0.3)",cursor:"pointer" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau candidat
        </button>
      </div>

      {/* Statut stat pills */}
      <div style={{ display:"flex",gap:10,marginBottom:20,flexWrap:"wrap" }}>
        {[{ label:"Tous", count: candidats.length, bg:"#f3f4f6", color:"#374151" }, ...stats].map(s => (
          <div key={s.label} onClick={() => setFiltreStatut(s.label)} style={{ background:filtreStatut===s.label ? s.color : s.bg, color:filtreStatut===s.label ? "#fff" : s.color, borderRadius:8,padding:"8px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all 0.15s",border:`1px solid ${s.bg}` }}>
            <span style={{ fontSize:20,fontWeight:800 }}>{s.count}</span>
            <span style={{ fontSize:11,fontWeight:700 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:"#fff",border:"1px solid var(--border)",borderRadius:10,padding:"14px 18px",marginBottom:18,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end" }}>
        {/* Search */}
        <div style={{ flex:2,minWidth:200,position:"relative" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom, CIN, téléphone, gouvernorat..."
            style={{ width:"100%",padding:"7px 10px 7px 32px",border:"1px solid var(--border)",borderRadius:7,fontSize:13,outline:"none",boxSizing:"border-box" }} />
        </div>
        {/* Gouvernorat */}
        <div style={{ flex:1,minWidth:150 }}>
          <label style={{ fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4 }}>GOUVERNORAT</label>
          <select value={filtreGouv} onChange={e=>setFiltreGouv(e.target.value)} style={{ width:"100%",padding:"7px 10px",border:"1px solid var(--border)",borderRadius:7,fontSize:13,background:"#fff",outline:"none" }}>
            <option value="Tous">Tous</option>
            {gouvernorats.map(g=><option key={g}>{g}</option>)}
          </select>
        </div>
        {/* Niveau */}
        <div style={{ flex:1,minWidth:150 }}>
          <label style={{ fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4 }}>NIVEAU</label>
          <select value={filtreNiveau} onChange={e=>setFiltreNiveau(e.target.value)} style={{ width:"100%",padding:"7px 10px",border:"1px solid var(--border)",borderRadius:7,fontSize:13,background:"#fff",outline:"none" }}>
            <option value="Tous">Tous</option>
            {niveauxEtudes.map(n=><option key={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(""); setFiltreStatut("Tous"); setFiltreGouv("Tous"); setFiltreNiveau("Tous"); }}
          style={{ padding:"7px 14px",borderRadius:7,border:"1px solid var(--border)",background:"#f9fafb",color:"#6b7280",fontSize:12,fontWeight:500,cursor:"pointer",height:34 }}>
          Réinitialiser
        </button>
      </div>

      {/* Table */}
      <div style={{ background:"#fff",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f9fafb",borderBottom:"1px solid var(--border)" }}>
              {["NOM COMPLET","CIN","TÉLÉPHONE","RÉSIDENCE","ORIGINE","NIVEAU","POSTE","STATUT","ACTIONS"].map(h=>(
                <th key={h} style={{ padding:"11px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding:"50px",textAlign:"center" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ display:"block",margin:"0 auto 10px" }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <p style={{ color:"#9ca3af",fontSize:13 }}>Aucun candidat trouvé.</p>
              </td></tr>
            ) : filtered.map((c, i) => {
              const sc = statutColors[c.statut] || statutColors["Candidat"];
              return (
                <tr key={c.id} style={{ borderBottom: i<filtered.length-1 ? "1px solid var(--border)" : "none", transition:"background 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                  {/* Avatar + Name */}
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                      <div style={{ width:32,height:32,borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#2563eb",flexShrink:0 }}>
                        {c.nomComplet.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:"#111827" }}>{c.nomComplet}</div>
                        <div style={{ fontSize:11,color:"#9ca3af" }}>{c.sexe} {c.dateNaissance ? `· ${c.dateNaissance}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"12px 14px",fontSize:12,color:"#374151",fontFamily:"monospace" }}>{c.cin}</td>
                  <td style={{ padding:"12px 14px",fontSize:12,color:"#374151" }}>{c.telephone}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:12,fontWeight:600,color:"#111827" }}>{c.gouvernoratResidence || "—"}</div>
                    {c.delegation && <div style={{ fontSize:11,color:"#9ca3af" }}>{c.delegation}</div>}
                  </td>
                  <td style={{ padding:"12px 14px",fontSize:12,color:"#374151" }}>{c.gouvernoratOrigine || "—"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:12,fontWeight:600,color:"#111827" }}>{c.niveauEtudes}</div>
                    {c.specialite && <div style={{ fontSize:11,color:"#9ca3af" }}>{c.specialite}</div>}
                  </td>
                  <td style={{ padding:"12px 14px",fontSize:12,color:"#374151",whiteSpace:"nowrap" }}>{c.posteVise}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ background:sc.bg,color:sc.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap" }}>{c.statut}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex",gap:4 }}>
                      <ActionBtn title="Voir" color="#2563eb" bg="#eff6ff" onClick={()=>setViewModal(c)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </ActionBtn>
                      <ActionBtn title="Modifier" color="#d97706" bg="#fffbeb" onClick={()=>setEditModal(c)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </ActionBtn>
                      <ActionBtn title="Supprimer" color="#dc2626" bg="#fee2e2" onClick={()=>setDeleteModal(c)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"10px 16px",borderTop:"1px solid var(--border)",background:"#f9fafb",fontSize:12,color:"#6b7280" }}>
          {filtered.length} résultat{filtered.length!==1?"s":""} affiché{filtered.length!==1?"s":""}
          {filtered.length !== candidats.length && ` (sur ${candidats.length} au total)`}
        </div>
      </div>

      {/* Modals */}
      {showCreate   && <CandidatFormModal missionsList={missionsList} onClose={()=>setShowCreate(false)}   onSave={handleCreate} />}
      {editModal    && <CandidatFormModal initial={editModal} missionsList={missionsList} onClose={()=>setEditModal(null)} onSave={handleUpdate} />}
      {viewModal    && <ViewModal   candidat={viewModal}   onClose={()=>setViewModal(null)}   onEdit={()=>{ setEditModal(viewModal); setViewModal(null); }} />}
      {deleteModal  && <DeleteModal candidat={deleteModal} onClose={()=>setDeleteModal(null)} onConfirm={()=>handleDelete(deleteModal)} />}
    </div>
  );
}