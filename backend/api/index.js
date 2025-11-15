const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.log('❌ Erreur MongoDB:', err));

// Routes
app.use('/camions', require('./camions'));
app.use('/auth', require('./auth'));
app.use('/admin', require('./admin'));

// Route de test
app.get('/test', (req, res) => {
  res.json({ 
    message: '✅ API fonctionne sur Vercel!',
    timestamp: new Date().toISOString()
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Camion App - Backend Vercel',
    version: '1.0.0'
  });
});

module.exports = app;
