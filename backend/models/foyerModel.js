const { sql, getPool } = require("../config/db");

async function getAllFoyers() {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT id, nom, capacite, adresse, telephone
        FROM Foyer
        ORDER BY id ASC
    `);
    return result.recordset;
}

async function getFoyerById(id) {
    const pool = await getPool();
    const result = await pool.request()
        .input("id", sql.Int, id)
        .query(`
            SELECT TOP 1 id, nom, capacite, adresse, telephone
            FROM Foyer
            WHERE id = @id
        `);

    return result.recordset[0] || null;
}

module.exports = {
    getAllFoyers,
    getFoyerById,
};

