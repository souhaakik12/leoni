export const TYPE_CONTRAT_CDI = "CDI";
export const TYPE_CONTRAT_CDI_SANS_ESSAI = "CDI SANS ESSAI";
export const TYPE_CONTRAT_CAIP = "CAIP";
export const TYPE_CONTRAT_CIVP = "CIVP";
export const TYPE_CONTRAT_SIVP = "SIVP";

const TYPE_CONTRAT_CANONICAL_MAP = {
  cdi: TYPE_CONTRAT_CDI,
  "cdi sans essai": TYPE_CONTRAT_CDI_SANS_ESSAI,
  caip: TYPE_CONTRAT_CAIP,
  civp: TYPE_CONTRAT_CIVP,
  sivp: TYPE_CONTRAT_SIVP,
};

export const TYPE_CONTRAT_OPTIONS = [
  TYPE_CONTRAT_CDI,
  TYPE_CONTRAT_CDI_SANS_ESSAI,
  TYPE_CONTRAT_CAIP,
  TYPE_CONTRAT_CIVP,
  TYPE_CONTRAT_SIVP,
];

export const TYPE_CANDIDAT_CONTRACT_SESSION = "contract_session_pending";
export const TYPE_CANDIDAT_DOSSIER_CONTRACT = "contract_dossier_pending";
export const TYPE_CANDIDAT_CONTRACT_SIGNED = "contract_signed";
export const TYPE_CANDIDAT_CONTACT_CONTRACT_LEGACY = "contact_contract";

export const STATUS_SEANCE_CONTRAT = "SEANCE_CONTRAT";
export const STATUS_DOSSIER_CONTRAT = "DOSSIER_CONTRAT";
export const STATUS_ATTENTE_SEANCE_CONTRAT = "En attente seance contrat";
export const STATUS_EN_ATTENTE_DOSSIER = "En attente dossier";
export const STATUS_CONTRAT_SIGNE = "Contrat signe";
export const STATUS_CONTRAT_FINALISE = "CONTRAT_FINALISE";
export const STATUS_SEANCE_EN_COURS = "en_cours";
export const STATUS_SEANCE_TERMINEE = "terminee";

export const SIGNATURE_SUR_PLACE = "Sur place";
export const SIGNATURE_MAIRIE = "Mairie";
export const SIGNATURE_OPTIONS = [SIGNATURE_SUR_PLACE, SIGNATURE_MAIRIE];

export function normalizeContractType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return TYPE_CONTRAT_CANONICAL_MAP[normalized] || "";
}

export function isContractType(value) {
  return Boolean(normalizeContractType(value));
}

export function isSessionStatus(value) {
  return value === STATUS_SEANCE_EN_COURS || value === STATUS_SEANCE_TERMINEE;
}

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isSeanceContractStatus(value) {
  const normalized = normalizeStatus(value);
  return (
    normalized === normalizeStatus(STATUS_ATTENTE_SEANCE_CONTRAT) ||
    normalized === normalizeStatus(STATUS_SEANCE_CONTRAT) ||
    normalized === "en_attente_seance"
  );
}

export function isDossierContractStatus(value) {
  const normalized = normalizeStatus(value);
  return (
    normalized === normalizeStatus(STATUS_EN_ATTENTE_DOSSIER) ||
    normalized === normalizeStatus(STATUS_DOSSIER_CONTRAT) ||
    normalized === "en_attente_dossier"
  );
}

export function isSignedContractStatus(value) {
  const normalized = normalizeStatus(value);
  return (
    normalized === normalizeStatus(STATUS_CONTRAT_SIGNE) ||
    normalized === "contrat_signe" ||
    normalized === normalizeStatus(STATUS_CONTRAT_FINALISE) ||
    normalized === "contrat_finalise"
  );
}

export function normalizeContractCandidateStatus(value) {
  if (isSeanceContractStatus(value)) return STATUS_ATTENTE_SEANCE_CONTRAT;
  if (isDossierContractStatus(value)) return STATUS_EN_ATTENTE_DOSSIER;
  if (normalizeStatus(value) === normalizeStatus(STATUS_CONTRAT_FINALISE) || normalizeStatus(value) === "contrat_finalise") {
    return STATUS_CONTRAT_FINALISE;
  }
  if (isSignedContractStatus(value)) return STATUS_CONTRAT_SIGNE;
  return value;
}

export function isSignedContractCandidate(candidate) {
  if (!candidate) return false;
  return (
    isSignedContractStatus(candidate.statut) ||
    candidate.typeCandidat === TYPE_CANDIDAT_CONTRACT_SIGNED ||
    (candidate.typeCandidat === TYPE_CANDIDAT_CONTACT_CONTRACT_LEGACY && Boolean(candidate.contratSigne))
  );
}
