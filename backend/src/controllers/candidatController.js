const sql = require("mssql");
const config = require("../../config");
const candidatModel = require("../models/candidatModel");
const ALLOWED_GENRES = ["Femme", "Homme"];
function readTrimmed(body, ...keys) {
    for (const key of keys) {
        const value = body?.[key];
        if (typeof value === "string" || typeof value === "number") {
            return String(value).trim();
        }
    }

    return "";
}

function getDuplicateCinMessage() {
    return "Ce CIN existe d\u00e9j\u00e0. Le candidat est d\u00e9j\u00e0 enregistr\u00e9.";
}

function isDuplicateCinError(err) {
    const errorNumber = Number(err?.originalError?.info?.number || err?.number || 0);
    return errorNumber === 2601 || errorNumber === 2627;
}

function readActionUser(body, requestUser) {
    return {
        utilisateur_id: body?.utilisateur_id ?? requestUser?.id ?? null,
        utilisateur_nom:
            body?.utilisateur_nom ??
            requestUser?.nom ??
            requestUser?.name ??
            requestUser?.fullName ??
            requestUser?.username ??
            requestUser?.nomComplet ??
            requestUser?.email ??
            "",
        utilisateur_role: body?.utilisateur_role ?? requestUser?.role ?? "",
    };
}

