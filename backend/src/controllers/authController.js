const crypto = require("crypto");
const nodemailer = require("nodemailer");
const utilisateurModel = require("../models/utilisateurModel");
const { validatePassword } = require("../utils/passwordValidation");

const RESET_EXPIRATION_HOURS = 2;
const GENERIC_FORGOT_PASSWORD_MESSAGE = "Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.";

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

function buildResetLink(token) {
    const frontendUrl = String(process.env.FRONTEND_URL || "").trim().replace(/\/+$/, "");

    if (!frontendUrl) {
        throw new Error("FRONTEND_URL manquant.");
    }

    return `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendResetPasswordEmail({ email, fullName, resetLink }) {
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
        subject: "Réinitialisation de votre mot de passe LEONI RH",
        text: [
            `Bonjour ${fullName},`,
            "",
            "Vous avez demande la reinitialisation de votre mot de passe.",
            "",
            "Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :",
            "",
            resetLink,
            "",
            "Ce lien est valable pendant 2 heures.",
            "",
            "Si vous n'avez pas demande cette action, ignorez cet email.",
            "",
            "Cordialement,",
            "LEONI RH",
        ].join("\n"),
    });
}

function isResetTokenExpired(utilisateur) {
    if (!utilisateur?.ResetTokenExpire) return true;
    return new Date(utilisateur.ResetTokenExpire).getTime() < Date.now();
}

function readInteger(body, ...keys) {
    for (const key of keys) {
        const value = body?.[key];
        if (value === undefined || value === null || value === "") {
            continue;
        }

        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return null;
}

exports.login = async (req, res) => {
    try {
        const email = readTrimmed(req.body, "email", "Email");
        const password = readTrimmed(req.body, "password", "Password", "MotDePasse");

        if (!email || !password) {
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect",
            });
        }

        const utilisateur = await utilisateurModel.findActiveByEmail(email);

        if (!utilisateur || utilisateur.MotDePasse !== password) {
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect",
            });
        }

        return res.json({
            success: true,
            user: {
                Id: utilisateur.Id,
                NomComplet: utilisateur.NomComplet,
                Email: utilisateur.Email,
                Role: utilisateur.Role,
                AccesFoyer: utilisateur.AccesFoyer,
            },
        });
    } catch (error) {
        console.error("Erreur POST /api/auth/login :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la connexion",
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const id = readInteger(req.body, "id", "Id");
        const nom = readTrimmed(req.body, "NomComplet", "nom", "Nom");
        const email = readTrimmed(req.body, "Email", "email", "newEmail", "NewEmail");

        if (!id || !email || !nom) {
            return res.status(400).json({
                success: false,
                message: "Nom complet et adresse e-mail sont obligatoires.",
            });
        }

        const utilisateur = await utilisateurModel.findActiveById(id);
        if (!utilisateur) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }

        const existingEmail = await utilisateurModel.findByEmailExceptId(email, id);
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Cette adresse e-mail est deja utilisee.",
            });
        }

        const updatedUser = await utilisateurModel.updateProfileById(id, {
            NomComplet: nom,
            Email: email,
        });

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }

        return res.json({
            success: true,
            message: "Profil mis a jour avec succes.",
            user: {
                Id: updatedUser.Id,
                NomComplet: updatedUser.NomComplet,
                Email: updatedUser.Email,
                Role: updatedUser.Role,
                Actif: updatedUser.Actif,
                AccesFoyer: updatedUser.AccesFoyer,
            },
        });
    } catch (error) {
        console.error("Erreur PUT /api/auth/profile :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise a jour du profil.",
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const id = readInteger(req.body, "id", "Id");
        const email = readTrimmed(req.body, "email", "Email");
        const currentPassword = readTrimmed(req.body, "currentPassword", "CurrentPassword");
        const newPassword = readTrimmed(req.body, "newPassword", "NewPassword");

        if (!id || !email || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Tous les champs sont obligatoires.",
            });
        }

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message,
            });
        }

        const utilisateur = await utilisateurModel.findActiveById(id);
        if (!utilisateur || utilisateur.Email?.toLowerCase() !== email.toLowerCase()) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }

        if (utilisateur.MotDePasse !== currentPassword) {
            return res.status(401).json({
                success: false,
                message: "Mot de passe actuel incorrect.",
            });
        }

        const updatedUser = await utilisateurModel.updatePasswordById(id, newPassword);
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }

        return res.json({
            success: true,
            message: "Mot de passe modifie avec succes.",
        });
    } catch (error) {
        console.error("Erreur POST /api/auth/change-password :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du changement de mot de passe.",
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const email = readEmail(req.body, "email", "Email");

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Adresse e-mail obligatoire.",
            });
        }

        const utilisateur = await utilisateurModel.findActiveByEmail(email);

        if (!utilisateur) {
            return res.json({
                success: true,
                message: GENERIC_FORGOT_PASSWORD_MESSAGE,
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpire = new Date(Date.now() + RESET_EXPIRATION_HOURS * 60 * 60 * 1000);

        await utilisateurModel.setResetTokenById(utilisateur.Id, resetToken, resetTokenExpire);

        const resetLink = buildResetLink(resetToken);
        await sendResetPasswordEmail({
            email: utilisateur.Email,
            fullName: utilisateur.NomComplet,
            resetLink,
        });

        return res.json({
            success: true,
            message: GENERIC_FORGOT_PASSWORD_MESSAGE,
        });
    } catch (error) {
        console.error("Erreur POST /api/auth/forgot-password :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'envoi du lien de reinitialisation.",
        });
    }
};

exports.validateResetPasswordToken = async (req, res) => {
    try {
        const token = readTrimmed(req.params, "token");

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Lien de reinitialisation invalide ou expire.",
            });
        }

        const utilisateur = await utilisateurModel.findByResetToken(token);
        if (!utilisateur || isResetTokenExpired(utilisateur)) {
            return res.status(400).json({
                success: false,
                message: "Lien de reinitialisation invalide ou expire.",
            });
        }

        return res.json({
            success: true,
            message: "Token valide.",
        });
    } catch (error) {
        console.error("Erreur GET /api/auth/reset-password/:token :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la verification du token.",
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const token = readTrimmed(req.params, "token");
        const password = readTrimmed(req.body, "password", "Password", "MotDePasse");

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token de reinitialisation obligatoire.",
            });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message,
            });
        }

        const utilisateur = await utilisateurModel.findByResetToken(token);
        if (!utilisateur || isResetTokenExpired(utilisateur)) {
            return res.status(400).json({
                success: false,
                message: "Lien de reinitialisation invalide ou expire.",
            });
        }

        const updatedUser = await utilisateurModel.resetPasswordByToken(token, password);
        if (!updatedUser) {
            return res.status(400).json({
                success: false,
                message: "Lien de reinitialisation invalide ou expire.",
            });
        }

        return res.json({
            success: true,
            message: "Mot de passe reinitialise avec succes.",
        });
    } catch (error) {
        console.error("Erreur POST /api/auth/reset-password/:token :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la reinitialisation du mot de passe.",
        });
    }
};
