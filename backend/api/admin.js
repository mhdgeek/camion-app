const express = require('express');
const Camion = require('../models/Camion');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes admin nécessitent une authentification admin
router.use(auth);
router.use(adminAuth);

// @route   GET /api/admin/stats-globales
// @desc    Obtenir les statistiques globales détaillées
// @access  Admin
router.get('/stats-globales', async (req, res) => {
  try {
    const aujourdhui = new Date();
    const debutJour = new Date(aujourdhui);
    debutJour.setHours(0, 0, 0, 0);
    
    const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    const debutAnnee = new Date(aujourdhui.getFullYear(), 0, 1);

    const stats = await Camion.aggregate([
      {
        $facet: {
          // Stats globales
          globales: [
            {
              $group: {
                _id: null,
                totalCamions: { $sum: 1 },
                totalRevenus: { $sum: '$montantPaye' },
                camionsSortis: {
                  $sum: { $cond: [{ $eq: ['$statut', 'sorti'] }, 1, 0] }
                },
                revenusMoyens: { $avg: '$montantPaye' }
              }
            }
          ],
          // Stats du jour
          aujourdhui: [
            {
              $match: {
                dateEntree: aujourdhui.toISOString().split('T')[0]
              }
            },
            {
              $group: {
                _id: null,
                camionsEntres: { $sum: 1 },
                revenusJour: { $sum: '$montantPaye' },
                camionsSortis: {
                  $sum: { $cond: [{ $eq: ['$statut', 'sorti'] }, 1, 0] }
                }
              }
            }
          ],
          // Stats du mois
          mois: [
            {
              $match: {
                dateEntree: {
                  $gte: debutMois.toISOString().split('T')[0]
                }
              }
            },
            {
              $group: {
                _id: null,
                camionsEntres: { $sum: 1 },
                revenusMois: { $sum: '$montantPaye' },
                camionsSortis: {
                  $sum: { $cond: [{ $eq: ['$statut', 'sorti'] }, 1, 0] }
                }
              }
            }
          ],
          // Stats de l'année
          annee: [
            {
              $match: {
                dateEntree: {
                  $gte: debutAnnee.toISOString().split('T')[0]
                }
              }
            },
            {
              $group: {
                _id: null,
                camionsEntres: { $sum: 1 },
                revenusAnnee: { $sum: '$montantPaye' },
                camionsSortis: {
                  $sum: { $cond: [{ $eq: ['$statut', 'sorti'] }, 1, 0] }
                }
              }
            }
          ],
          // Évolution mensuelle (12 derniers mois)
          evolutionMensuelle: [
            {
              $match: {
                dateEntree: {
                  $gte: new Date(aujourdhui.getFullYear() - 1, aujourdhui.getMonth(), 1).toISOString().split('T')[0]
                }
              }
            },
            {
              $group: {
                _id: { $substr: ['$dateEntree', 0, 7] },
                camions: { $sum: 1 },
                revenus: { $sum: '$montantPaye' },
                camionsSortis: {
                  $sum: { $cond: [{ $eq: ['$statut', 'sorti'] }, 1, 0] }
                }
              }
            },
            { $sort: { _id: 1 } },
            { $limit: 12 }
          ],
          // Répartition par statut
          repartitionStatuts: [
            {
              $group: {
                _id: '$statut',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];
    
    res.json({
      globales: {
        totalCamions: result.globales[0]?.totalCamions || 0,
        totalRevenus: result.globales[0]?.totalRevenus || 0,
        camionsSortis: result.globales[0]?.camionsSortis || 0,
        revenusMoyens: result.globales[0]?.revenusMoyens || 0
      },
      aujourdhui: {
        camionsEntres: result.aujourdhui[0]?.camionsEntres || 0,
        revenus: result.aujourdhui[0]?.revenusJour || 0,
        camionsSortis: result.aujourdhui[0]?.camionsSortis || 0
      },
      mois: {
        camionsEntres: result.mois[0]?.camionsEntres || 0,
        revenus: result.mois[0]?.revenusMois || 0,
        camionsSortis: result.mois[0]?.camionsSortis || 0
      },
      annee: {
        camionsEntres: result.annee[0]?.camionsEntres || 0,
        revenus: result.annee[0]?.revenusAnnee || 0,
        camionsSortis: result.annee[0]?.camionsSortis || 0
      },
      evolutionMensuelle: result.evolutionMensuelle,
      repartitionStatuts: result.repartitionStatuts
    });
  } catch (err) {
    console.error('Erreur stats globales:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   GET /api/admin/camions
// @desc    Obtenir tous les camions avec pagination et filtres avancés
// @access  Admin
router.get('/camions', async (req, res) => {
  try {
    const { page = 1, limit = 50, date, statut, search, dateDebut, dateFin } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Filtre par période
    if (dateDebut || dateFin) {
      query.dateEntree = {};
      if (dateDebut) query.dateEntree.$gte = dateDebut;
      if (dateFin) query.dateEntree.$lte = dateFin;
    } else if (date) {
      query.dateEntree = date;
    }

    // Filtre par statut
    if (statut && statut !== 'all') {
      query.statut = statut;
    }

    // Recherche
    if (search) {
      query.$or = [
        { plaque: { $regex: search, $options: 'i' } },
        { chauffeur: { $regex: search, $options: 'i' } }
      ];
    }

    const camions = await Camion.find(query)
      .sort({ heureArrivee: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Camion.countDocuments(query);

    res.json({
      camions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Erreur liste camions admin:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   GET /api/admin/paiements
// @desc    Obtenir l'historique des paiements avec statistiques
// @access  Admin
router.get('/paiements', async (req, res) => {
  try {
    const { page = 1, limit = 50, dateDebut, dateFin, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { 
      statut: 'sorti',
      montantPaye: { $gt: 0 }
    };

    // Filtre par période
    if (dateDebut || dateFin) {
      query.dateEntree = {};
      if (dateDebut) query.dateEntree.$gte = dateDebut;
      if (dateFin) query.dateEntree.$lte = dateFin;
    }

    // Recherche
    if (search) {
      query.$or = [
        { plaque: { $regex: search, $options: 'i' } },
        { chauffeur: { $regex: search, $options: 'i' } }
      ];
    }

    const paiements = await Camion.find(query)
      .sort({ heureDepart: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Camion.countDocuments(query);

    // Stats détaillées des paiements
    const statsPaiements = await Camion.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPaiements: { $sum: '$montantPaye' },
          nombrePaiements: { $sum: 1 },
          moyennePaiement: { $avg: '$montantPaye' },
          paiementMax: { $max: '$montantPaye' },
          paiementMin: { $min: '$montantPaye' }
        }
      }
    ]);

    // Répartition par mois pour le graphique
    const repartitionMensuelle = await Camion.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $substr: ['$dateEntree', 0, 7] },
          total: { $sum: '$montantPaye' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    res.json({
      paiements,
      stats: statsPaiements[0] || {
        totalPaiements: 0,
        nombrePaiements: 0,
        moyennePaiement: 0,
        paiementMax: 0,
        paiementMin: 0
      },
      repartitionMensuelle,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Erreur historique paiements:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   GET /api/admin/rapport-journalier/:date
// @desc    Générer un rapport journalier détaillé
// @access  Admin
router.get('/rapport-journalier/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const rapport = await Camion.aggregate([
      {
        $match: {
          dateEntree: date
        }
      },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 },
          totalMontant: { $sum: '$montantPaye' },
          montantMoyen: { $avg: '$montantPaye' },
          camions: {
            $push: {
              plaque: '$plaque',
              chauffeur: '$chauffeur',
              heureArrivee: '$heureArrivee',
              heureDepart: '$heureDepart',
              montantPaye: '$montantPaye',
              statut: '$statut'
            }
          }
        }
      }
    ]);

    const statsGlobales = await Camion.aggregate([
      {
        $match: {
          dateEntree: date
        }
      },
      {
        $group: {
          _id: null,
          totalCamions: { $sum: 1 },
          totalRevenus: { $sum: '$montantPaye' },
          camionsSortis: {
            $sum: { $cond: [{ $eq: ['$statut', 'sorti'] }, 1, 0] }
          },
          revenusMoyens: { $avg: '$montantPaye' }
        }
      }
    ]);

    // Heures de pointe
    const heuresPointe = await Camion.aggregate([
      {
        $match: {
          dateEntree: date
        }
      },
      {
        $group: {
          _id: { $hour: { $toDate: '$heureArrivee' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      date,
      stats: statsGlobales[0] || {
        totalCamions: 0,
        totalRevenus: 0,
        camionsSortis: 0,
        revenusMoyens: 0
      },
      details: rapport,
      heuresPointe
    });
  } catch (err) {
    console.error('Erreur rapport journalier:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// @route   GET /api/admin/stats-detaillees
// @desc    Obtenir des statistiques détaillées par période
// @access  Admin
router.get('/stats-detaillees', async (req, res) => {
  try {
    const { periode = 'jour', date } = req.query;
    const aujourdhui = new Date();
    
    let matchStage = {};
    
    switch(periode) {
      case 'jour':
        matchStage.dateEntree = date || aujourdhui.toISOString().split('T')[0];
        break;
      case 'semaine':
        const debutSemaine = new Date(aujourdhui);
        debutSemaine.setDate(aujourdhui.getDate() - aujourdhui.getDay());
        matchStage.dateEntree = {
          $gte: debutSemaine.toISOString().split('T')[0],
          $lte: aujourdhui.toISOString().split('T')[0]
        };
        break;
      case 'mois':
        const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
        matchStage.dateEntree = {
          $gte: debutMois.toISOString().split('T')[0],
          $lte: aujourdhui.toISOString().split('T')[0]
        };
        break;
      case 'annee':
        const debutAnnee = new Date(aujourdhui.getFullYear(), 0, 1);
        matchStage.dateEntree = {
          $gte: debutAnnee.toISOString().split('T')[0],
          $lte: aujourdhui.toISOString().split('T')[0]
        };
        break;
    }

    const stats = await Camion.aggregate([
      { $match: matchStage },
      {
        $facet: {
          resume: [
            {
              $group: {
                _id: null,
                totalCamions: { $sum: 1 },
                totalRevenus: { $sum: '$montantPaye' },
                camionsSortis: { $sum: { $cond: [{ $eq: ['$statut', 'sorti'] }, 1, 0] } },
                revenusMoyens: { $avg: '$montantPaye' }
              }
            }
          ],
          parStatut: [
            {
              $group: {
                _id: '$statut',
                count: { $sum: 1 },
                totalMontant: { $sum: '$montantPaye' }
              }
            }
          ],
          parJour: [
            {
              $group: {
                _id: '$dateEntree',
                camions: { $sum: 1 },
                revenus: { $sum: '$montantPaye' }
              }
            },
            { $sort: { _id: 1 } }
          ],
          topChauffeurs: [
            {
              $group: {
                _id: '$chauffeur',
                count: { $sum: 1 },
                totalMontant: { $sum: '$montantPaye' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    res.json({
      periode,
      date: date || aujourdhui.toISOString().split('T')[0],
      stats: stats[0]
    });
  } catch (err) {
    console.error('Erreur stats détaillées:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
