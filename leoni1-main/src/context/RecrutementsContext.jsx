import { createContext, useContext, useState } from "react";

const RecrutementsContext = createContext(null);

const today = new Date();
const fmt = (d) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;

// ── Pre-seeded daily entries (for saisie du jour history) ─────────────────────
const initialEntries = [
  { id: 1, date: "11/03/2026", mission: "M002", ville: "Sfax", responsable: "Sara El Amrani", candidats: [
      { nom: "Karim Ayari",   cin: "08234567", telephone: "22 345 678", poste: "Opérateur câblage" },
      { nom: "Nour Hammami",  cin: "09345678", telephone: "55 456 789", poste: "Technicien contrôle" },
      { nom: "Ines Chaabane", cin: "07456789", telephone: "98 567 890", poste: "Opérateur câblage" },
  ]},
  { id: 2, date: "12/03/2026", mission: "M004", ville: "Bizerte", responsable: "Fatima Rachidi", candidats: [
      { nom: "Yassine Ben Ali", cin: "06567890", telephone: "25 678 901", poste: "Opérateur câblage" },
      { nom: "Salma Trabelsi",  cin: "05678901", telephone: "50 789 012", poste: "Agent qualité" },
  ]},
];

// ── Pre-seeded full candidat profiles ─────────────────────────────────────────
const initialCandidats = [
  { id: 1, nomComplet: "Karim Ayari",      cin: "08234567", dateNaissance: "1998-04-12", sexe: "Homme",  telephone: "22 345 678", email: "karim.ayari@mail.com",     adresse: "12 Rue de la Paix",     gouvernoratResidence: "Sfax",    delegation: "Sfax Ville",   gouvernoratOrigine: "Gabès",     villeOrigine: "El Hamma",    niveauEtudes: "Baccalauréat",     specialite: "Sciences",        etablissement: "Lycée Sfax",  posteVise: "Opérateur câblage",    missionId: "M002", statut: "Nouveau",    notes: "" },
  { id: 2, nomComplet: "Nour Hammami",     cin: "09345678", dateNaissance: "2000-09-22", sexe: "Femme",  telephone: "55 456 789", email: "",                          adresse: "Cité El Ons",            gouvernoratResidence: "Sfax",    delegation: "Sakiet Ezzit",  gouvernoratOrigine: "Kairouan",  villeOrigine: "Kairouan Nord", niveauEtudes: "BTS / BTP",        specialite: "Électronique",    etablissement: "ISET Sfax",   posteVise: "Technicien contrôle",  missionId: "M002", statut: "Réintégré", notes: "" },
  { id: 3, nomComplet: "Yassine Ben Ali",  cin: "06567890", dateNaissance: "1997-01-05", sexe: "Homme",  telephone: "25 678 901", email: "yassine@mail.tn",           adresse: "Av. Habib Bourguiba",    gouvernoratResidence: "Bizerte", delegation: "Bizerte Nord",  gouvernoratOrigine: "Jendouba",  villeOrigine: "Tabarka",       niveauEtudes: "Licence",          specialite: "Mécanique",       etablissement: "FST Bizerte", posteVise: "Opérateur câblage",    missionId: "M004", statut: "Nouveau",    notes: "Bonne présentation" },
  { id: 4, nomComplet: "Salma Trabelsi",   cin: "05678901", dateNaissance: "2001-07-18", sexe: "Femme",  telephone: "50 789 012", email: "",                          adresse: "Rue 20 Mars",            gouvernoratResidence: "Bizerte", delegation: "Zarzouna",      gouvernoratOrigine: "Béja",      villeOrigine: "Béja Nord",     niveauEtudes: "Baccalauréat",     specialite: "Gestion",         etablissement: "Lycée Bizerte",posteVise: "Agent qualité",        missionId: "M004", statut: "Nouveau",    notes: "" },
  { id: 5, nomComplet: "Omar Jebali",      cin: "04789012", dateNaissance: "1996-11-30", sexe: "Homme",  telephone: "92 890 123", email: "omar.jebali@gmail.com",     adresse: "Cité Jardins",           gouvernoratResidence: "Tunis",   delegation: "El Menzah",     gouvernoratOrigine: "Sousse",    villeOrigine: "Msaken",        niveauEtudes: "Ingénieur",        specialite: "Génie industriel",etablissement: "ENIT Tunis",  posteVise: "Technicien maintenance",missionId:"M001",  statut: "Réintégré", notes: "Expérience 2 ans" },
];

export function RecrutementsProvider({ children }) {
  const [entries,    setEntries]    = useState(initialEntries);
  const [candidats,  setCandidats]  = useState(initialCandidats);
  const [nextEId,    setNextEId]    = useState(3);
  const [nextCId,    setNextCId]    = useState(6);

  // ── Daily entry CRUD ────────────────────────────────────────────────────────
  const addEntry = (entry) => {
    const newEntry = { ...entry, id: nextEId };
    setEntries(prev => [...prev, newEntry]);
    setNextEId(n => n + 1);
    return newEntry;
  };
  const addCandidatToEntry = (entryId, candidat) =>
    setEntries(prev => prev.map(e => e.id===entryId ? { ...e, candidats:[...e.candidats,candidat] } : e));
  const removeCandidatFromEntry = (entryId, index) =>
    setEntries(prev => prev.map(e => e.id===entryId ? { ...e, candidats:e.candidats.filter((_,i)=>i!==index) } : e));
  const deleteEntry = (entryId) =>
    setEntries(prev => prev.filter(e => e.id !== entryId));

  // ── Candidats full CRUD ─────────────────────────────────────────────────────
  const addCandidat = (form) => {
    const c = { ...form, id: nextCId };
    setCandidats(prev => [...prev, c]);
    setNextCId(n => n + 1);
  };
  const updateCandidat = (updated) =>
    setCandidats(prev => prev.map(c => c.id===updated.id ? updated : c));
  const deleteCandidat = (id) =>
    setCandidats(prev => prev.filter(c => c.id !== id));

  // ── Stats ───────────────────────────────────────────────────────────────────
  const todayStr     = fmt(today);
  const todayEntries = entries.filter(e => e.date === todayStr);
  const todayCount   = todayEntries.reduce((s,e)=>s+e.candidats.length, 0);
  const byDate       = entries.reduce((acc, e) => { acc[e.date]=(acc[e.date]||0)+e.candidats.length; return acc; }, {});

  return (
    <RecrutementsContext.Provider value={{
      entries, addEntry, addCandidatToEntry, removeCandidatFromEntry, deleteEntry,
      candidats, addCandidat, updateCandidat, deleteCandidat,
      todayStr, todayCount, todayEntries, byDate,
      postes: ["Opérateur câblage","Technicien contrôle","Agent qualité","Agent logistique","Technicien maintenance","Opérateur production"],
    }}>
      {children}
    </RecrutementsContext.Provider>
  );
}

export const useRecrutements = () => useContext(RecrutementsContext);