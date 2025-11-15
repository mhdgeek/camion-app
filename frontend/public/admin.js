console.log('🚀 admin.js chargé avec succès!');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let authToken = null;

// Éléments DOM
const loginPage = document.getElementById('login-page');
const adminInterface = document.getElementById('admin-interface');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

console.log('🔍 Éléments DOM:', {
    loginPage: !!loginPage,
    adminInterface: !!adminInterface, 
    loginForm: !!loginForm,
    loginMessage: !!loginMessage
});

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM Content Loaded - Initialisation admin');
    initializeAdmin();
});

function initializeAdmin() {
    console.log('🔧 Initialisation de l\'interface admin...');
    
    // Vérifier si l'utilisateur est déjà connecté
    const savedToken = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser');
    
    console.log('📦 Données sauvegardées:', {
        token: !!savedToken,
        user: !!savedUser
    });
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        
        if (currentUser.role === 'admin') {
            console.log('✅ Utilisateur admin déjà connecté');
            showAdminInterface();
        } else {
            console.log('❌ Utilisateur non admin');
            showMessage('error', 'Accès réservé aux administrateurs');
            logout();
        }
    }
    
    // Événements
    if (loginForm) {
        console.log('✅ Ajout écouteur sur formulaire login');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.log('❌ Formulaire login non trouvé');
    }
    
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }
}

// Gestion de l'authentification
async function handleLogin(e) {
    e.preventDefault();
    console.log('🎯 Soumission du formulaire de connexion');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('🔐 Identifiants saisis:', { email, password });
    
    // Validation des champs
    if (!email || !password) {
        showMessage('error', '❌ Veuillez remplir tous les champs');
        return;
    }
    
    try {
        showMessage('loading', '<i class="fas fa-spinner fa-spin"></i> Connexion en cours...');
        
        console.log('🔌 Tentative de connexion API...');
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('📡 Réponse API reçue - Status:', response.status);
        
        const data = await response.json();
        console.log('📊 Données API:', data);
        
        if (response.ok) {
            if (data.user.role === 'admin') {
                authToken = data.token;
                currentUser = data.user;
                
                // Sauvegarder dans le localStorage
                localStorage.setItem('adminToken', authToken);
                localStorage.setItem('adminUser', JSON.stringify(currentUser));
                
                console.log('✅ Connexion réussie - Données sauvegardées');
                showMessage('success', '✅ Connexion réussie! Redirection...');
                
                // Redirection IMMÉDIATE
                console.log('🔄 Début redirection...');
                showAdminInterface();
                
            } else {
                console.log('❌ Utilisateur non admin');
                showMessage('error', '❌ Accès réservé aux administrateurs');
            }
        } else {
            console.log('❌ Erreur API:', data.message);
            showMessage('error', '❌ ' + (data.message || 'Erreur de connexion'));
        }
    } catch (error) {
        console.error('💥 Erreur connexion:', error);
        showMessage('error', '🔌 Erreur de connexion au serveur');
    }
}

function logout() {
    console.log('🚪 Déconnexion');
    authToken = null;
    currentUser = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    showLoginInterface();
    showMessage('success', '👋 Déconnexion réussie!');
}

function showLoginInterface() {
    console.log('🔐 Affichage interface login');
    
    if (loginPage) {
        loginPage.style.display = 'flex';
        console.log('✅ Login page affichée');
    } else {
        console.log('❌ Login page non trouvée');
    }
    
    if (adminInterface) {
        adminInterface.style.display = 'none';
        console.log('✅ Admin interface cachée');
    } else {
        console.log('❌ Admin interface non trouvée');
    }
    
    if (loginForm) loginForm.reset();
}

function showAdminInterface() {
    console.log('📊 DEBUT - Affichage interface admin');
    console.log('📊 Éléments avant changement:', {
        loginPageDisplay: loginPage ? loginPage.style.display : 'N/A',
        adminInterfaceDisplay: adminInterface ? adminInterface.style.display : 'N/A'
    });
    
    // Cacher la page de login
    if (loginPage) {
        loginPage.style.display = 'none';
        console.log('✅ Login page cachée');
    }
    
    // Afficher l'interface admin
    if (adminInterface) {
        adminInterface.style.display = 'block';
        console.log('✅ Admin interface affichée');
        
        // Mettre à jour le nom d'utilisateur
        const userName = document.getElementById('user-name');
        if (userName && currentUser) {
            userName.textContent = currentUser.nom;
            console.log('✅ Nom utilisateur mis à jour:', currentUser.nom);
        }
        
        // Initialiser la navigation
        initializeNavigation();
        
    } else {
        console.log('❌ CRITIQUE: Admin interface non trouvée!');
    }
    
    console.log('📊 FIN - Affichage interface admin');
    console.log('📊 Éléments après changement:', {
        loginPageDisplay: loginPage ? loginPage.style.display : 'N/A',
        adminInterfaceDisplay: adminInterface ? adminInterface.style.display : 'N/A'
    });
}

function initializeNavigation() {
    console.log('🧭 Initialisation navigation');
    
    const navButtons = document.querySelectorAll('.admin-nav-btn');
    const sections = document.querySelectorAll('.admin-section');
    
    console.log('🔍 Navigation trouvée:', {
        boutons: navButtons.length,
        sections: sections.length
    });
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.dataset.section;
            console.log('📍 Navigation vers:', section);
            
            // Mettre à jour les boutons actifs
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Afficher/masquer les sections
            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === `section-${section}`) {
                    sec.classList.add('active');
                    console.log('✅ Section activée:', sec.id);
                }
            });
        });
    });
    
    // Activer la première section par défaut
    if (navButtons.length > 0) {
        const firstBtn = navButtons[0];
        firstBtn.click();
        console.log('✅ Navigation initialisée - Première section activée');
    }
}

function showMessage(type, text, element = loginMessage) {
    if (element) {
        element.innerHTML = text;
        element.className = `message ${type}`;
        
        console.log('📢 Message affiché:', type, text);
        
        // Auto-suppression pour les messages de succès et d'erreur
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (element.parentNode) {
                    element.innerHTML = '';
                    element.className = 'message';
                }
            }, 5000);
        }
    }
}

console.log('✅ admin.js entièrement initialisé');
