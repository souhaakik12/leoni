const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

function toNullableNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
}

const config = {
    user: "sa",
    password: "1292003",
    server: "localhost",
    port: 1433,
    database: "GestionRecrutement",
    options: {
        trustServerCertificate: true,
        encrypt: false
    }
};

// route test
app.get("/", (req, res) => {
    res.send("Backend fonctionne !");
});

// ✅ route employes
app.get("/employes", async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query("SELECT * FROM Employe");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// lancer serveur
app.listen(3000, () => {
    console.log("Server running on port 3000"); 

}); 

app.post('/api/resident', async (req, res) => {
    try {
        const data = req.body;
        const matricule = typeof data.matricule === 'string'
            ? data.matricule.trim()
            : (data.matricule == null ? '' : String(data.matricule));
        const age = toNullableNumber(data.age);
        const cin = toNullableNumber(data.cin);

        const pool = await sql.connect(config);

        const result = await pool.request()
            .input('nom', sql.VarChar, data.nom_complet)
            .input('matricule', sql.VarChar, matricule)
            .input('age', sql.Int, age)
            .input('telephone', sql.VarChar, data.telephone)
            .input('tel_parent', sql.VarChar, data.tel_parent)
            .input('chambre', sql.VarChar, data.chambre)
            .input('etat', sql.VarChar, data.etat)
            .input('date_entree', sql.Date, data.date_entree)
            .input('date_sortie', sql.Date, data.date_sortie || null)
            .input('cin', sql.BigInt, cin)
            .input('email', sql.VarChar, data.email)
            .input('foyer_id', sql.Int, data.foyer_id)
            .input('cotisation', sql.Decimal(10,2), data.cotisation)
            .input('reste', sql.Decimal(10,2), data.reste)
            .query(`
                INSERT INTO Resident 
                (nom_complet, matricule, age, telephone, tel_parent, chambre, etat, date_entree, date_sortie, cin, email, foyer_id, cotisation, reste)
                OUTPUT INSERTED.*
                VALUES 
                (@nom, @matricule, @age, @telephone, @tel_parent, @chambre, @etat, @date_entree, @date_sortie, @cin, @email, @foyer_id, @cotisation, @reste)
            `);

        res.status(201).json(result.recordset[0] || { message: "Resident ajoute" });

    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
}); 
app.get('/api/resident/:foyer_id', async (req, res) => {
    try {
        const foyer_id = req.params.foyer_id;

        const pool = await sql.connect(config);

        const result = await pool.request()
            .input('foyer_id', sql.Int, foyer_id)
            .query("SELECT * FROM Resident WHERE foyer_id = @foyer_id");

        res.json(result.recordset);

    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.put('/api/resident/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid resident id" });
        }

        const data = req.body;
        const matricule = typeof data.matricule === 'string'
            ? data.matricule.trim()
            : (data.matricule == null ? '' : String(data.matricule));
        const age = toNullableNumber(data.age);
        const cin = toNullableNumber(data.cin);
        const pool = await sql.connect(config);

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nom_complet', sql.VarChar, data.nom_complet)
            .input('age', sql.Int, age)
            .input('telephone', sql.VarChar, data.telephone)
            .input('tel_parent', sql.VarChar, data.tel_parent)
            .input('chambre', sql.VarChar, data.chambre)
            .input('etat', sql.VarChar, data.etat)
            .input('date_entree', sql.Date, data.date_entree)
            .input('date_sortie', sql.Date, data.date_sortie || null)
            .input('email', sql.VarChar, data.email)
            .input('matricule', sql.VarChar, matricule)
            .input('cin', sql.BigInt, cin)
            .query(`
                UPDATE Resident
                SET
                    nom_complet = @nom_complet,
                    age = @age,
                    telephone = @telephone,
                    tel_parent = @tel_parent,
                    chambre = @chambre,
                    etat = @etat,
                    date_entree = @date_entree,
                    date_sortie = @date_sortie,
                    email = @email,
                    matricule = @matricule,
                    cin = @cin
                OUTPUT INSERTED.*
                WHERE id = @id
            `);

        if (!result.rowsAffected[0]) {
            return res.status(404).json({ message: "Resident not found" });
        }

        res.json(result.recordset[0] || { message: "Resident modifie" });
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.delete('/api/resident/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid resident id" });
        }

        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query("DELETE FROM Resident WHERE id = @id");

        if (!result.rowsAffected[0]) {
            return res.status(404).json({ message: "Resident not found" });
        }

        res.json({ message: "Resident supprimé" });
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.get('/api/foyer/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid foyer id" });
        }

        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT TOP 1 id, nom, capacite, adresse, telephone
                FROM Foyer
                WHERE id = @id
            `);

        if (!result.recordset.length) {
            return res.status(404).json({ message: "Foyer not found" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.get('/api/foyers', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT id, nom, capacite, adresse, telephone
            FROM Foyer
            ORDER BY id ASC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});


