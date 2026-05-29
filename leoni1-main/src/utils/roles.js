export const ROLE_ADMIN = "admin";
export const ROLE_RECRUTEUR = "recruteur";
export const ROLE_RESPONSABLE_CONTRAT = "contrats";

const ROLE_ALIASES = {
  [ROLE_ADMIN]: ROLE_ADMIN,
  [ROLE_RECRUTEUR]: ROLE_RECRUTEUR,
  [ROLE_RESPONSABLE_CONTRAT]: ROLE_RESPONSABLE_CONTRAT,
  responsable_contrat: ROLE_RESPONSABLE_CONTRAT,
};

export const CONTRACT_ACCESS_ROLES = [ROLE_RESPONSABLE_CONTRAT];

export function normalizeRole(role) {
  const normalizedRole = String(role ?? "").trim().toLowerCase();
  return ROLE_ALIASES[normalizedRole] || normalizedRole;
}

export function hasRole(userOrRole, allowedRoles = []) {
  const currentRole = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  const normalizedCurrentRole = normalizeRole(currentRole);

  return allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === normalizedCurrentRole);
}

export function hasFoyerAccess(user) {
  const accesFoyer = user?.AccesFoyer ?? user?.accesFoyer;
  const normalizedRole = normalizeRole(user?.role);

  if (normalizedRole === ROLE_RECRUTEUR) return Number(accesFoyer ?? 0) === 1;
  if (normalizedRole === ROLE_RESPONSABLE_CONTRAT) return Number(accesFoyer ?? 0) === 1;

  return false;
}

export function getHomeRouteForRole(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLE_ADMIN) return "/admin/dashboards";
  if (normalizedRole === ROLE_RECRUTEUR) return "/missions";
  if (normalizedRole === ROLE_RESPONSABLE_CONTRAT) return "/contracts/reception";
  return "/login";
}

export function buildRoleHeaders(user, headers = {}) {
  const normalizedRole = normalizeRole(user?.role);
  const rawUserId = user?.id ?? user?.Id ?? null;
  const normalizedUserId =
    rawUserId !== null && rawUserId !== undefined && String(rawUserId).trim() !== ""
      ? String(rawUserId).trim()
      : null;
  const userName = String(
    user?.nom || user?.name || user?.NomComplet || user?.nomComplet || ""
  ).trim();

  if (!normalizedRole && !normalizedUserId && !userName) return { ...headers };

  return {
    ...headers,
    ...(normalizedRole ? { "x-user-role": normalizedRole } : {}),
    ...(normalizedUserId ? { "x-user-id": normalizedUserId } : {}),
    ...(userName ? { "x-user-name": userName } : {}),
  };
}
