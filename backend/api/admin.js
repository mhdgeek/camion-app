const express = require('express');
const Camion = require('../models/Camion');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes admin nécessitent une authentification admin
router.use(auth);
router.use(adminAuth);

// Stats globales
router.get('/stats-globales', async (req, res) => {
  try {
    const aujourdhui = new Date().toISOString().split('T')[0];
    
    const stats = await Camion.aggregate([
      {
        $facet: {
          globales: [
            {
              $group: {
                _id: null,
                totalCamions: { $sum: 1 },
                totalRevenus: { $sum: '$montantPaye' },
                camionsSortis: { $sum: { $cond: [{ $eq: ['$statut', 'sorti'] }, 1, 0] } }
              }
            }
          ],
          aujourdhui: [
            {
              $match: { dateEntree: aujourdhui }
            },
            {
              $group: {
                _id: null,
                camionsEntres: { $sum: 1 },
                revenusJour: { $sum: '$montantPaye' }
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
        camionsSortis: result.globales[0]?.camionsSortis || 0
      },
      aujourdhui: {
        camionsEntres: result.aujourdhui[0]?.camionsEntres || 0,
        revenus: result.aujourdhui[0]?.revenusJour || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
