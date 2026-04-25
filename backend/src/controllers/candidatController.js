const sql = require("mssql");
const config = require("../../config");
const candidatModel = require("../models/candidatModel");

function readTrimmed(body, ...keys) {
    for (const key of keys) {
        const value = body?.[key];
        if (typeof value === "string" || typeof value === "number") {
            return String(value).trim();
        }
    }

    return "";
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
                CASE WHEN COL_LENGTH('dbo.candidats', 'adresse') IS NULL THEN 0 ELSE 1 END AS has_adresse;
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
                ${metadata.has_adresse ? "adresse" : "CAST(NULL AS VARCHAR(255)) AS adresse"}
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

exports.createCandidat = async (req, res) => {
    try {
        const nom = readTrimmed(req.body, "nom");
        const cin = readTrimmed(req.body, "cin");
        const telephone = readTrimmed(req.body, "telephone");
        const age = readTrimmed(req.body, "age");
        const niveauScolaire = readTrimmed(req.body, "niveau_scolaire", "niveauScolaire", "niveauEtudes");
        const poste = readTrimmed(req.body, "poste");
        const adresse = readTrimmed(req.body, "adresse");

        if (!nom || !cin || !telephone || !age || !niveauScolaire || !poste || !adresse) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires : nom, cin, telephone, age, niveau_scolaire, poste et adresse.",
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

        const candidat = await candidatModel.createCandidat({
            nom,
            cin,
            telephone,
            age: Number(age),
            niveau_scolaire: niveauScolaire,
            poste,
            adresse,
        });

        return res.status(201).json({
            message: "Candidat ajoute avec succes.",
            candidat,
        });
    } catch (err) {
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

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Identifiant candidat invalide." });
        }

        if (!nom || !cin || !telephone || !age || !niveauScolaire || !poste || !adresse) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires : nom, cin, telephone, age, niveau_scolaire, poste et adresse.",
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

        const candidat = await candidatModel.updateCandidat(id, {
            nom,
            cin,
            telephone,
            age: Number(age),
            niveau_scolaire: niveauScolaire,
            poste,
            adresse,
        });

        if (!candidat) {
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        return res.json({
            message: "Candidat modifie avec succes.",
            candidat,
        });
    } catch (err) {
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

        if (!deleted) {
            return res.status(404).json({ message: "Candidat introuvable." });
        }

        return res.json({ message: "Candidat supprime avec succes." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || "Suppression candidat impossible." });
    }
};

exports.updateEtape = async (req, res) => {
    try {
        const { id } = req.params;
        const { etape, statut } = req.body;

        const pool = await sql.connect(config);

        await pool.request()
            .input("id", sql.Int, id)
            .input("etape", sql.VarChar, etape)
            .input("statut", sql.VarChar, statut)
            .query(`
                UPDATE dbo.candidats
                SET etape = @etape,
                   statut = @statut
                WHERE id = @id
            `);

        res.json({ message: "Etape mise a jour" });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
};
