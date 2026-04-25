const foyerModel = require("../models/foyerModel");

async function getAllFoyers(req, res) {
    try {
        const foyers = await foyerModel.getAllFoyers();
        return res.json(foyers);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur lors du chargement des foyers." });
    }
}

async function getFoyerById(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid foyer id" });
        }

        const foyer = await foyerModel.getFoyerById(id);
        if (!foyer) {
            return res.status(404).json({ message: "Foyer not found" });
        }

        return res.json(foyer);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur lors du chargement du foyer." });
    }
}

module.exports = {
    getAllFoyers,
    getFoyerById,
};

