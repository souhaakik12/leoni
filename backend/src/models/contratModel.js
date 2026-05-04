const sql = require("mssql");
const config = require("../../config");

class ContratError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = "ContratError";
        this.status = status;
    }
}

const CONTRACT_TYPES_SIX_MONTHS = new Set(["CDI", "2CDI", "CDI SANS ESSAI", "CDD"]);
const CONTRACT_TYPES_TWELVE_MONTHS = new Set(["CAIP", "CIVP", "SIVP"]);

function normalizeSearch(value) {
    return String(value ?? "").trim();
}

function normalizeSourceDonnee(value) {
    const normalized = String(value ?? "").trim().toUpperCase();
    if (normalized === "IMPORT" || normalized === "SYSTEME") {
        return normalized;
    }
    return "";
}

function normalizeContractType(value) {
    return String(value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

function isRenewableAlert(value) {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return normalized === "expire" || normalized === "proche expiration";
}

function computeRenewedEndDate(startDate, typeContrat) {
    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
        return null;
    }

    const normalizedType = normalizeContractType(typeContrat);
    const dateFin = new Date(startDate);

    if (CONTRACT_TYPES_TWELVE_MONTHS.has(normalizedType)) {
        dateFin.setMonth(dateFin.getMonth() + 12);
        return dateFin;
    }

    if (CONTRACT_TYPES_SIX_MONTHS.has(normalizedType)) {
        dateFin.setMonth(dateFin.getMonth() + 6);
        return dateFin;
    }

    dateFin.setMonth(dateFin.getMonth() + 6);
    return dateFin;
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
        SELECT
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
            alerte,
            source_donnee
        FROM dbo.vw_contrats_interface v
        ${whereClause}
        ORDER BY
            CASE WHEN v.date_signature IS NULL THEN 1 ELSE 0 END,
            v.date_signature DESC,
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
    const countRequest = pool.request();
    const searchClause = applySearchFilter(countRequest, normalizedSearch);
    const whereClause = searchClause ? `WHERE ${searchClause}` : "";
    const countResult = await countRequest.query(`
        SELECT COUNT(*) AS total
        FROM dbo.vw_contrats_interface v
        ${whereClause};
    `);

    return {
        contrats: result.recordset || [],
        total: Number(countResult.recordset?.[0]?.total || 0),
    };
}

async function renouvelerContrat(idContrat, sourceDonnee) {
    const normalizedId = Number(idContrat);
    const normalizedSource = normalizeSourceDonnee(sourceDonnee);

    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        throw new ContratError("Identifiant contrat invalide.", 400);
    }

    if (!normalizedSource) {
        throw new ContratError("Source du contrat manquante ou invalide.", 400);
    }

    const pool = await sql.connect(config);
    const contratResult = await pool.request()
        .input("id_contrat", sql.Int, normalizedId)
        .input("source_donnee", sql.VarChar(20), normalizedSource)
        .query(`
            SELECT TOP 1
                id_contrat,
                type_contrat,
                date_fin_contrat,
                alerte,
                source_donnee
            FROM dbo.vw_contrats_interface
            WHERE id_contrat = @id_contrat
              AND source_donnee = @source_donnee;
        `);

    const contrat = contratResult.recordset?.[0] || null;
    if (!contrat) {
        throw new ContratError("Contrat introuvable.", 404);
    }

    if (!isRenewableAlert(contrat.alerte)) {
        throw new ContratError("Ce contrat n’est pas éligible au renouvellement.", 400);
    }

    if (!contrat.date_fin_contrat) {
        throw new ContratError("Impossible de renouveler : date fin contrat manquante.", 400);
    }

    const newDateDebut = new Date(contrat.date_fin_contrat);
    if (Number.isNaN(newDateDebut.getTime())) {
        throw new ContratError("Impossible de renouveler : date fin contrat invalide.", 400);
    }

    const newDateFin = computeRenewedEndDate(newDateDebut, contrat.type_contrat);
    if (!newDateFin) {
        throw new ContratError("Impossible de calculer la nouvelle date de fin.", 500);
    }

    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        let updateResult;
        if (normalizedSource === "IMPORT") {
            updateResult = await transaction.request()
                .input("id_contrat_import", sql.Int, normalizedId)
                .input("date_debut_contrat", sql.DateTime, newDateDebut)
                .input("date_fin_contrat", sql.DateTime, newDateFin)
                .query(`
                    UPDATE dbo.contrats_import_clean
                    SET date_debut_contrat = @date_debut_contrat,
                        date_fin_contrat = @date_fin_contrat
                    WHERE id_contrat_import = @id_contrat_import;
                `);
        } else {
            updateResult = await transaction.request()
                .input("id", sql.Int, normalizedId)
                .input("date_debut", sql.DateTime, newDateDebut)
                .input("date_fin", sql.DateTime, newDateFin)
                .input("statut_contrat", sql.VarChar(20), "ACTIF")
                .query(`
                    UPDATE dbo.contrats
                    SET date_debut = @date_debut,
                        date_fin = @date_fin,
                        statut_contrat = @statut_contrat
                    WHERE id = @id;
                `);
        }

        if (!Number(updateResult?.rowsAffected?.[0] || 0)) {
            throw new ContratError("Aucun contrat n’a pu être renouvelé.", 404);
        }

        await transaction.commit();

        return {
            id_contrat: normalizedId,
            source_donnee: normalizedSource,
            type_contrat: contrat.type_contrat,
            date_debut_contrat: newDateDebut,
            date_fin_contrat: newDateFin,
            statut_contrat: "ACTIF",
        };
    } catch (error) {
        try {
            if (!transaction._aborted) {
                await transaction.rollback();
            }
        } catch (rollbackError) {
            console.error("Rollback renouvelerContrat:", rollbackError);
        }
        throw error;
    }
}

module.exports = {
    ContratError,
    getContratsFront,
    renouvelerContrat,
};
