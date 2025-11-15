const mongoose = require('mongoose');
require('dotenv').config();

async function resetDatabase() {
    try {
        console.log('🔄 Réinitialisation complète de la base...');
        
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/camion-app';
        
        // Connexion
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté à MongoDB');
        
        // Supprimer la base complète
        await mongoose.connection.db.dropDatabase();
        console.log('✅ Base de données supprimée');
        
        // Recréer l'admin
        const User = require('./models/User');
        const admin = new User({
            nom: 'Administrateur Principal',
            email: 'admin@carriere.com',
            password: 'admin123',
            role: 'admin'
        });
        await admin.save();
        console.log('✅ Admin recréé:', admin.email);
        
        // Créer quelques données de test
        const Camion = require('./models/Camion');
        const camionsTest = [
            {
                plaque: 'AB-123-CD',
                chauffeur: 'Jean Dupont',
                dateEntree: '2024-01-15',
                statut: 'sorti',
                montantPaye: 50000,
                ordreArrivee: 1
            },
            {
                plaque: 'EF-456-GH', 
                chauffeur: 'Pierre Martin',
                dateEntree: '2024-01-15',
                statut: 'charge',
                montantDu: 50000,
                ordreArrivee: 2
            },
            {
                plaque: 'IJ-789-KL',
                chauffeur: 'Mohamed Ali',
                dateEntree: '2024-01-15', 
                statut: 'en_attente',
                ordreArrivee: 3
            }
        ];
        
        await Camion.insertMany(camionsTest);
        console.log('✅ 3 camions de test créés');
        
        // Statistiques finales
        const userCount = await User.countDocuments();
        const camionCount = await Camion.countDocuments();
        
        console.log('📊 Statistiques finales:');
        console.log('   👥 Utilisateurs:', userCount);
        console.log('   🚛 Camions:', camionCount);
        console.log('🎉 Base réinitialisée avec succès!');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

resetDatabase();
