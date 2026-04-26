const sql = require("mssql");
const config = require("../../config");

const CANAL_CANDIDAT = "Candidat";
const ETAPE_CANDIDAT = "CANDIDAT";
const STATUT_NOUVEAU = "Nouveau";
const TYPE_CANDIDATURE = "NOUVEAU";

async function getCandidateSchema(pool) {
    const schemaResult = await pool.request().query(`
        SELECT
            CASE WHEN COL_LENGTH('dbo.candidats', 'age') IS NULL THEN 0 ELSE 1 END AS has_age,
            CASE WHEN COL_LENGTH('dbo.candidats', 'niveau_scolaire') IS NULL THEN 0 ELSE 1 END AS has_niveau_scolaire,
            CASE WHEN COL_LENGTH('dbo.candidats', 'adresse') IS NULL THEN 0 ELSE 1 END AS has_adresse,
            CASE WHEN COL_LENGTH('dbo.candidats', 'canal') IS NULL THEN 0 ELSE 1 END AS has_canal,
            CASE WHEN COL_LENGTH('dbo.candidats', 'etape') IS NULL THEN 0 ELSE 1 END AS has_etape,
            CASE WHEN COL_LENGTH('dbo.candidats', 'statut') IS NULL THEN 0 ELSE 1 END AS has_statut,
            CASE WHEN COL_LENGTH('dbo.candidats', 'type_candidature') IS NULL THEN 0 ELSE 1 END AS has_type_candidature,
            CASE WHEN COL_LENGTH('dbo.candidats', 'created_at') IS NULL THEN 0 ELSE 1 END AS has_created_at;
    `);

    return schemaResult.recordset?.[0] || {};
}

async function createCandidat(data) {
    const pool = await sql.connect(config);
    const schema = await getCandidateSchema(pool);
    const columns = ["nom", "cin", "telephone", "poste", "genre"];
    const values = ["@nom", "@cin", "@telephone", "@poste", "@genre"];

    const request = pool.request()
        .input("nom", sql.VarChar, data.nom)
        .input("cin", sql.VarChar, data.cin)
        .input("telephone", sql.VarChar, data.telephone)
        .input("poste", sql.VarChar, data.poste)
        .input("genre", sql.NVarChar(20), data.genre);

    if (schema.has_age) {
        columns.push("age");
        values.push("@age");
        request.input("age", sql.Int, data.age);
    }

    if (schema.has_niveau_scolaire) {
        columns.push("niveau_scolaire");
        values.push("@niveau_scolaire");
        request.input("niveau_scolaire", sql.VarChar, data.niveau_scolaire);
    }

    if (schema.has_adresse) {
        columns.push("adresse");
        values.push("@adresse");
        request.input("adresse", sql.VarChar, data.adresse);
    }

    if (schema.has_canal) {
        columns.push("canal");
        values.push("@canal");
        request.input("canal", sql.VarChar, CANAL_CANDIDAT);
    }

    if (schema.has_etape) {
        columns.push("etape");
        values.push("@etape");
        request.input("etape", sql.VarChar, ETAPE_CANDIDAT);
    }

    if (schema.has_statut) {
        columns.push("statut");
        values.push("@statut");
        request.input("statut", sql.VarChar, STATUT_NOUVEAU);
    }

    if (schema.has_type_candidature) {
        columns.push("type_candidature");
        values.push("@type_candidature");
        request.input("type_candidature", sql.VarChar, TYPE_CANDIDATURE);
    }

    if (schema.has_created_at) {
        columns.push("created_at");
        values.push("GETDATE()");
    }

    const query = `
        INSERT INTO dbo.candidats (${columns.join(", ")})
        VALUES (${values.join(", ")});

        SELECT *
        FROM dbo.candidats
        WHERE id = SCOPE_IDENTITY();
    `;

    const result = await request.query(query);
    return result.recordset?.[0] || null;
}

async function updateCandidat(id, data) {
    const pool = await sql.connect(config);
    const schema = await getCandidateSchema(pool);
    const setClauses = [
        "nom = @nom",
        "cin = @cin",
        "telephone = @telephone",
        "poste = @poste",
    ];

    const request = pool.request()
        .input("id", sql.Int, id)
        .input("nom", sql.VarChar, data.nom)
        .input("cin", sql.VarChar, data.cin)
        .input("telephone", sql.VarChar, data.telephone)
        .input("poste", sql.VarChar, data.poste);

    if (schema.has_age) {
        setClauses.push("age = @age");
        request.input("age", sql.Int, data.age);
    }

    if (schema.has_niveau_scolaire) {
        setClauses.push("niveau_scolaire = @niveau_scolaire");
        request.input("niveau_scolaire", sql.VarChar, data.niveau_scolaire);
    }

    if (schema.has_adresse) {
        setClauses.push("adresse = @adresse");
        request.input("adresse", sql.VarChar, data.adresse);
    }

    if (Object.prototype.hasOwnProperty.call(data, "genre")) {
        setClauses.push("genre = @genre");
        request.input("genre", sql.NVarChar(20), data.genre);
    }

    const query = `
        UPDATE dbo.candidats
        SET ${setClauses.join(", ")}
        WHERE id = @id;

        SELECT *
        FROM dbo.candidats
        WHERE id = @id;
    `;

    const result = await request.query(query);
    return result.recordset?.[0] || null;
}

async function deleteCandidat(id) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("id", sql.Int, id)
        .query(`
            DELETE FROM dbo.candidats
            WHERE id = @id;
        `);

    return Number(result.rowsAffected?.[0] || 0) > 0;
}

module.exports = {
    createCandidat,
    updateCandidat,
    deleteCandidat,
    CANAL_CANDIDAT,
    ETAPE_CANDIDAT,
    STATUT_NOUVEAU,
};
