const crypto = require("crypto");
const nodemailer = require("nodemailer");
const {
    ROLE_ADMIN,
    ROLE_RECRUTEUR,
    ROLE_RESPONSABLE_CONTRAT,
    normalizeRole,
} = require("../middleware/roleMiddleware");
const utilisateurModel = require("../models/utilisateurModel");

const ALLOWED_ROLES = [ROLE_ADMIN, ROLE_RECRUTEUR, ROLE_RESPONSABLE_CONTRAT];
const INVITE_EXPIRATION_HOURS = 72;

function readTrimmed(body, ...keys) {
    for (const key of keys) {
        const value = body?.[key];
        if (typeof value === "string" || typeof value === "number") {
            return String(value).trim();
        }
    }

    return "";
}

function readEmail(body, ...keys) {
    return readTrimmed(body, ...keys).toLowerCase();
}

function parseAccesFoyer(value) {
    if (value === 0 || value === 1) return value;
    if (value === "0" || value === "1") return Number(value);
    if (typeof value === "boolean") return value ? 1 : 0;
    return null;
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

function isInviteExpired(utilisateur) {
    if (!utilisateur?.InviteTokenExpire) return true;
    return new Date(utilisateur.InviteTokenExpire).getTime() < Date.now();
}

function buildInviteLink(token) {
    const frontendUrl = String(process.env.FRONTEND_URL || "").trim().replace(/\/+$/, "");

    if (!frontendUrl) {
        throw new Error("FRONTEND_URL manquant.");
    }

    return `${frontendUrl}/setup-account?token=${encodeURIComponent(token)}`;
}

async function sendInviteEmail({ email, fullName, inviteLink }) {
    const host = String(process.env.MAIL_HOST || "").trim();
    const port = Number(process.env.MAIL_PORT || 0);
    const user = String(process.env.MAIL_USER || "").trim();
    const pass = String(process.env.MAIL_PASS || "").trim();
    const from = process.env.MAIL_FROM || `"LEONI RH" <${process.env.MAIL_USER}>`;

    if (!host || !port || !user || !pass) {
        throw new Error("Configuration email incomplete.");
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass,
        },
    });

    await transporter.sendMail({
        from,
        to: email,
        subject: "Bienvenue sur LEONI RH \u2014 Cr\u00e9ez votre mot de passe",
        text: [
            `Bonjour ${fullName},`,
            "",
            "Votre compte a \u00e9t\u00e9 cr\u00e9\u00e9 sur la plateforme LEONI RH.",
            "Veuillez cliquer sur le lien ci-dessous pour cr\u00e9er votre mot de passe et activer votre compte.",
            "",
            inviteLink,
            "",
            "Ce lien est \u00e0 usage unique.",
            "",
            "Cordialement,",
            "LEONI RH",
        ].join("\n"),
    });
}

exports.listUtilisateurs = async (req, res) => {
    try {
        const search = readTrimmed(req.query, "search", "q");
        const users = await utilisateurModel.findAll(search);

        return res.json({
            success: true,
            users: users.map(sanitizeUser),
        });
    } catch (error) {
        console.error("Erreur GET /api/utilisateurs :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de charger les utilisateurs.",
        });
    }
};

exports.createUtilisateur = async (req, res) => {
    try {
        const NomComplet = readTrimmed(req.body, "NomComplet", "nomComplet");
        const Email = readEmail(req.body, "Email", "email");
        const Role = resolveRole(req.body?.Role ?? req.body?.role);
        const AccesFoyer = parseAccesFoyer(req.body?.AccesFoyer ?? req.body?.accesFoyer);

        if (!NomComplet || !Email || !Role) {
            return res.status(400).json({
                success: false,
                message: "Nom complet, email et role sont obligatoires.",
            });
        }

        if (AccesFoyer !== 0 && AccesFoyer !== 1) {
            return res.status(400).json({
                success: false,
                message: "Acces foyer invalide.",
            });
        }

        const existingUser = await utilisateurModel.findByEmail(Email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Un utilisateur avec cet email existe deja.",
            });
        }

        const InviteToken = crypto.randomBytes(32).toString("hex");
        const InviteTokenExpire = new Date(Date.now() + INVITE_EXPIRATION_HOURS * 60 * 60 * 1000);

        await utilisateurModel.createWithInvite({
            NomComplet,
            Email,
            Role,
            AccesFoyer,
            InviteToken,
            InviteTokenExpire,
        });

        let emailSent = false;

        try {
            const inviteLink = buildInviteLink(InviteToken);
            await sendInviteEmail({
                email: Email,
                fullName: NomComplet,
                inviteLink,
            });
            emailSent = true;
        } catch (emailError) {
            console.warn("Email d'activation non envoye :", emailError.message);
        }

        return res.status(201).json({
            success: true,
            message: emailSent
                ? "Utilisateur cree avec succes. Un email d'activation a ete envoye."
                : "Utilisateur cree, mais l'email d'activation n'a pas pu etre envoye.",
        });
    } catch (error) {
        console.error("Erreur POST /api/utilisateurs :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de creer l'utilisateur.",
        });
    }
};

