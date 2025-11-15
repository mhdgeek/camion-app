const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdminUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camion-app');
        console.log('✅ Connecté à MongoDB');

        // Vérifier si l'admin existe déjà
        const existingAdmin = await User.findOne({ email: 'admin@carriere.com' });
        
        if (existingAdmin) {
            console.log('✅ Utilisateur admin existe déjà');
            console.log('📧 Email:', existingAdmin.email);
            console.log('🔑 Mot de passe: admin123');
            console.log('👤 Rôle:', existingAdmin.role);
            return;
        }
        
        // Créer l'admin
        const admin = new User({
            nom: 'Administrateur Principal',
            email: 'admin@carriere.com',
            password: 'admin123', // Serra hashé automatiquement
            role: 'admin'
        });
        
        await admin.save();
        console.log('🎉 Utilisateur admin créé avec succès!');
        console.log('📧 Email: admin@carriere.com');
        console.log('🔑 Mot de passe: admin123');
        console.log('👤 Rôle: admin');
        console.log('💡 Vous pouvez maintenant vous connecter à l\'interface admin');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Déconnecté de MongoDB');
    }
}

createAdminUser();
