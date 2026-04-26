const {
    ROLE_ADMIN,
    ROLE_RECRUTEUR,
    ROLE_RESPONSABLE_CONTRAT,
    normalizeRole,
} = require("../middleware/roleMiddleware");
const utilisateurModel = require("../models/utilisateurModel");

const ALLOWED_ROLES = [ROLE_ADMIN, ROLE_RECRUTEUR, ROLE_RESPONSABLE_CONTRAT];

function readTrimmed(body, ...keys) {
    for (const key of keys) {
        const value = body?.[key];
        if (typeof value === "string" || typeof value === "number") {
            return String(value).trim();
        }
    }

    return "";
}

function isTruthyBit(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const normalized = String(value ?? "").trim().toLowerCase();
    return ["1", "true", "oui", "yes"].includes(normalized);
}

function resolveRole(role) {
    const normalizedRole = normalizeRole(role);
    return ALLOWED_ROLES.includes(normalizedRole) ? normalizedRole : null;
}

function sanitizeUser(utilisateur) {
    if (!utilisateur) return null;

    return {
        Id: utilisateur.Id,
        NomComplet: utilisateur.NomComplet,
        Email: utilisateur.Email,
        Role: utilisateur.Role,
        Actif: utilisateur.Actif,
        CreeLe: utilisateur.CreeLe,
        AccesFoyer: utilisateur.AccesFoyer,
    };
}

exports.getUsers = async (req, res) => {
    try {
        const search = readTrimmed(req.query, "search", "q");
        const users = await utilisateurModel.listUsers(search);

        return res.json({
            success: true,
            users: users.map(sanitizeUser),
        });
    } catch (error) {
        console.error("Erreur GET /api/utilisateurs :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de charger les utilisateurs",
        });
    }
};

exports.createUser = async (req, res) => {
    try {
        const NomComplet = readTrimmed(req.body, "NomComplet", "nomComplet");
        const Email = readTrimmed(req.body, "Email", "email");
        const MotDePasse = readTrimmed(req.body, "MotDePasse", "motDePasse", "password");
        const Role = resolveRole(req.body?.Role ?? req.body?.role);
        const AccesFoyer = isTruthyBit(req.body?.AccesFoyer ?? req.body?.accesFoyer) ? 1 : 0;

        if (!NomComplet || !Email || !MotDePasse || !Role) {
            return res.status(400).json({
                success: false,
                message: "Nom complet, email, mot de passe et role sont obligatoires",
            });
        }

        const existingUser = await utilisateurModel.findByEmail(Email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Un utilisateur avec cet email existe deja",
            });
        }

        const user = await utilisateurModel.createUser({
            NomComplet,
            Email,
            MotDePasse,
            Role,
            AccesFoyer,
        });

        return res.status(201).json({
            success: true,
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error("Erreur POST /api/utilisateurs :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible d'ajouter l'utilisateur",
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const id = Number(req.params?.id);
        const NomComplet = readTrimmed(req.body, "NomComplet", "nomComplet");
        const Email = readTrimmed(req.body, "Email", "email");
        const MotDePasse = readTrimmed(req.body, "MotDePasse", "motDePasse", "password");
        const Role = resolveRole(req.body?.Role ?? req.body?.role);
        const AccesFoyer = isTruthyBit(req.body?.AccesFoyer ?? req.body?.accesFoyer) ? 1 : 0;

        if (!Number.isInteger(id) || id <= 0 || !NomComplet || !Email || !Role) {
            return res.status(400).json({
                success: false,
                message: "Donnees utilisateur invalides",
            });
        }

        const existingUser = await utilisateurModel.findByEmailExceptId(Email, id);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Un utilisateur avec cet email existe deja",
            });
        }

        const user = await utilisateurModel.updateUser(id, {
            NomComplet,
            Email,
            MotDePasse,
            Role,
            AccesFoyer,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable",
            });
        }

        return res.json({
            success: true,
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error("Erreur PUT /api/utilisateurs/:id :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de modifier l'utilisateur",
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const id = Number(req.params?.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide",
            });
        }

        const user = await utilisateurModel.deactivateUser(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable",
            });
        }

        return res.json({
            success: true,
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error("Erreur DELETE /api/utilisateurs/:id :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de desactiver l'utilisateur",
        });
    }
};
