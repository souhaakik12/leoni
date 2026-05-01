const sql = require("mssql");
const config = require("../../config");

function normalizeText(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
}

function normalizeNullableText(value) {
    const normalized = normalizeText(value);
    return normalized || null;
}

function normalizePositiveInt(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeNullableInt(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
}

function normalizeResponsablesIds(value) {
    const source = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(",")
            : [];

    const seen = new Set();
    const ids = [];

    for (const entry of source) {
        const parsed = normalizePositiveInt(entry);
        if (!parsed || seen.has(parsed)) {
            continue;
        }

        seen.add(parsed);
        ids.push(parsed);
    }

    return ids;
}

function pad2(value) {
    return String(value).padStart(2, "0");
}

function toIsoDate(value) {
    if (!value) return "";

    if (typeof value === "string") {
        const trimmed = value.trim();
        const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) return isoMatch[1];

        const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (frMatch) {
            return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
        }
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function toDisplayDate(value) {
    const isoDate = toIsoDate(value);
    if (!isoDate) return "";

    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
}

function buildVille(gouvernorat, delegation) {
    const parts = [normalizeText(gouvernorat), normalizeText(delegation)].filter(Boolean);
    return parts.join(" - ");
}

function parseResponsablesIds(value) {
    return normalizeResponsablesIds(value);
}

function mapMissionRow(row) {
    const missionId = normalizePositiveInt(row?.Id) || 0;
    const codeMission = normalizeText(row?.CodeMission);
    const dateMission = row?.DateMissionIso || toIsoDate(row?.DateMissionValue);
    const responsablesNoms = normalizeText(row?.ResponsablesNoms);
    const creeParNom = normalizeText(row?.CreeParNom);
    const creeParEmail = normalizeText(row?.CreeParEmail);
    const mission = {
        Id: missionId,
        CodeMission: codeMission || null,
        id: codeMission || `M${missionId}`,
        TypeMission: normalizeText(row?.TypeMission),
        DateMission: dateMission,
        date: toDisplayDate(dateMission),
        Gouvernorat: normalizeText(row?.Gouvernorat),
        Delegation: normalizeText(row?.Delegation),
        ville: buildVille(row?.Gouvernorat, row?.Delegation),
        Transport: normalizeText(row?.Transport),
        transport: normalizeText(row?.Transport),
        Objectif: normalizeText(row?.Objectif),
        objectif: normalizeText(row?.Objectif),
        ResultatMission: normalizeText(row?.ResultatMission),
        NombreRecrutes: normalizeNullableInt(row?.NombreRecrutes),
        Observations: normalizeText(row?.Observations),
        observations: normalizeText(row?.Observations),
        Statut: normalizeText(row?.Statut),
        statut: normalizeText(row?.Statut),
        CreePar: normalizePositiveInt(row?.CreePar),
        CreeParNom: creeParNom,
        CreeParEmail: creeParEmail,
        createdBy: creeParNom,
        createdByEmail: creeParEmail,
        ResponsablesNoms: responsablesNoms,
        responsable: responsablesNoms,
        responsablesIds: parseResponsablesIds(row?.ResponsablesIdsCsv),
        CreeLe: row?.CreeLe || null,
        ModifieLe: row?.ModifieLe || null,
    };

    return mission;
}

async function getMissionViewColumns(pool) {
    const result = await pool.request().query(`
        SELECT c.name
        FROM sys.columns c
        INNER JOIN sys.views v ON v.object_id = c.object_id
        WHERE v.object_id = OBJECT_ID('dbo.vw_Missions_Detail');
    `);

    return new Set((result.recordset || []).map((row) => row.name));
}

function buildMissionSelectQuery(viewColumns, whereClause = "") {
    const canUseView = viewColumns.has("Id");
    const viewValue = (columnName, fallbackExpression) => (
        canUseView && viewColumns.has(columnName)
            ? `COALESCE(v.[${columnName}], ${fallbackExpression})`
            : fallbackExpression
    );
    const viewApply = canUseView
        ? `
    OUTER APPLY (
        SELECT TOP 1 *
        FROM dbo.vw_Missions_Detail v
        WHERE v.Id = m.Id
    ) v
`
        : "";
    const creeParNomSource = canUseView && viewColumns.has("CreeParNom")
        ? "COALESCE(NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), v.[CreeParNom]))), ''), creator.NomComplet, '')"
        : "ISNULL(creator.NomComplet, '')";
    const creeParEmailSource = canUseView && viewColumns.has("CreeParEmail")
        ? "COALESCE(NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), v.[CreeParEmail]))), ''), creator.Email, '')"
        : "ISNULL(creator.Email, '')";
    const responsablesSource = canUseView && viewColumns.has("ResponsablesNoms")
        ? "COALESCE(NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), v.[ResponsablesNoms]))), ''), resp.ResponsablesNoms, '')"
        : "ISNULL(resp.ResponsablesNoms, '')";
    const orderByDate = viewValue("DateMission", "m.DateMission");

    return `
        SELECT
            m.Id,
            ${viewValue("CodeMission", "m.CodeMission")} AS CodeMission,
            ${viewValue("TypeMission", "m.TypeMission")} AS TypeMission,
            ${viewValue("DateMission", "m.DateMission")} AS DateMissionValue,
            CONVERT(VARCHAR(10), ${viewValue("DateMission", "m.DateMission")}, 23) AS DateMissionIso,
            ${viewValue("Gouvernorat", "m.Gouvernorat")} AS Gouvernorat,
            ${viewValue("Delegation", "m.Delegation")} AS Delegation,
            ${viewValue("Transport", "m.Transport")} AS Transport,
            ${viewValue("Objectif", "m.Objectif")} AS Objectif,
            ${viewValue("ResultatMission", "m.ResultatMission")} AS ResultatMission,
            ${viewValue("NombreRecrutes", "m.NombreRecrutes")} AS NombreRecrutes,
            ${viewValue("Observations", "m.Observations")} AS Observations,
            ${viewValue("Statut", "m.Statut")} AS Statut,
            ${viewValue("CreePar", "m.CreePar")} AS CreePar,
            ${creeParNomSource} AS CreeParNom,
            ${creeParEmailSource} AS CreeParEmail,
            ${responsablesSource} AS ResponsablesNoms,
            ISNULL(resp.ResponsablesIdsCsv, '') AS ResponsablesIdsCsv,
            ${viewValue("CreeLe", "m.CreeLe")} AS CreeLe,
            ${viewValue("ModifieLe", "m.ModifieLe")} AS ModifieLe
        FROM dbo.Missions m
${viewApply}        LEFT JOIN dbo.Utilisateurs creator ON creator.Id = m.CreePar
        OUTER APPLY (
            SELECT
                STUFF((
                    SELECT ', ' + CONVERT(NVARCHAR(MAX), u2.NomComplet)
                    FROM dbo.MissionResponsables mr2
                    INNER JOIN dbo.Utilisateurs u2 ON u2.Id = mr2.UtilisateurId
                    WHERE mr2.MissionId = m.Id
                    ORDER BY u2.NomComplet
                    FOR XML PATH(''), TYPE
                ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS ResponsablesNoms,
                STUFF((
                    SELECT ',' + CONVERT(VARCHAR(20), mr2.UtilisateurId)
                    FROM dbo.MissionResponsables mr2
                    WHERE mr2.MissionId = m.Id
                    ORDER BY mr2.UtilisateurId
                    FOR XML PATH(''), TYPE
                ).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS ResponsablesIdsCsv
        ) resp
        ${whereClause}
        ORDER BY ${orderByDate} DESC, m.Id DESC;
    `;
}

async function getMissionById(id) {
    const missionId = normalizePositiveInt(id);
    if (!missionId) return null;

    const pool = await sql.connect(config);
    const viewColumns = await getMissionViewColumns(pool);
    const query = buildMissionSelectQuery(viewColumns, "WHERE m.Id = @MissionId");
    const result = await pool.request()
        .input("MissionId", sql.Int, missionId)
        .query(query);

    return mapMissionRow(result.recordset?.[0]);
}

function normalizeMissionInput(data = {}) {
    return {
        TypeMission: normalizeNullableText(data.TypeMission),
        DateMission: toIsoDate(data.DateMission),
        Gouvernorat: normalizeNullableText(data.Gouvernorat),
        Delegation: normalizeNullableText(data.Delegation),
        Transport: normalizeNullableText(data.Transport),
        Objectif: normalizeNullableText(data.Objectif),
        ResultatMission: normalizeNullableText(data.ResultatMission),
        NombreRecrutes: normalizeNullableInt(data.NombreRecrutes),
        Observations: normalizeNullableText(data.Observations),
        Statut: normalizeNullableText(data.Statut),
        CreePar: normalizePositiveInt(data.CreePar),
        responsablesIds: normalizeResponsablesIds(data.responsablesIds),
    };
}

async function insertMissionResponsables(transaction, missionId, responsablesIds) {
    const ids = normalizeResponsablesIds(responsablesIds);

    for (const utilisateurId of ids) {
        await transaction.request()
            .input("MissionId", sql.Int, missionId)
            .input("UtilisateurId", sql.Int, utilisateurId)
            .query(`
                INSERT INTO dbo.MissionResponsables (MissionId, UtilisateurId, CreeLe)
                VALUES (@MissionId, @UtilisateurId, GETDATE());
            `);
    }
}

async function getResponsables() {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
        SELECT
            Id,
            NomComplet,
            Email,
            Role,
            AccesFoyer
        FROM dbo.Utilisateurs
        WHERE Actif = 1
        ORDER BY NomComplet ASC;
    `);

    return (result.recordset || []).map((row) => ({
        Id: normalizePositiveInt(row.Id),
        NomComplet: normalizeText(row.NomComplet),
        Email: normalizeText(row.Email),
        Role: normalizeText(row.Role),
        AccesFoyer: normalizeNullableInt(row.AccesFoyer) ?? 0,
    }));
}

async function getAllMissions() {
    const pool = await sql.connect(config);
    const viewColumns = await getMissionViewColumns(pool);
    const query = buildMissionSelectQuery(viewColumns);
    const result = await pool.request().query(query);

    return (result.recordset || []).map(mapMissionRow);
}

async function getAssignedMissions(userId) {
    const assignedUserId = normalizePositiveInt(userId);
    if (!assignedUserId) return [];

    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("UtilisateurId", sql.Int, assignedUserId)
        .query(`
            SELECT DISTINCT
                m.Id,
                m.CodeMission,
                m.TypeMission,
                m.DateMission AS DateMissionValue,
                CONVERT(VARCHAR(10), m.DateMission, 23) AS DateMissionIso,
                m.Gouvernorat,
                m.Delegation,
                m.Transport,
                m.Objectif,
                m.ResultatMission,
                m.NombreRecrutes,
                m.Observations,
                m.Statut,
                m.CreePar,
                ISNULL(creator.NomComplet, '') AS CreeParNom,
                ISNULL(creator.Email, '') AS CreeParEmail,
                m.CreeLe,
                m.ModifieLe
            FROM dbo.MissionResponsables mr
            INNER JOIN dbo.Missions m ON m.Id = mr.MissionId
            LEFT JOIN dbo.Utilisateurs creator ON creator.Id = m.CreePar
            WHERE mr.UtilisateurId = @UtilisateurId
            ORDER BY m.DateMission DESC, m.Id DESC;
        `);

    return (result.recordset || []).map(mapMissionRow);
}

async function createMission(data) {
    const missionData = normalizeMissionInput(data);
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
        const insertResult = await transaction.request()
            .input("TypeMission", sql.NVarChar(sql.MAX), missionData.TypeMission)
            .input("DateMission", sql.Date, missionData.DateMission || null)
            .input("Gouvernorat", sql.NVarChar(sql.MAX), missionData.Gouvernorat)
            .input("Delegation", sql.NVarChar(sql.MAX), missionData.Delegation)
            .input("Transport", sql.NVarChar(sql.MAX), missionData.Transport)
            .input("Objectif", sql.NVarChar(sql.MAX), missionData.Objectif)
            .input("ResultatMission", sql.NVarChar(sql.MAX), missionData.ResultatMission)
            .input("NombreRecrutes", sql.Int, missionData.NombreRecrutes)
            .input("Observations", sql.NVarChar(sql.MAX), missionData.Observations)
            .input("Statut", sql.NVarChar(sql.MAX), missionData.Statut)
            .input("CreePar", sql.Int, missionData.CreePar)
            .query(`
                INSERT INTO dbo.Missions (
                    TypeMission,
                    DateMission,
                    Gouvernorat,
                    Delegation,
                    Transport,
                    Objectif,
                    ResultatMission,
                    NombreRecrutes,
                    Observations,
                    Statut,
                    CreePar,
                    CreeLe,
                    ModifieLe
                )
                OUTPUT INSERTED.Id
                VALUES (
                    @TypeMission,
                    @DateMission,
                    @Gouvernorat,
                    @Delegation,
                    @Transport,
                    @Objectif,
                    @ResultatMission,
                    @NombreRecrutes,
                    @Observations,
                    @Statut,
                    @CreePar,
                    GETDATE(),
                    GETDATE()
                );
            `);

        const missionId = normalizePositiveInt(insertResult.recordset?.[0]?.Id);
        if (!missionId) {
            throw new Error("Creation de mission echouee.");
        }

        await insertMissionResponsables(transaction, missionId, missionData.responsablesIds);
        await transaction.commit();

        return getMissionById(missionId);
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (_rollbackError) {
            // Ignore rollback errors and surface the original error.
        }

        throw error;
    }
}

async function updateMission(id, data) {
    const missionId = normalizePositiveInt(id);
    if (!missionId) return null;

    const missionData = normalizeMissionInput(data);
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
        const updateResult = await transaction.request()
            .input("MissionId", sql.Int, missionId)
            .input("TypeMission", sql.NVarChar(sql.MAX), missionData.TypeMission)
            .input("DateMission", sql.Date, missionData.DateMission || null)
            .input("Gouvernorat", sql.NVarChar(sql.MAX), missionData.Gouvernorat)
            .input("Delegation", sql.NVarChar(sql.MAX), missionData.Delegation)
            .input("Transport", sql.NVarChar(sql.MAX), missionData.Transport)
            .input("Objectif", sql.NVarChar(sql.MAX), missionData.Objectif)
            .input("ResultatMission", sql.NVarChar(sql.MAX), missionData.ResultatMission)
            .input("NombreRecrutes", sql.Int, missionData.NombreRecrutes)
            .input("Observations", sql.NVarChar(sql.MAX), missionData.Observations)
            .input("Statut", sql.NVarChar(sql.MAX), missionData.Statut)
            .input("CreePar", sql.Int, missionData.CreePar)
            .query(`
                UPDATE dbo.Missions
                SET
                    TypeMission = @TypeMission,
                    DateMission = @DateMission,
                    Gouvernorat = @Gouvernorat,
                    Delegation = @Delegation,
                    Transport = @Transport,
                    Objectif = @Objectif,
                    ResultatMission = @ResultatMission,
                    NombreRecrutes = @NombreRecrutes,
                    Observations = @Observations,
                    Statut = @Statut,
                    CreePar = COALESCE(@CreePar, CreePar),
                    ModifieLe = GETDATE()
                OUTPUT INSERTED.Id
                WHERE Id = @MissionId;
            `);

        if (!updateResult.recordset?.length) {
            await transaction.rollback();
            return null;
        }

        await transaction.request()
            .input("MissionId", sql.Int, missionId)
            .query(`
                DELETE FROM dbo.MissionResponsables
                WHERE MissionId = @MissionId;
            `);

        await insertMissionResponsables(transaction, missionId, missionData.responsablesIds);
        await transaction.commit();

        return getMissionById(missionId);
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (_rollbackError) {
            // Ignore rollback errors and surface the original error.
        }

        throw error;
    }
}

async function deleteMission(id) {
    const missionId = normalizePositiveInt(id);
    if (!missionId) return false;

    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
        await transaction.request()
            .input("MissionId", sql.Int, missionId)
            .query(`
                DELETE FROM dbo.MissionResponsables
                WHERE MissionId = @MissionId;
            `);

        const deleteResult = await transaction.request()
            .input("MissionId", sql.Int, missionId)
            .query(`
                DELETE FROM dbo.Missions
                OUTPUT DELETED.Id
                WHERE Id = @MissionId;
            `);

        await transaction.commit();

        return Boolean(deleteResult.recordset?.length);
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (_rollbackError) {
            // Ignore rollback errors and surface the original error.
        }

        throw error;
    }
}

module.exports = {
    getResponsables,
    getAllMissions,
    getAssignedMissions,
    createMission,
    updateMission,
    deleteMission,
};
