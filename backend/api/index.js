const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware CORS pour Vercel
app.use(cors({
  origin: [
    'https://camion-app-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  credentials: true
}));

app.use(express.json());

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.log('❌ Erreur MongoDB:', err));

// Import des routes
app.use('/camions', require('./camions'));
app.use('/auth', require('./auth'));
app.use('/admin', require('./admin'));

// Route de test
app.get('/test', (req, res) => {
  res.json({ 
    message: '✅ API fonctionne sur Vercel!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Camion App - Backend Vercel',
    version: '1.0.0',
    endpoints: ['/test', '/auth/login', '/camions', '/admin/stats']
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

module.exports = app;
