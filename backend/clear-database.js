const mongoose = require('mongoose');
require('dotenv').config();

async function clearDatabase() {
    try {
        console.log('🗑️  Suppression des données...');
        
        // Connexion
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camion-app');
        console.log('✅ Connecté à MongoDB');
        
        // Supprimer TOUTES les données
        const collections = mongoose.connection.collections;
        
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
            console.log(`✅ Collection ${key} vidée`);
        }
        
        console.log('🎉 Toutes les données ont été supprimées!');
        
        // Recréer uniquement l'admin
        console.log('👤 Recréation de l\'utilisateur admin...');
        const User = require('./models/User');
        const admin = new User({
            nom: 'Administrateur',
            email: 'admin@carriere.com',
            password: 'admin123',
            role: 'admin'
        });
        await admin.save();
        console.log('✅ Admin recréé:', admin.email);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Connexion fermée');
    }
}

clearDatabase();