exports.listerCandidats = async (_req, res) => {
    try {
        const pool = await sql.connect(config);
        const meta = await pool.request().query(`
            SELECT
                CASE WHEN OBJECT_ID('dbo.candidats', 'U') IS NULL THEN 0 ELSE 1 END AS has_table,
                CASE WHEN COL_LENGTH('dbo.candidats', 'canal') IS NULL THEN 0 ELSE 1 END AS has_canal,
                CASE WHEN COL_LENGTH('dbo.candidats', 'type_candidature') IS NULL THEN 0 ELSE 1 END AS has_type_candidature,
                CASE WHEN COL_LENGTH('dbo.candidats', 'etape') IS NULL THEN 0 ELSE 1 END AS has_etape,
                CASE WHEN COL_LENGTH('dbo.candidats', 'statut') IS NULL THEN 0 ELSE 1 END AS has_statut,
                CASE WHEN COL_LENGTH('dbo.candidats', 'age') IS NULL THEN 0 ELSE 1 END AS has_age,
                CASE WHEN COL_LENGTH('dbo.candidats', 'niveau_scolaire') IS NULL THEN 0 ELSE 1 END AS has_niveau_scolaire,
                CASE WHEN COL_LENGTH('dbo.candidats', 'adresse') IS NULL THEN 0 ELSE 1 END AS has_adresse,
                CASE WHEN COL_LENGTH('dbo.candidats', 'contrat_signe') IS NULL THEN 0 ELSE 1 END AS has_contrat_signe,
                CASE WHEN COL_LENGTH('dbo.candidats', 'dossier_valide') IS NULL THEN 0 ELSE 1 END AS has_dossier_valide,
                CASE WHEN COL_LENGTH('dbo.candidats', 'date_signature') IS NULL THEN 0 ELSE 1 END AS has_date_signature,
                CASE WHEN COL_LENGTH('dbo.candidats', 'type_contrat') IS NULL THEN 0 ELSE 1 END AS has_type_contrat,
                CASE WHEN COL_LENGTH('dbo.candidats', 'statut_contrat') IS NULL THEN 0 ELSE 1 END AS has_statut_contrat,
                CASE WHEN COL_LENGTH('dbo.candidats', 'statut_dossier') IS NULL THEN 0 ELSE 1 END AS has_statut_dossier,
                CASE WHEN COL_LENGTH('dbo.candidats', 'situation_familiale') IS NULL THEN 0 ELSE 1 END AS has_situation_familiale;
        `);

        const metadata = meta.recordset?.[0] || {};
        const hasTable = Boolean(metadata.has_table);

        if (!hasTable) {
            return res.json([]);
        }

        const query = `
            SELECT
                id,
                nom,
                cin,
                telephone,
                poste,
                ${metadata.has_canal ? "canal" : "CAST(NULL AS VARCHAR(50)) AS canal"},
                ${metadata.has_type_candidature ? "type_candidature" : "CAST(NULL AS VARCHAR(50)) AS type_candidature"},
                ${metadata.has_etape ? "etape" : "CAST(NULL AS VARCHAR(50)) AS etape"},
                ${metadata.has_statut ? "statut" : "CAST(NULL AS VARCHAR(50)) AS statut"},
                ${metadata.has_age ? "age" : "CAST(NULL AS INT) AS age"},
                ${metadata.has_niveau_scolaire ? "niveau_scolaire" : "CAST(NULL AS VARCHAR(255)) AS niveau_scolaire"},
                ${metadata.has_adresse ? "adresse" : "CAST(NULL AS VARCHAR(255)) AS adresse"},
                ${metadata.has_contrat_signe ? "contrat_signe" : "CAST(0 AS BIT) AS contrat_signe"},
                ${metadata.has_dossier_valide ? "dossier_valide" : "CAST(0 AS BIT) AS dossier_valide"},
                ${metadata.has_date_signature ? "date_signature" : "CAST(NULL AS DATETIME) AS date_signature"},
                ${metadata.has_type_contrat ? "type_contrat" : "CAST(NULL AS VARCHAR(30)) AS type_contrat"},
                ${metadata.has_statut_contrat ? "statut_contrat" : "CAST(NULL AS VARCHAR(30)) AS statut_contrat"},
                ${metadata.has_statut_dossier ? "statut_dossier" : "CAST(NULL AS VARCHAR(30)) AS statut_dossier"},
                ${metadata.has_situation_familiale ? "situation_familiale" : "CAST(NULL AS VARCHAR(50)) AS situation_familiale"},
                genre
            FROM dbo.candidats
            ORDER BY id DESC;
        `;

        const result = await pool.request().query(query);
        res.json(result.recordset || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Impossible de charger les candidats." });
    }
};

exports.listerMouvements = async (req, res) => {
    try {
        const nouvelleEtape = readTrimmed(req.query, "nouvelle_etape");
        const dateFilter = readTrimmed(req.query, "date");
        const pool = await sql.connect(config);
        const request = pool.request()
            .input("nouvelle_etape", sql.VarChar(50), nouvelleEtape || null)
            .input("date_filter", sql.Date, dateFilter || null);

        const result = await request.query(`
            SELECT TOP 50
                cm.id,
                cm.candidat_id,
                c.nom,
                c.cin,
                cm.ancienne_etape,
                cm.nouvelle_etape,
                cm.action,
                cm.commentaire,
                cm.utilisateur_id,
                cm.utilisateur_nom,
                cm.utilisateur_role,
                cm.created_at
            FROM dbo.candidat_mouvements cm
            INNER JOIN dbo.candidats c ON cm.candidat_id = c.id
            WHERE (@nouvelle_etape IS NULL OR cm.nouvelle_etape = @nouvelle_etape)
              AND (@date_filter IS NULL OR CAST(cm.created_at AS DATE) = @date_filter)
            ORDER BY cm.created_at DESC, cm.id DESC;
        `);

        return res.json({
            success: true,
            mouvements: result.recordset || [],
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Impossible de charger les mouvements candidats." });
    }
};

exports.createCandidat = async (req, res) => {
    try {
        const nom = readTrimmed(req.body, "nom");
        const cin = readTrimmed(req.body, "cin");
        const telephone = readTrimmed(req.body, "telephone");
        const age = readTrimmed(req.body, "age");
        const niveauScolaire = readTrimmed(req.body, "niveau_scolaire", "niveauScolaire", "niveauEtudes");
        const poste = readTrimmed(req.body, "poste");
        const adresse = readTrimmed(req.body, "adresse");
        const genre = readTrimmed(req.body, "genre");

        if (!nom || !cin || !telephone || !age || !niveauScolaire || !poste || !adresse) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires : nom, cin, telephone, age, niveau_scolaire, poste et adresse.",
            });
        }

        if (!genre) {
            return res.status(400).json({ message: "Genre obligatoire." });
        }

        if (!ALLOWED_GENRES.includes(genre)) {
            return res.status(400).json({ message: "Genre invalide" });
        }

        if (!/^\d{8}$/.test(cin)) {
            return res.status(400).json({
                message: "Le CIN doit contenir exactement 8 chiffres.",
            });
        }

        if (!/^\d+$/.test(age)) {
            return res.status(400).json({
                message: "L'age doit etre numerique.",
            });
        }

        const existingCandidat = await candidatModel.findCandidatByCin(cin);
        if (existingCandidat) {
            return res.status(409).json({ message: getDuplicateCinMessage() });
        }

        const candidat = await candidatModel.createCandidat({
            nom,
            cin,
            telephone,
            age: Number(age),
            niveau_scolaire: niveauScolaire,
            poste,
            adresse,
            genre,
        }, req.user);

        return res.status(201).json({
            message: "Candidat ajoute avec succes.",
            candidat,
        });
    } catch (err) {
        if (isDuplicateCinError(err)) {
            return res.status(409).json({ message: getDuplicateCinMessage() });
        }
        console.error(err);
        res.status(500).json({ message: err.message || "Ajout candidat impossible." });
    }
};

exports.ajouterCandidat = exports.createCandidat;

