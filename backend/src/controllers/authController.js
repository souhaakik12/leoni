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

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Le nouveau mot de passe doit contenir au moins 8 caracteres.",
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
