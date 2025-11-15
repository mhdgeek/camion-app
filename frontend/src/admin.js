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
    
    console.log('Token sauvegardé:', !!savedToken);
    console.log('User sauvegardé:', !!savedUser);
    
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

    // Ajouter des écouteurs pour effacer les erreurs quand l'utilisateur tape
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.addEventListener('input', clearError);
    }
    if (passwordInput) {
        passwordInput.addEventListener('input', clearError);
    }
}

function clearError() {
    const messageElement = document.getElementById('login-message');
    if (messageElement && messageElement.classList.contains('error')) {
        messageElement.innerHTML = '';
        messageElement.className = 'message';
    }
}

// Gestion de l'authentification
async function handleLogin(e) {
    e.preventDefault();
    console.log('🎯 Soumission du formulaire de connexion');
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('Tentative de connexion avec:', { email, password });
    
    // Validation des champs
    if (!email || !password) {
        showMessage('error', '❌ Veuillez remplir tous les champs');
        shakeForm();
        return;
    }

    // Validation du format email
    if (!isValidEmail(email)) {
        showMessage('error', '❌ Format d\'email invalide');
        shakeForm();
        return;
    }
    
    try {
        // Afficher le chargement
        showMessage('loading', '<i class="fas fa-spinner fa-spin"></i> Connexion en cours...');
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('Réponse API:', response.status);
        
        const data = await response.json();
        console.log('Données reçues:', data);
        
        if (response.ok) {
            if (data.user.role === 'admin') {
                authToken = data.token;
                currentUser = data.user;
                
                // Sauvegarder dans le localStorage
                localStorage.setItem('adminToken', authToken);
                localStorage.setItem('adminUser', JSON.stringify(currentUser));
                
                showMessage('success', '✅ Connexion réussie! Redirection...');
                console.log('✅ Connexion réussie, affichage interface admin');
                
                // Redirection IMMÉDIATE vers l'interface admin
                setTimeout(() => {
                    showAdminInterface();
                }, 1000);
                
            } else {
                showMessage('error', '❌ Accès réservé aux administrateurs');
                shakeForm();
            }
        } else {
            // Gestion spécifique des erreurs d'authentification
            if (response.status === 401) {
                showMessage('error', '❌ Email ou mot de passe incorrect');
                highlightErrorFields();
            } else if (response.status === 400) {
                showMessage('error', '❌ Données invalides');
            } else {
                showMessage('error', data.message || '❌ Erreur de connexion');
            }
            shakeForm();
        }
    } catch (error) {
        console.error('Erreur connexion:', error);
        showMessage('error', '🔌 Erreur de connexion au serveur. Vérifiez que le backend est démarré.');
        shakeForm();
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function shakeForm() {
    const loginCard = document.querySelector('.login-card');
    if (loginCard) {
        loginCard.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            loginCard.style.animation = '';
        }, 500);
    }
}

function highlightErrorFields() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.style.borderColor = 'var(--error)';
        emailInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
    }
    
    if (passwordInput) {
        passwordInput.style.borderColor = 'var(--error)';
        passwordInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
    }
    
    // Réinitialiser après 3 secondes
    setTimeout(() => {
        if (emailInput) {
            emailInput.style.borderColor = '';
            emailInput.style.boxShadow = '';
        }
        if (passwordInput) {
            passwordInput.style.borderColor = '';
            passwordInput.style.boxShadow = '';
        }
    }, 3000);
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
    }
    if (adminInterface) {
        adminInterface.style.display = 'none';
        console.log('✅ Admin interface cachée');
    }
    if (loginForm) loginForm.reset();
    
    // Réinitialiser les styles d'erreur
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.style.borderColor = '';
        emailInput.style.boxShadow = '';
    }
    if (passwordInput) {
        passwordInput.style.borderColor = '';
        passwordInput.style.boxShadow = '';
    }
}

function showAdminInterface() {
    console.log('📊 Affichage interface admin - DÉBUT');
    
    // DEBUG: Vérifier que les éléments existent
    console.log('Login page:', loginPage);
    console.log('Admin interface:', adminInterface);
    
    if (loginPage) {
        loginPage.style.display = 'none';
        console.log('✅ Login page cachée');
    } else {
        console.log('❌ Login page non trouvée');
    }
    
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
        
        // Charger les données du tableau de bord
        loadDashboardData();
    } else {
        console.log('❌ Admin interface non trouvée');
    }
    
    console.log('📊 Affichage interface admin - FIN');
}

function initializeNavigation() {
    console.log('🧭 Initialisation navigation');
    
    const navButtons = document.querySelectorAll('.admin-nav-btn');
    const sections = document.querySelectorAll('.admin-section');
    
    console.log('Boutons navigation trouvés:', navButtons.length);
    console.log('Sections trouvées:', sections.length);
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.dataset.section;
            console.log('Navigation vers:', section);
            
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
        navButtons[0].click();
    }
}

function showMessage(type, text, element = loginMessage) {
    if (element) {
        element.innerHTML = text;
        element.className = `message ${type}`;
        
        console.log('📢 Message:', type, text);
        
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

// Fonction pour charger les données du tableau de bord
async function loadDashboardData() {
    try {
        console.log('📊 Chargement des données du tableau de bord...');
        
        // Simulation de données pour le moment
        document.getElementById('total-camions').textContent = '156';
        document.getElementById('total-revenus').textContent = '7 800 000 FCFA';
        document.getElementById('camions-jour').textContent = '12';
        document.getElementById('taux-sortie').textContent = '85%';
        
        console.log('✅ Données tableau de bord chargées');
        
    } catch (error) {
        console.error('Erreur chargement données:', error);
    }
}

console.log('📋 Script admin.js prêt');

// Ajouter le CSS pour l'animation shake
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .message.loading {
        background: #dbeafe;
        color: #1e40af;
        border: 1px solid #bfdbfe;
    }
    
    .login-card {
        transition: all 0.3s ease;
    }
    
    /* Assurer que l'interface admin est bien positionnée */
    .admin-interface {
        min-height: 100vh;
        background: var(--light);
    }
    
    /* Styles pour les sections */
    .admin-section {
        display: none;
    }
    
    .admin-section.active {
        display: block;
        animation: fadeIn 0.5s ease-in;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);
