const express = require('express');
const Camion = require('../models/Camion');

const router = express.Router();

// Get all camions
router.get('/', async (req, res) => {
  try {
    const camions = await Camion.find().sort({ heureArrivee: -1 });
    res.json(camions);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Entrée d'un camion
router.post('/entree', async (req, res) => {
  try {
    const { plaque, chauffeur } = req.body;

    // Vérifier si le camion est déjà entré aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const existingCamion = await Camion.findOne({ 
      plaque, 
      dateEntree: today,
      statut: { $ne: 'sorti' }
    });

    if (existingCamion) {
      return res.status(400).json({ message: 'Ce camion est déjà entré aujourd\'hui' });
    }

    // Compter les camions du jour pour l'ordre d'arrivée
    const camionsCount = await Camion.countDocuments({ dateEntree: today });
    
    const camion = new Camion({
      plaque,
      chauffeur,
      ordreArrivee: camionsCount + 1
    });

    await camion.save();
    res.status(201).json({
      message: 'Camion enregistré avec succès',
      camion
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
