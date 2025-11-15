const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdminNow() {
    try {
        await mongoose.connect('mongodb://localhost:27017/camion-app');
        console.log('✅ Connecté à MongoDB');

        // Vérifier si l'admin existe
        const existingAdmin = await mongoose.connection.collection('users').findOne({ 
            email: 'admin@carriere.com' 
        });

        if (existingAdmin) {
            console.log('✅ Admin existe déjà:', existingAdmin);
            return;
        }

        // Hasher le mot de passe
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash('admin123', saltRounds);

        // Créer l'admin
        const adminUser = {
            nom: 'Administrateur',
            email: 'admin@carriere.com',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await mongoose.connection.collection('users').insertOne(adminUser);
        console.log('✅ Admin créé avec succès!');
        console.log('📧 Email: admin@carriere.com');
        console.log('🔑 Mot de passe: admin123');
        console.log('📝 ID:', result.insertedId);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Déconnecté de MongoDB');
    }
}

createAdminNow();
