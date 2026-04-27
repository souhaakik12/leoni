const sql = require("mssql");
const config = require("../../config");

function mapNames(result) {
    return (result.recordset || [])
        .map((row) => String(row?.nom ?? "").trim())
        .filter((nom) => nom.length > 0);
}

exports.getEntretienOptions = async (_req, res) => {
    try {
        const pool = await sql.connect(config);

        const fonctionsResult = await pool.request().query(`
            SELECT nom
            FROM dbo.ref_fonctions
            WHERE actif = 1
            ORDER BY nom;
        `);

        const segmentsResult = await pool.request().query(`
            SELECT nom
            FROM dbo.ref_segments
            WHERE actif = 1
            ORDER BY nom;
        `);

        const projetsResult = await pool.request().query(`
            SELECT nom
            FROM dbo.ref_projets
            WHERE actif = 1
            ORDER BY nom;
        `);

        const sitesResult = await pool.request().query(`
            SELECT nom
            FROM dbo.ref_sites
            WHERE actif = 1
            ORDER BY nom;
        `);

        return res.json({
            fonctions: mapNames(fonctionsResult),
            segments: mapNames(segmentsResult),
            projets: mapNames(projetsResult),
            sites: mapNames(sitesResult),
        });
    } catch (err) {
        console.error("Erreur getEntretienOptions:", err);
        return res.status(500).json({ message: "Chargement des options entretien impossible." });
    }
};
