const { sql, getPool } = require("../config/db");

async function getResidentsByFoyerId(foyerId) {
    const pool = await getPool();
    const result = await pool.request()
        .input("foyer_id", sql.Int, foyerId)
        .query(`
            SELECT *
            FROM Resident
            WHERE foyer_id = @foyer_id
            ORDER BY id DESC
        `);
    return result.recordset;
}

async function findActiveResidentByMatricule(matricule, options = {}) {
    const { includeQuitteeHistory = false } = options;
    const pool = await getPool();
    const request = pool.request()
        .input("matricule", sql.VarChar, matricule);

    const result = includeQuitteeHistory
        ? await request.query(`
            SELECT TOP 1 id
            FROM Resident
            WHERE matricule = @matricule
        `)
        : await request.query(`
            SELECT TOP 1 id
            FROM Resident
            WHERE matricule = @matricule
              AND (
                etat IS NULL
                OR LTRIM(RTRIM(etat)) NOT IN (N'Quittée', N'Quittee')
              )
        `);

    return result.recordset[0] || null;
}

async function createResident(data) {
    const pool = await getPool();
    const result = await pool.request()
        .input("nom_complet", sql.VarChar, data.nom_complet)
        .input("matricule", sql.VarChar, data.matricule)
        .input("age", sql.Int, data.age)
        .input("telephone", sql.VarChar, data.telephone)
        .input("tel_parent", sql.VarChar, data.tel_parent)
        .input("chambre", sql.NVarChar(50), data.chambre || null)
        .input("etat", sql.VarChar, data.etat)
        .input("type", sql.VarChar, data.type)
        .input("cotisation", sql.Decimal(10, 2), data.cotisation)
        .input("reste", sql.Decimal(10, 2), data.reste)
        .input("date_entree", sql.Date, data.date_entree)
        .input("date_sortie", sql.Date, data.date_sortie)
        .input("cin", sql.BigInt, data.cin)
        .input("email", sql.VarChar, data.email)
        .input("foyer_id", sql.Int, data.foyer_id)
        .query(`
            INSERT INTO Resident (
                nom_complet, matricule, age, telephone, tel_parent, chambre,
                etat, type, cotisation, reste, date_entree, date_sortie,
                cin, email, foyer_id
            )
            OUTPUT INSERTED.*
            VALUES (
                @nom_complet, @matricule, @age, @telephone, @tel_parent, @chambre,
                @etat, @type, @cotisation, @reste, @date_entree, @date_sortie,
                @cin, @email, @foyer_id
            )
        `);

    return result.recordset[0] || null;
}

async function updateResident(id, data) {
    const pool = await getPool();
    const result = await pool.request()
        .input("id", sql.Int, id)
        .input("nom_complet", sql.VarChar, data.nom_complet)
        .input("matricule", sql.VarChar, data.matricule)
        .input("age", sql.Int, data.age)
        .input("telephone", sql.VarChar, data.telephone)
        .input("tel_parent", sql.VarChar, data.tel_parent)
        .input("chambre", sql.VarChar, data.chambre)
        .input("etat", sql.VarChar, data.etat)
        .input("type", sql.VarChar, data.type)
        .input("cotisation", sql.Decimal(10, 2), data.cotisation)
        .input("reste", sql.Decimal(10, 2), data.reste)
        .input("date_entree", sql.Date, data.date_entree)
        .input("date_sortie", sql.Date, data.date_sortie)
        .input("cin", sql.BigInt, data.cin)
        .input("email", sql.VarChar, data.email)
        .input("foyer_id", sql.Int, data.foyer_id)
        .query(`
            UPDATE Resident
            SET
                nom_complet = @nom_complet,
                matricule = @matricule,
                age = @age,
                telephone = @telephone,
                tel_parent = @tel_parent,
                chambre = @chambre,
                etat = @etat,
                type = @type,
                cotisation = @cotisation,
                reste = @reste,
                date_entree = @date_entree,
                date_sortie = @date_sortie,
                cin = @cin,
                email = @email,
                foyer_id = @foyer_id
            OUTPUT INSERTED.*
            WHERE id = @id
        `);

    return {
        rowsAffected: result.rowsAffected[0] || 0,
        resident: result.recordset[0] || null,
    };
}

async function deleteResident(id) {
    const pool = await getPool();
    const result = await pool.request()
        .input("id", sql.Int, id)
        .query("DELETE FROM Resident WHERE id = @id");

    return result.rowsAffected[0] || 0;
}

module.exports = {
    findActiveResidentByMatricule,
    getResidentsByFoyerId,
    createResident,
    updateResident,
    deleteResident,
};
