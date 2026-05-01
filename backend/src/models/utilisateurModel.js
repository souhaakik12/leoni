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
        InviteToken: row.InviteToken ?? null,
        InviteTokenExpire: row.InviteTokenExpire ?? null,
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
                AccesFoyer,
                InviteToken,
                InviteTokenExpire
            FROM dbo.Utilisateurs
            WHERE LOWER(Email) = LOWER(@email)
              AND Actif = 1;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function findActiveById(id) {
    const pool = await sql.connect(config);
    const result = await pool.request()
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
                AccesFoyer,
                InviteToken,
                InviteTokenExpire
            FROM dbo.Utilisateurs
            WHERE Id = @id
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
                AccesFoyer,
                InviteToken,
                InviteTokenExpire
            FROM dbo.Utilisateurs
            WHERE LOWER(Email) = LOWER(@email);
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
                AccesFoyer,
                InviteToken,
                InviteTokenExpire
            FROM dbo.Utilisateurs
            WHERE LOWER(Email) = LOWER(@email)
              AND Id <> @id;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function findAll(search = "") {
    const pool = await sql.connect(config);
    const request = pool.request();
    const trimmedSearch = String(search ?? "").trim();
    const whereClause = trimmedSearch
        ? `
            WHERE
                NomComplet LIKE @search
                OR Email LIKE @search
                OR Role LIKE @search
        `
        : "";

    if (trimmedSearch) {
        request.input("search", sql.VarChar(150), `%${trimmedSearch}%`);
    }

    const result = await request.query(`
        SELECT
            Id,
            NomComplet,
            Email,
            MotDePasse,
            Role,
            Actif,
            CreeLe,
            AccesFoyer,
            InviteToken,
            InviteTokenExpire
        FROM dbo.Utilisateurs
        ${whereClause}
        ORDER BY NomComplet ASC, Id DESC;
    `);

    return (result.recordset || []).map(mapUtilisateurRow);
}

async function createWithInvite(data) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("NomComplet", sql.VarChar(100), data.NomComplet)
        .input("Email", sql.VarChar(150), data.Email)
        .input("Role", sql.VarChar(20), data.Role)
        .input("AccesFoyer", sql.Bit, data.AccesFoyer)
        .input("InviteToken", sql.VarChar(255), data.InviteToken)
        .input("InviteTokenExpire", sql.DateTime, data.InviteTokenExpire)
        .query(`
            INSERT INTO dbo.Utilisateurs (
                NomComplet,
                Email,
                MotDePasse,
                Role,
                Actif,
                CreeLe,
                AccesFoyer,
                InviteToken,
                InviteTokenExpire
            )
            OUTPUT
                INSERTED.Id,
                INSERTED.NomComplet,
                INSERTED.Email,
                INSERTED.MotDePasse,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer,
                INSERTED.InviteToken,
                INSERTED.InviteTokenExpire
            VALUES (
                @NomComplet,
                @Email,
                NULL,
                @Role,
                0,
                GETDATE(),
                @AccesFoyer,
                @InviteToken,
                @InviteTokenExpire
            );
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function updateUtilisateur(id, data) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("Id", sql.Int, id)
        .input("NomComplet", sql.VarChar(100), data.NomComplet)
        .input("Email", sql.VarChar(150), data.Email)
        .input("Role", sql.VarChar(20), data.Role)
        .input("AccesFoyer", sql.Bit, data.AccesFoyer)
        .query(`
            UPDATE dbo.Utilisateurs
            SET
                NomComplet = @NomComplet,
                Email = @Email,
                Role = @Role,
                AccesFoyer = @AccesFoyer
            OUTPUT
                INSERTED.Id,
                INSERTED.NomComplet,
                INSERTED.Email,
                INSERTED.MotDePasse,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer,
                INSERTED.InviteToken,
                INSERTED.InviteTokenExpire
            WHERE Id = @Id;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function deleteUtilisateur(id) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("Id", sql.Int, id)
        .query(`
            DELETE FROM dbo.Utilisateurs
            OUTPUT
                DELETED.Id,
                DELETED.NomComplet,
                DELETED.Email,
                DELETED.MotDePasse,
                DELETED.Role,
                DELETED.Actif,
                DELETED.CreeLe,
                DELETED.AccesFoyer,
                DELETED.InviteToken,
                DELETED.InviteTokenExpire
            WHERE Id = @Id;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function findByInviteToken(token) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("InviteToken", sql.VarChar(255), token)
        .query(`
            SELECT TOP 1
                Id,
                NomComplet,
                Email,
                MotDePasse,
                Role,
                Actif,
                CreeLe,
                AccesFoyer,
                InviteToken,
                InviteTokenExpire
            FROM dbo.Utilisateurs
            WHERE InviteToken = @InviteToken;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function activateAccountWithPassword(token, password) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("InviteToken", sql.VarChar(255), token)
        .input("MotDePasse", sql.VarChar(255), password)
        .query(`
            UPDATE dbo.Utilisateurs
            SET
                MotDePasse = @MotDePasse,
                Actif = 1,
                InviteToken = NULL,
                InviteTokenExpire = NULL
            OUTPUT
                INSERTED.Id,
                INSERTED.NomComplet,
                INSERTED.Email,
                INSERTED.MotDePasse,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer,
                INSERTED.InviteToken,
                INSERTED.InviteTokenExpire
            WHERE InviteToken = @InviteToken
              AND ISNULL(Actif, 0) = 0
              AND InviteTokenExpire IS NOT NULL
              AND InviteTokenExpire >= GETDATE();
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
                INSERTED.MotDePasse,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer,
                INSERTED.InviteToken,
                INSERTED.InviteTokenExpire
            WHERE LOWER(Email) = LOWER(@email)
              AND Actif = 1;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function updateProfileById(id, data) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("id", sql.Int, id)
        .input("NomComplet", sql.VarChar(100), data.NomComplet)
        .input("Email", sql.VarChar(150), data.Email)
        .query(`
            UPDATE dbo.Utilisateurs
            SET
                NomComplet = @NomComplet,
                Email = @Email
            OUTPUT
                INSERTED.Id,
                INSERTED.NomComplet,
                INSERTED.Email,
                INSERTED.MotDePasse,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer,
                INSERTED.InviteToken,
                INSERTED.InviteTokenExpire
            WHERE Id = @id
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
                INSERTED.MotDePasse,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer,
                INSERTED.InviteToken,
                INSERTED.InviteTokenExpire
            WHERE LOWER(Email) = LOWER(@email)
              AND Actif = 1;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

async function updatePasswordById(id, newPassword) {
    const pool = await sql.connect(config);
    const result = await pool.request()
        .input("id", sql.Int, id)
        .input("MotDePasse", sql.VarChar(255), newPassword)
        .query(`
            UPDATE dbo.Utilisateurs
            SET MotDePasse = @MotDePasse
            OUTPUT
                INSERTED.Id,
                INSERTED.NomComplet,
                INSERTED.Email,
                INSERTED.MotDePasse,
                INSERTED.Role,
                INSERTED.Actif,
                INSERTED.CreeLe,
                INSERTED.AccesFoyer,
                INSERTED.InviteToken,
                INSERTED.InviteTokenExpire
            WHERE Id = @id
              AND Actif = 1;
        `);

    return mapUtilisateurRow(result.recordset?.[0]);
}

module.exports = {
    findActiveById,
    findActiveByEmail,
    findByEmail,
    findByEmailExceptId,
    findAll,
    createWithInvite,
    updateUtilisateur,
    deleteUtilisateur,
    findByInviteToken,
    activateAccountWithPassword,
    updateProfileByEmail,
    updateProfileById,
    updatePasswordByEmail,
    updatePasswordById,
    listUsers: findAll,
    createUser: createWithInvite,
    updateUser: updateUtilisateur,
    deactivateUtilisateur: deleteUtilisateur,
    deactivateUser: deleteUtilisateur,
    deleteUser: deleteUtilisateur,
};
