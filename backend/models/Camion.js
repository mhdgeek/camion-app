const mongoose = require('mongoose');

const CamionSchema = new mongoose.Schema({
  plaque: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  chauffeur: {
    type: String,
    required: true,
    trim: true
  },
  heureArrivee: {
    type: Date,
    default: Date.now
  },
  heureDepart: {
    type: Date
  },
  statut: {
    type: String,
    enum: ['en_attente', 'charge', 'paye', 'sorti'],
    default: 'en_attente'
  },
  montantDu: {
    type: Number,
    default: 0
  },
  montantPaye: {
    type: Number,
    default: 0
  },
  ordreArrivee: {
    type: Number
  },
  dateEntree: {
    type: String, // Format: YYYY-MM-DD
    default: function() {
      return new Date().toISOString().split('T')[0];
    }
  },
  dateSortie: {
    type: String
  }
}, {
  timestamps: true
});

// Middleware pour automatiser l'ordre d'arrivée
CamionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Camion').countDocuments();
    this.ordreArrivee = count + 1;
    this.dateEntree = new Date().toISOString().split('T')[0];
  }
  next();
});

module.exports = mongoose.model('Camion', CamionSchema);