exports.updateUtilisateur = async (req, res) => {
    try {
        const id = Number(req.params?.id);
        const NomComplet = readTrimmed(req.body, "NomComplet", "nomComplet");
        const Email = readEmail(req.body, "Email", "email");
        const Role = resolveRole(req.body?.Role ?? req.body?.role);
        const AccesFoyer = parseAccesFoyer(req.body?.AccesFoyer ?? req.body?.accesFoyer);

        if (!Number.isInteger(id) || id <= 0 || !NomComplet || !Email || !Role) {
            return res.status(400).json({
                success: false,
                message: "Donnees utilisateur invalides.",
            });
        }

        if (AccesFoyer !== 0 && AccesFoyer !== 1) {
            return res.status(400).json({
                success: false,
                message: "Acces foyer invalide.",
            });
        }

        const existingUser = await utilisateurModel.findByEmailExceptId(Email, id);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Un utilisateur avec cet email existe deja.",
            });
        }

        const user = await utilisateurModel.updateUtilisateur(id, {
            NomComplet,
            Email,
            Role,
            AccesFoyer,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }

        return res.json({
            success: true,
            message: "Utilisateur modifie avec succes.",
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error("Erreur PUT /api/utilisateurs/:id :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de modifier l'utilisateur.",
        });
    }
};

exports.deactivateUtilisateur = async (req, res) => {
    try {
        const id = Number(req.params?.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Identifiant utilisateur invalide.",
            });
        }

        const user = await utilisateurModel.deactivateUtilisateur(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }

        return res.json({
            success: true,
            message: "Utilisateur desactive avec succes.",
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error("Erreur DELETE /api/utilisateurs/:id :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de desactiver l'utilisateur.",
        });
    }
};

exports.getInviteByToken = async (req, res) => {
    try {
        const token = readTrimmed(req.params, "token");
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Lien invalide ou expire.",
            });
        }

        const utilisateur = await utilisateurModel.findByInviteToken(token);
        if (!utilisateur || Number(utilisateur.Actif) === 1 || isInviteExpired(utilisateur)) {
            return res.status(400).json({
                success: false,
                message: "Lien invalide ou expire.",
            });
        }

        return res.json({
            success: true,
            user: {
                NomComplet: utilisateur.NomComplet,
                Email: utilisateur.Email,
            },
        });
    } catch (error) {
        console.error("Erreur GET /api/utilisateurs/invite/:token :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible de verifier le lien d'invitation.",
        });
    }
};

exports.setupAccount = async (req, res) => {
    try {
        const token = readTrimmed(req.params, "token");
        const password = readTrimmed(req.body, "password", "Password", "MotDePasse");

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Mot de passe obligatoire.",
            });
        }

        const utilisateur = await utilisateurModel.findByInviteToken(token);
        if (!utilisateur || Number(utilisateur.Actif) === 1 || isInviteExpired(utilisateur)) {
            return res.status(400).json({
                success: false,
                message: "Lien invalide ou expire.",
            });
        }

        const activatedUser = await utilisateurModel.activateAccountWithPassword(token, password);
        if (!activatedUser) {
            return res.status(400).json({
                success: false,
                message: "Lien invalide ou expire.",
            });
        }

        return res.json({
            success: true,
            message: "Compte active avec succes.",
        });
    } catch (error) {
        console.error("Erreur POST /api/utilisateurs/invite/:token/setup :", error);
        return res.status(500).json({
            success: false,
            message: "Impossible d'activer le compte.",
        });
    }
};

exports.getUsers = exports.listUtilisateurs;
exports.createUser = exports.createUtilisateur;
exports.updateUser = exports.updateUtilisateur;
exports.deleteUser = exports.deactivateUtilisateur;