exports.updateCandidat = async (req, res) => {
    try {
        const id = Number(req.params?.id);
        const nom = readTrimmed(req.body, "nom");
        const cin = readTrimmed(req.body, "cin");
        const telephone = readTrimmed(req.body, "telephone");
        const age = readTrimmed(req.body, "age");
        const niveauScolaire = readTrimmed(req.body, "niveau_scolaire", "niveauScolaire", "niveauEtudes");
        const poste = readTrimmed(req.body, "poste");
        const adresse = readTrimmed(req.body, "adresse");
        const genre = readTrimmed(req.body, "genre");

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Identifiant candidat invalide." });
        }

        if (!nom || !cin || !telephone || !age || !genre || !niveauScolaire || !poste || !adresse) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires : nom, cin, telephone, age, genre, niveau_scolaire, poste et adresse.",
            });
        }

        if (!/^\d{8}$/.test(cin)) {
            return res.status(400).json({
                message: "Le CIN doit contenir exactement 8 chiffres.",
            });
        }

        if (!/^\d+$/.test(age)) {
            return res.status(400).json({
                message: "L'age doit etre numerique.",
            });
        }

        if (!ALLOWED_GENRES.includes(genre)) {
            return res.status(400).json({ message: "Genre invalide" });
        }

        const candidatExistant = await candidatModel.findCandidatById(id);
        if (!candidatExistant) {
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        const existingCandidat = await candidatModel.findCandidatByCinExceptId(cin, id);
        if (existingCandidat) {
            return res.status(409).json({ message: getDuplicateCinMessage() });
        }

        const candidat = await candidatModel.updateCandidat(id, {
            nom,
            cin,
            telephone,
            age: Number(age),
            niveau_scolaire: niveauScolaire,
            poste,
            adresse,
            genre,
        });

        if (!candidat) {
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        return res.json({
            message: "Candidat modifie avec succes.",
            candidat,
        });
    } catch (err) {
        if (isDuplicateCinError(err)) {
            return res.status(409).json({ message: getDuplicateCinMessage() });
        }
        console.error(err);
        res.status(500).json({ message: err.message || "Modification candidat impossible." });
    }
};

exports.deleteCandidat = async (req, res) => {
    try {
        const id = Number(req.params?.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Identifiant candidat invalide." });
        }

        const deleted = await candidatModel.deleteCandidat(id);

        if (!deleted?.deleted) {
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        return res.json({
            success: true,
            message: "Candidat supprime avec succes.",
        });
    } catch (err) {
        console.error(err);
        const status = Number.isInteger(err?.status) ? err.status : 500;
        res.status(status).json({ message: err.message || "Suppression candidat impossible." });
    }
};

exports.updateEtape = async (req, res) => {
    try {
        const id = Number(req.params?.id);
        const { etape, statut } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Identifiant candidat invalide." });
        }

        const trimmedEtape = String(etape ?? "").trim();
        const trimmedStatut = typeof statut === "string" ? statut.trim() : "";
        if (!trimmedEtape) {
            return res.status(400).json({ message: "Etape cible invalide." });
        }

        const normalizedEtape = trimmedEtape.toUpperCase();
        const action =
            normalizedEtape === "TEST_ENTRETIEN"
                ? "Envoyer vers Test / Entretien"
                : "Changement d'etape candidat";

        const result = await candidatModel.updateWorkflowStepWithMovement(
            id,
            trimmedEtape,
            trimmedStatut,
            action,
            null,
            req.user
        );

        res.json({
            message: "Etape mise a jour",
            candidat: result.candidate,
            mouvement_enregistre: result.movementInserted,
        });
    } catch (err) {
        console.error(err);
        const status = Number.isInteger(err?.status) ? err.status : 500;
        res.status(status).json({ message: err.message || "Mise a jour etape impossible." });
    }
};

exports.signerContratCandidat = async (req, res) => {
    try {
        const candidatId = Number.parseInt(req.params.id, 10);
        const typeContrat = readTrimmed(req.body, "typeContrat", "type_contrat");
        const actionUser = readActionUser(req.body, req.user);

        const result = await candidatModel.signerContratCandidat(candidatId, typeContrat, actionUser);

        return res.json({
            ok: true,
            message: "Contrat signe avec succes.",
            ...result,
        });
    } catch (err) {
        console.error("Erreur signerContratCandidat:", err);
        const status = Number.isInteger(err?.status) ? err.status : 500;
        return res.status(status).json({
            ok: false,
            message: err?.message || "Signature contrat impossible.",
        });
    }
};

exports.validerDossierContrat = async (req, res) => {
    try {
        const candidatId = Number.parseInt(req.params.id, 10);
        const actionUser = readActionUser(req.body, req.user);
        const result = await candidatModel.validerDossierContrat(candidatId, actionUser);

        return res.json({
            ok: true,
            message: "Dossier valide avec succes.",
            ...result,
        });
    } catch (err) {
        console.error("Erreur validerDossierContrat:", err);
        const status = Number.isInteger(err?.status) ? err.status : 500;
        return res.status(status).json({
            ok: false,
            message: err?.message || "Validation dossier impossible.",
        });
    }
};
