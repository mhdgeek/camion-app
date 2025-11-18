const mongoose = require('mongoose');

const CamionSchema = new mongoose.Schema({
  plaque: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  chauffeur: {
    type: String,
    required: true,
    trim: true
  },
  dateEntree: {
    type: String,
    required: true
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
  }
}, {
  timestamps: true
});

CamionSchema.pre('save', function(next) {
  if (!this.dateEntree) {
    this.dateEntree = new Date().toISOString().split('T')[0];
  }
  next();
});

module.exports = mongoose.model('Camion', CamionSchema);
