const sql = require("mssql");
const config = require("../../config");

class ContratError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = "ContratError";
        this.status = status;
    }
}

function normalizeSearch(value) {
    return String(value ?? "").trim();
}

function applySearchFilter(request, search) {
    const clauses = [];

    if (search) {
        request.input("search", sql.NVarChar(200), `%${search}%`);
        clauses.push(`(
            ISNULL(v.cin, N'') COLLATE Latin1_General_CI_AI LIKE @search
            OR ISNULL(v.nom_prenom, N'') COLLATE Latin1_General_CI_AI LIKE @search
            OR ISNULL(v.genre, N'') COLLATE Latin1_General_CI_AI LIKE @search
            OR ISNULL(v.fonction, N'') COLLATE Latin1_General_CI_AI LIKE @search
            OR ISNULL(v.segment, N'') COLLATE Latin1_General_CI_AI LIKE @search
            OR ISNULL(v.projet, N'') COLLATE Latin1_General_CI_AI LIKE @search
            OR ISNULL(v.site, N'') COLLATE Latin1_General_CI_AI LIKE @search
            OR ISNULL(v.type_contrat, N'') COLLATE Latin1_General_CI_AI LIKE @search
            OR ISNULL(v.statut_contrat, N'') COLLATE Latin1_General_CI_AI LIKE @search
            OR ISNULL(v.alerte, N'') COLLATE Latin1_General_CI_AI LIKE @search
        )`);
    }

    return clauses.length > 0 ? clauses.join(" AND ") : "";
}

function buildListeContratsQuery(request, search) {
    const searchClause = applySearchFilter(request, search);
    const whereClause = searchClause ? `WHERE ${searchClause}` : "";

    return `
        SELECT TOP 100
            id_contrat,
            cin,
            nom_prenom,
            genre,
            fonction,
            segment,
            projet,
            site,
            type_contrat,
            date_signature,
            date_debut_contrat,
            date_fin_contrat,
            statut_contrat,
            jours_restants,
            jours_restants_affichage,
            alerte
        FROM dbo.vw_contrats_front v
        ${whereClause}
        ORDER BY
            CASE WHEN v.date_debut_contrat IS NULL THEN 1 ELSE 0 END,
            v.date_debut_contrat DESC;
    `;
}

async function getContratsFront({ search }) {
    const normalizedSearch = normalizeSearch(search);

    const pool = await sql.connect(config);
    const request = pool.request();
    const query = buildListeContratsQuery(request, normalizedSearch);
    const result = await request.query(query);

    return result.recordset || [];
}

module.exports = {
    ContratError,
    getContratsFront,
};
