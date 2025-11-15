const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camion-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connecté'))
.catch(err => console.log('Erreur MongoDB:', err));

// Routes
app.use('/api/camions', require('./routes/camions'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ message: 'API fonctionne!' });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'API Camion App - Backend fonctionnel',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      camions: '/api/camions',
      admin: '/api/admin'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
