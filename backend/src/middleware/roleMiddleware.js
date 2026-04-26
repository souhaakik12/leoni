const ROLE_ADMIN = "admin";
const ROLE_RECRUTEUR = "recruteur";
const ROLE_RESPONSABLE_CONTRAT = "contrats";

const ROLE_ALIASES = {
    [ROLE_ADMIN]: ROLE_ADMIN,
    [ROLE_RECRUTEUR]: ROLE_RECRUTEUR,
    [ROLE_RESPONSABLE_CONTRAT]: ROLE_RESPONSABLE_CONTRAT,
    responsable_contrat: ROLE_RESPONSABLE_CONTRAT,
};

const CONTRACT_ALLOWED_ROLES = [ROLE_ADMIN, ROLE_RESPONSABLE_CONTRAT];

function normalizeRole(role) {
    const normalizedRole = String(role ?? "").trim().toLowerCase();
    return ROLE_ALIASES[normalizedRole] || normalizedRole;
}

function attachRequestUser(req, _res, next) {
    const headerRole = req.headers["x-user-role"];
    const resolvedRole = normalizeRole(req.user?.role || headerRole);

    if (resolvedRole) {
        req.user = {
            ...(req.user || {}),
            role: resolvedRole,
        };
    }

    next();
}

function requireRole(allowedRoles = []) {
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole).filter(Boolean);

    return (req, res, next) => {
        const userRole = normalizeRole(req.user?.role);

        if (!userRole) {
            return res.status(401).json({ message: "Authentification requise." });
        }

        if (!normalizedAllowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Acces refuse pour ce role." });
        }

        next();
    };
}

module.exports = {
    ROLE_ADMIN,
    ROLE_RECRUTEUR,
    ROLE_RESPONSABLE_CONTRAT,
    CONTRACT_ALLOWED_ROLES,
    normalizeRole,
    attachRequestUser,
    requireRole,
};
