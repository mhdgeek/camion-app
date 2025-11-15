const express = require('express');
const router = express.Router();
const Camion = require('../models/Camion');

// @route   POST /api/camions/entree
// @desc    Enregistrer un nouveau camion
// @access  Public
router.post('/entree', async (req, res) => {
  try {
    const { plaque, chauffeur } = req.body;

    // Vérifier si le camion existe déjà et n'est pas sorti
    const camionExistant = await Camion.findOne({ 
      plaque: plaque.toUpperCase(),
      statut: { $ne: 'sorti' }
    });
    
    if (camionExistant) {
      return res.status(400).json({ 
        message: 'Un camion avec cette plaque est déjà enregistré et n\'est pas encore sorti' 
      });
    }

    const nouveauCamion = new Camion({
      plaque: plaque.toUpperCase(),
      chauffeur
    });
    
    const camion = await nouveauCamion.save();
    res.status(201).json(camion);
  } catch (err) {
    console.error('Erreur enregistrement camion:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   GET /api/camions
// @desc    Obtenir tous les camions triés par heure d'arrivée
// @access  Public
router.get('/', async (req, res) => {
  try {
    const camions = await Camion.find().sort({ heureArrivee: 1 });
    res.json(camions);
  } catch (err) {
    console.error('Erreur récupération camions:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   GET /api/camions/historique
// @desc    Obtenir l'historique avec recherche
// @access  Public
router.get('/historique', async (req, res) => {
  try {
    const { date, search } = req.query;
    let query = {};
    
    // Filtre par date
    if (date) {
      query.dateEntree = date;
    }
    
    // Recherche par plaque ou chauffeur
    if (search) {
      query.$or = [
        { plaque: { $regex: search, $options: 'i' } },
        { chauffeur: { $regex: search, $options: 'i' } }
      ];
    }
    
    const camions = await Camion.find(query).sort({ heureArrivee: -1 });
    res.json(camions);
  } catch (err) {
    console.error('Erreur historique camions:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   PUT /api/camions/charger/:id
// @desc    Marquer un camion comme chargé
// @access  Public
router.put('/charger/:id', async (req, res) => {
  try {
    const camion = await Camion.findByIdAndUpdate(
      req.params.id,
      { statut: 'charge' },
      { new: true }
    );
    
    if (!camion) {
      return res.status(404).json({ message: 'Camion non trouvé' });
    }
    
    res.json(camion);
  } catch (err) {
    console.error('Erreur chargement camion:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   PUT /api/camions/valider-chargement
// @desc    Valider tous les camions chargés et définir les montants
// @access  Public
router.put('/valider-chargement', async (req, res) => {
  try {
    const { montants } = req.body;
    
    if (!montants || !Array.isArray(montants)) {
      return res.status(400).json({ message: 'Données invalides' });
    }
    
    for (let item of montants) {
      await Camion.findByIdAndUpdate(item.camionId, {
        statut: 'paye',
        montantDu: item.montant
      });
    }
    
    res.json({ message: 'Chargement validé et montants définis' });
  } catch (err) {
    console.error('Erreur validation chargement:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   PUT /api/camions/sortie/:id
// @desc    Enregistrer la sortie (sans saisie de montant)
// @access  Public
router.put('/sortie/:id', async (req, res) => {
  try {
    const camion = await Camion.findByIdAndUpdate(
      req.params.id,
      {
        statut: 'sorti',
        montantPaye: req.body.montantPaye || 0, // Montant optionnel
        heureDepart: Date.now(),
        dateSortie: new Date().toISOString().split('T')[0]
      },
      { new: true }
    );
    
    if (!camion) {
      return res.status(404).json({ message: 'Camion non trouvé' });
    }
    
    res.json(camion);
  } catch (err) {
    console.error('Erreur sortie camion:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   GET /api/camions/stats
// @desc    Obtenir les statistiques
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const totalCamions = await Camion.countDocuments();
    const enAttente = await Camion.countDocuments({ statut: 'en_attente' });
    const charges = await Camion.countDocuments({ statut: 'charge' });
    const payes = await Camion.countDocuments({ statut: 'paye' });
    const sortis = await Camion.countDocuments({ statut: 'sorti' });
    
    // Camions non sortis (pour l'alerte visuelle)
    const nonSortis = await Camion.countDocuments({ 
      statut: { $in: ['en_attente', 'charge', 'paye'] } 
    });
    
    res.json({
      totalCamions,
      enAttente,
      charges,
      payes,
      sortis,
      nonSortis
    });
  } catch (err) {
    console.error('Erreur statistiques:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
