const sql = require("mssql");
const config = require("../../config");
const { normalizeRole } = require("../middleware/roleMiddleware");

function mapUtilisateurRow(row) {
    if (!row) return null;

    return {
        Id: row.Id,
        NomComplet: row.NomComplet,
        Email: row.Email,
        MotDePasse: row.MotDePasse,
        Role: normalizeRole(row.Role),
        Actif: Number(row.Actif ?? 0),
        CreeLe: row.CreeLe,
        AccesFoyer: Number(row.AccesFoyer ?? 0),
    };
}

async function findActiveByEmail(email) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("email", sql.VarChar(150), email)
        .query(`
            SELECT TOP 1
                Id,
                NomComplet,
                Email,
                MotDePasse,
                Role,
                Actif,
                CreeLe,
                AccesFoyer
            FROM dbo.Utilisateurs
            WHERE Email = @email
              AND Actif = 1;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function findByEmail(email) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("email", sql.VarChar(150), email)
        .query(`
            SELECT TOP 1
                Id,
                NomComplet,
                Email,
                MotDePasse,
                Role,
                Actif,
                CreeLe,
                AccesFoyer
            FROM dbo.Utilisateurs
            WHERE Email = @email;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function findByEmailExceptId(email, id) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("email", sql.VarChar(150), email)
        .input("id", sql.Int, id)
        .query(`
            SELECT TOP 1
                Id,
                NomComplet,
                Email,
                MotDePasse,
                Role,
                Actif,
                CreeLe,
                AccesFoyer
            FROM dbo.Utilisateurs
            WHERE Email = @email
              AND Id <> @id;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function listUsers(search = "") {
    const pool = await sql.connect(config);
    const request = pool.request()
        .input("search", sql.VarChar(150), `%${search}%`);
    const searchWhere = search
        ? `
            WHERE
                NomComplet LIKE @search
                OR Email LIKE @search
                OR Role LIKE @search
        `
        : "";

    const result = await request.query(`
        SELECT
            Id,
            NomComplet,
            Email,
            Role,
            Actif,
            CreeLe,
            AccesFoyer
        FROM dbo.Utilisateurs
        ${searchWhere}
        ORDER BY NomComplet ASC, Id DESC;
    `);

    return (result.recordset || []).map(mapUtilisateurRow);
}

async function createUser(data) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("NomComplet", sql.VarChar(100), data.NomComplet)
        .input("Email", sql.VarChar(150), data.Email)
        .input("MotDePasse", sql.VarChar(255), data.MotDePasse)
        .input("Role", sql.VarChar(20), data.Role)
        .input("AccesFoyer", sql.Bit, data.AccesFoyer)
        .query(`
            INSERT INTO dbo.Utilisateurs (NomComplet, Email, MotDePasse, Role, Actif, CreeLe, AccesFoyer)
            OUTPUT
                INSERTED.Id,
                INSERTED.NomComplet,
                INSERTED.Email,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer
            VALUES (@NomComplet, @Email, @MotDePasse, @Role, 1, GETDATE(), @AccesFoyer);
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function updateUser(id, data) {
    const pool = await sql.connect(config);
    const request = pool.request()
        .input("Id", sql.Int, id)
        .input("NomComplet", sql.VarChar(100), data.NomComplet)
        .input("Email", sql.VarChar(150), data.Email)
        .input("Role", sql.VarChar(20), data.Role)
        .input("AccesFoyer", sql.Bit, data.AccesFoyer);

    const shouldUpdatePassword = typeof data.MotDePasse === "string" && data.MotDePasse.trim() !== "";
    if (shouldUpdatePassword) {
        request.input("MotDePasse", sql.VarChar(255), data.MotDePasse);
    }

    const result = await request.query(`
        UPDATE dbo.Utilisateurs
        SET
            NomComplet = @NomComplet,
            Email = @Email,
            Role = @Role,
            AccesFoyer = @AccesFoyer,
            MotDePasse = ${shouldUpdatePassword ? "@MotDePasse" : "MotDePasse"}
        OUTPUT
            INSERTED.Id,
            INSERTED.NomComplet,
            INSERTED.Email,
            INSERTED.Role,
            INSERTED.Actif,
            INSERTED.CreeLe,
            INSERTED.AccesFoyer
        WHERE Id = @Id;
    `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function updateProfileByEmail(email, data) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("email", sql.VarChar(150), email)
        .input("NomComplet", sql.VarChar(100), data.NomComplet)
        .input("NewEmail", sql.VarChar(150), data.NewEmail)
        .query(`
            UPDATE dbo.Utilisateurs
            SET
                NomComplet = @NomComplet,
                Email = @NewEmail
            OUTPUT
                INSERTED.Id,
                INSERTED.NomComplet,
                INSERTED.Email,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer
            WHERE Email = @email
              AND Actif = 1;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function updatePasswordByEmail(email, newPassword) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("email", sql.VarChar(150), email)
        .input("MotDePasse", sql.VarChar(255), newPassword)
        .query(`
            UPDATE dbo.Utilisateurs
            SET MotDePasse = @MotDePasse
            OUTPUT
                INSERTED.Id,
                INSERTED.NomComplet,
                INSERTED.Email,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer
            WHERE Email = @email
              AND Actif = 1;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function deactivateUser(id) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("Id", sql.Int, id)
        .query(`
            UPDATE dbo.Utilisateurs
            SET Actif = 0
            OUTPUT
                INSERTED.Id,
                INSERTED.NomComplet,
                INSERTED.Email,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer
            WHERE Id = @Id;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

module.exports = {
    findActiveByEmail,
    findByEmail,
    findByEmailExceptId,
    listUsers,
    createUser,
    updateUser,
    updateProfileByEmail,
    updatePasswordByEmail,
    deactivateUser,
};
