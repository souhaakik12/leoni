const utilisateurModel = require("../models/utilisateurModel");

function readTrimmed(body, ...keys) {
    for (const key of keys) {
        const value = body?.[key];
        if (typeof value === "string" || typeof value === "number") {
            return String(value).trim();
        }
    }

    return "";
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
        const email = readTrimmed(req.body, "email", "Email");
        const nom = readTrimmed(req.body, "nom", "Nom", "NomComplet");
        const newEmail = readTrimmed(req.body, "newEmail", "NewEmail", "emailNouveau");

        if (!email || !nom || !newEmail) {
            return res.status(400).json({
                success: false,
                message: "Nom complet et adresse e-mail sont obligatoires.",
            });
        }

        const utilisateur = await utilisateurModel.findActiveByEmail(email);
        if (!utilisateur) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable.",
            });
        }

        if (newEmail !== email) {
            const existingEmail = await utilisateurModel.findByEmail(newEmail);
            if (existingEmail && existingEmail.Id !== utilisateur.Id) {
                return res.status(409).json({
                    success: false,
                    message: "Cette adresse e-mail est deja utilisee.",
                });
            }
        }

        const updatedUser = await utilisateurModel.updateProfileByEmail(email, {
            NomComplet: nom,
            NewEmail: newEmail,
        });

        return res.json({
            success: true,
            message: "Profil mis a jour avec succes.",
            user: {
                Id: updatedUser.Id,
                NomComplet: updatedUser.NomComplet,
                Email: updatedUser.Email,
                Role: updatedUser.Role,
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
        const email = readTrimmed(req.body, "email", "Email");
        const currentPassword = readTrimmed(req.body, "currentPassword", "CurrentPassword");
        const newPassword = readTrimmed(req.body, "newPassword", "NewPassword");

        if (!email || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Tous les champs sont obligatoires.",
            });
        }

        const utilisateur = await utilisateurModel.findActiveByEmail(email);
        if (!utilisateur || utilisateur.MotDePasse !== currentPassword) {
            return res.status(401).json({
                success: false,
                message: "Mot de passe actuel incorrect.",
            });
        }

        await utilisateurModel.updatePasswordByEmail(email, newPassword);

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
