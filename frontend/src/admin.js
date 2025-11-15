// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let authToken = null;
let currentSection = 'dashboard';

// Éléments DOM
const loginPage = document.getElementById('login-page');
const adminInterface = document.getElementById('admin-interface');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const btnLogout = document.getElementById('btn-logout');
const adminNavBtns = document.querySelectorAll('.admin-nav-btn');
const adminSections = document.querySelectorAll('.admin-section');

// Données globales
let globalStats = {};
let evolutionChart = null;
let statutsChart = null;
let paiementsChart = null;
let performanceChart = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de l\'interface admin...');
    initializeAdmin();
});

function initializeAdmin() {
    // Vérifier si l'utilisateur est déjà connecté
    const savedToken = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        
        // Vérifier si l'utilisateur est admin
        if (currentUser.role === 'admin') {
            showAdminInterface();
            loadDashboard();
        } else {
            showMessage('error', 'Accès réservé aux administrateurs');
            logout();
        }
    }
    
    // Configuration des écouteurs d'événements
    setupEventListeners();
    
    console.log('✅ Interface admin initialisée');
}

function setupEventListeners() {
    // Authentification
    loginForm.addEventListener('submit', handleLogin);
    btnLogout.addEventListener('click', logout);
    
    // Navigation
    adminNavBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            switchSection(section);
        });
    });
    
    // Filtres camions
    document.getElementById('btn-apply-filters')?.addEventListener('click', () => loadCamions(1));
    document.getElementById('btn-reset-filters')?.addEventListener('click', resetFiltersCamions);
    
    // Filtres paiements
    document.getElementById('btn-apply-paiements')?.addEventListener('click', () => loadPaiements(1));
    
    // Rapports
    document.getElementById('btn-generer-rapport')?.addEventListener('click', genererRapport);
    document.getElementById('btn-stats-avancees')?.addEventListener('click', chargerStatsAvancees);
    
    // Actions des graphiques
    document.querySelectorAll('.btn-chart-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-chart-action').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            // Recharger les données du graphique avec la nouvelle période
            if (evolutionChart) {
                loadDashboard();
            }
        });
    });
    
    // Tri des tables
    document.querySelectorAll('[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const sortField = th.dataset.sort;
            // Implémenter le tri (à compléter selon les besoins)
            console.log('Trier par:', sortField);
        });
    });
}

// Gestion de l'authentification
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    
    // Animation de chargement
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
    loginBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.user.role === 'admin') {
                authToken = data.token;
                currentUser = data.user;
                
                // Sauvegarder dans le localStorage
                localStorage.setItem('adminToken', authToken);
                localStorage.setItem('adminUser', JSON.stringify(currentUser));
                
                showAdminInterface();
                loadDashboard();
                showMessage('success', '🎉 Connexion réussie! Bienvenue dans l\'espace admin.');
            } else {
                showMessage('error', '❌ Accès réservé aux administrateurs');
            }
        } else {
            showMessage('error', data.message || '❌ Erreur de connexion');
        }
    } catch (error) {
        console.error('Erreur connexion:', error);
        showMessage('error', '🔌 Erreur de connexion au serveur');
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    showLoginInterface();
    showMessage('success', '👋 Déconnexion réussie!');
}

function showLoginInterface() {
    loginPage.style.display = 'flex';
    adminInterface.style.display = 'none';
    loginForm.reset();
}

function showAdminInterface() {
    loginPage.style.display = 'none';
    adminInterface.style.display = 'block';
    document.getElementById('user-name').textContent = currentUser.nom;
}

function showMessage(type, text, element = loginMessage) {
    element.innerHTML = text;
    element.className = `message ${type}`;
    
    setTimeout(() => {
        element.innerHTML = '';
        element.className = 'message';
    }, 5000);
}

// Navigation entre les sections
function switchSection(section) {
    currentSection = section;
    
    // Mettre à jour la navigation
    adminNavBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) {
            btn.classList.add('active');
        }
    });
    
    // Afficher la section
    adminSections.forEach(sec => {
        sec.classList.remove('active');
        if (sec.id === `section-${section}`) {
            sec.classList.add('active');
        }
    });
    
    // Charger les données de la section
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'camions':
            loadCamions();
            break;
        case 'paiements':
            loadPaiements();
            break;
        case 'rapports':
            // Ne rien charger par défaut
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
    
    console.log(`📊 Section activée: ${section}`);
}

// TABLEAU DE BORD
async function loadDashboard() {
    try {
        showLoading('section-dashboard');
        
        const response = await fetch(`${API_BASE_URL}/admin/stats-globales`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur stats globales');
        
        const data = await response.json();
        globalStats = data;
        updateDashboard(data);
        
    } catch (error) {
        console.error('Erreur dashboard:', error);
        showMessage('error', '❌ Erreur de chargement du tableau de bord', document.getElementById('section-dashboard'));
    }
}

function updateDashboard(data) {
    // KPI Principaux
    document.getElementById('total-camions').textContent = formatNumber(data.globales.totalCamions);
    document.getElementById('total-revenus').textContent = formatMoney(data.globales.totalRevenus);
    document.getElementById('camions-jour').textContent = formatNumber(data.aujourdhui.camionsEntres);
    
    const tauxSortie = data.globales.totalCamions > 0 ? 
        (data.globales.camionsSortis / data.globales.totalCamions * 100).toFixed(1) : 0;
    document.getElementById('taux-sortie').textContent = `${tauxSortie}%`;
    
    // Stats Secondaires
    document.getElementById('camions-mois').textContent = formatNumber(data.mois.camionsEntres);
    document.getElementById('camions-annee').textContent = formatNumber(data.annee.camionsEntres);
    document.getElementById('revenus-mois').textContent = formatMoney(data.mois.revenus);
    document.getElementById('revenus-annee').textContent = formatMoney(data.annee.revenus);
    
    // Tendances
    document.getElementById('trend-camions').textContent = `${data.aujourdhui.camionsEntres} aujourd'hui`;
    document.getElementById('trend-revenus').textContent = `${formatMoney(data.aujourdhui.revenus)} aujourd'hui`;
    document.getElementById('trend-jour').textContent = `${data.aujourdhui.camionsSortis} sortis`;
    
    // Graphiques
    createEvolutionChart(data.evolutionMensuelle);
    createStatutsChart(data.repartitionStatuts);
    
    console.log('✅ Tableau de bord mis à jour');
}

function createEvolutionChart(evolution) {
    const ctx = document.getElementById('chart-evolution').getContext('2d');
    
    if (evolutionChart) {
        evolutionChart.destroy();
    }
    
    const labels = evolution.map(item => {
        const [year, month] = item._id.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('fr-FR', { 
            month: 'short', 
            year: '2-digit' 
        });
    });
    
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Camions Entrés',
                    data: evolution.map(item => item.camions),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Revenus (FCFA)',
                    data: evolution.map(item => item.revenus),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Nombre de camions'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Revenus (FCFA)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.yAxisID === 'y1') {
                                label += formatMoney(context.parsed.y);
                            } else {
                                label += formatNumber(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function createStatutsChart(repartition) {
    const ctx = document.getElementById('chart-statuts').getContext('2d');
    
    if (statutsChart) {
        statutsChart.destroy();
    }
    
    const statutsLabels = {
        'en_attente': '⏳ En attente',
        'charge': '✅ Chargé',
        'paye': '💰 À payer',
        'sorti': '🚪 Sorti'
    };
    
    const data = repartition.map(item => item.count);
    const labels = repartition.map(item => statutsLabels[item._id] || item._id);
    const colors = ['#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];
    
    statutsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            cutout: '60%'
        }
    });
}

// GESTION DES CAMIONS
async function loadCamions(page = 1) {
    try {
        showLoading('section-camions');
        
        const dateDebut = document.getElementById('filter-date-debut').value;
        const dateFin = document.getElementById('filter-date-fin').value;
        const statut = document.getElementById('filter-statut-camions').value;
        const search = document.getElementById('search-camions').value;
        
        const params = new URLSearchParams({
            page: page,
            limit: 50,
            ...(dateDebut && { dateDebut }),
            ...(dateFin && { dateFin }),
            ...(statut !== 'all' && { statut }),
            ...(search && { search })
        });
        
        const response = await fetch(`${API_BASE_URL}/admin/camions?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur chargement camions');
        
        const data = await response.json();
        updateCamionsTable(data);
        
    } catch (error) {
        console.error('Erreur camions:', error);
        showMessage('error', '❌ Erreur de chargement des camions', document.getElementById('section-camions'));
    }
}

function updateCamionsTable(data) {
    const tbody = document.getElementById('camions-table-body');
    const tableCount = document.getElementById('table-count');
    
    tableCount.textContent = data.pagination.total;
    
    if (data.camions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem;">
                    <div class="message info">
                        <i class="fas fa-search"></i>
                        Aucun camion trouvé avec les critères sélectionnés
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.camions.map(camion => {
        const heureArrivee = new Date(camion.heureArrivee);
        const heureDepart = camion.heureDepart ? new Date(camion.heureDepart) : null;
        
        return `
            <tr>
                <td>
                    <strong>${camion.plaque}</strong>
                </td>
                <td>${camion.chauffeur}</td>
                <td>
                    <span class="date-cell">${camion.dateEntree}</span>
                </td>
                <td>
                    <span class="time-cell">${heureArrivee.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td>
                    ${heureDepart ? 
                        `<span class="time-cell">${heureDepart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>` : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
                <td>
                    <span class="statut statut-${camion.statut}">
                        ${getStatutText(camion.statut)}
                    </span>
                </td>
                <td>
                    ${camion.montantPaye > 0 ? 
                        `<strong class="montant">${formatMoney(camion.montantPaye)} FCFA</strong>` : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="voirDetailsCamion('${camion._id}')" title="Voir détails">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="editerCamion('${camion._id}')" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updatePagination('camions-pagination', data.pagination, loadCamions);
}

function resetFiltersCamions() {
    document.getElementById('filter-date-debut').value = '';
    document.getElementById('filter-date-fin').value = '';
    document.getElementById('filter-statut-camions').value = 'all';
    document.getElementById('search-camions').value = '';
    loadCamions(1);
}

// GESTION DES PAIEMENTS
async function loadPaiements(page = 1) {
    try {
        showLoading('section-paiements');
        
        const dateDebut = document.getElementById('filter-paiement-debut').value;
        const dateFin = document.getElementById('filter-paiement-fin').value;
        const search = document.getElementById('search-paiements').value;
        
        const params = new URLSearchParams({
            page: page,
            limit: 50,
            ...(dateDebut && { dateDebut }),
            ...(dateFin && { dateFin }),
            ...(search && { search })
        });
        
        const response = await fetch(`${API_BASE_URL}/admin/paiements?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur chargement paiements');
        
        const data = await response.json();
        updatePaiementsTable(data);
        
    } catch (error) {
        console.error('Erreur paiements:', error);
        showMessage('error', '❌ Erreur de chargement des paiements', document.getElementById('section-paiements'));
    }
}

function updatePaiementsTable(data) {
    const tbody = document.getElementById('paiements-table-body');
    
    // Mettre à jour les stats
    document.getElementById('total-paiements').textContent = formatMoney(data.stats.totalPaiements);
    document.getElementById('nombre-paiements').textContent = formatNumber(data.stats.nombrePaiements);
    document.getElementById('moyenne-paiement').textContent = formatMoney(data.stats.moyennePaiement);
    document.getElementById('paiement-max').textContent = formatMoney(data.stats.paiementMax);
    
    // Graphique des paiements
    createPaiementsChart(data.repartitionMensuelle);
    
    if (data.paiements.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem;">
                    <div class="message info">
                        <i class="fas fa-search"></i>
                        Aucun paiement trouvé avec les critères sélectionnés
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.paiements.map(paiement => {
        const heureDepart = new Date(paiement.heureDepart);
        const heureArrivee = new Date(paiement.heureArrivee);
        const dureeMs = heureDepart - heureArrivee;
        const heures = Math.floor(dureeMs / (1000 * 60 * 60));
        const minutes = Math.floor((dureeMs % (1000 * 60 * 60)) / (1000 * 60));
        const duree = `${heures}h ${minutes}m`;
        
        return `
            <tr>
                <td>
                    <span class="date-cell">${paiement.dateEntree}</span>
                </td>
                <td>
                    <strong>${paiement.plaque}</strong>
                </td>
                <td>${paiement.chauffeur}</td>
                <td>
                    <strong class="montant success">${formatMoney(paiement.montantPaye)} FCFA</strong>
                </td>
                <td>
                    <span class="time-cell">${heureDepart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td>
                    <span class="duree">${duree}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="voirDetailsPaiement('${paiement._id}')" title="Voir détails">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-receipt" onclick="genererRecu('${paiement._id}')" title="Générer reçu">
                            <i class="fas fa-receipt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updatePagination('paiements-pagination', data.pagination, loadPaiements);
}

function createPaiementsChart(repartition) {
    const ctx = document.getElementById('chart-paiements').getContext('2d');
    
    if (paiementsChart) {
        paiementsChart.destroy();
    }
    
    const labels = repartition.map(item => {
        const [year, month] = item._id.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('fr-FR', { 
            month: 'short', 
            year: '2-digit' 
        });
    });
    
    paiementsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenus (FCFA)',
                data: repartition.map(item => item.total),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: '#6366f1',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Revenus: ${formatMoney(context.parsed.y)} FCFA`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Revenus (FCFA)'
                    }
                }
            }
        }
    });
}

// RAPPORTS
async function genererRapport() {
    const date = document.getElementById('rapport-date').value;
    
    if (!date) {
        showMessage('error', '📅 Veuillez sélectionner une date', document.getElementById('rapport-content'));
        return;
    }
    
    try {
        showLoading('rapport-content');
        
        const response = await fetch(`${API_BASE_URL}/admin/rapport-journalier/${date}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur génération rapport');
        
        const data = await response.json();
        afficherRapport(data);
        
    } catch (error) {
        console.error('Erreur rapport:', error);
        showMessage('error', '❌ Erreur de génération du rapport', document.getElementById('rapport-content'));
    }
}

function afficherRapport(rapport) {
    const container = document.getElementById('rapport-content');
    
    let detailsHTML = '';
    if (rapport.details && rapport.details.length > 0) {
        detailsHTML = rapport.details.map(detail => `
            <div class="rapport-statut">
                <h4>${getStatutText(detail._id)} <span class="badge">${detail.count} camions</span></h4>
                <div class="montant-statut">Total: ${formatMoney(detail.totalMontant)} FCFA</div>
                <div class="camions-list">
                    ${detail.camions.map(camion => `
                        <div class="camion-item">
                            <div class="camion-header">
                                <strong>${camion.plaque}</strong>
                                <span class="chauffeur">${camion.chauffeur}</span>
                            </div>
                            <div class="camion-details">
                                <span>Arrivée: ${new Date(camion.heureArrivee).toLocaleString('fr-FR')}</span>
                                ${camion.heureDepart ? `<span>Départ: ${new Date(camion.heureDepart).toLocaleString('fr-FR')}</span>` : ''}
                                ${camion.montantPaye > 0 ? `<span class="montant">Montant: ${formatMoney(camion.montantPaye)} FCFA</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
    
    // Heures de pointe
    let heuresPointeHTML = '';
    if (rapport.heuresPointe && rapport.heuresPointe.length > 0) {
        heuresPointeHTML = `
            <div class="heures-pointe">
                <h4>🕒 Heures de Pointe</h4>
                <div class="heures-list">
                    ${rapport.heuresPointe.map(heure => `
                        <div class="heure-item">
                            <span class="heure">${heure._id}h</span>
                            <span class="count">${heure.count} camions</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="rapport-header">
            <h3>📊 Rapport Journalier - ${new Date(rapport.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            <div class="rapport-stats">
                <div class="stat-item large">
                    <i class="fas fa-truck"></i>
                    <div class="stat-content">
                        <div class="stat-value">${rapport.stats.totalCamions}</div>
                        <div class="stat-label">Total Camions</div>
                    </div>
                </div>
                <div class="stat-item">
                    <i class="fas fa-check-circle"></i>
                    <div class="stat-content">
                        <div class="stat-value">${rapport.stats.camionsSortis}</div>
                        <div class="stat-label">Camions Sortis</div>
                    </div>
                </div>
                <div class="stat-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <div class="stat-content">
                        <div class="stat-value">${formatMoney(rapport.stats.totalRevenus)}</div>
                        <div class="stat-label">Revenus Totaux</div>
                    </div>
                </div>
                <div class="stat-item">
                    <i class="fas fa-calculator"></i>
                    <div class="stat-content">
                        <div class="stat-value">${formatMoney(rapport.stats.revenusMoyens)}</div>
                        <div class="stat-label">Moyenne par Camion</div>
                    </div>
                </div>
            </div>
        </div>
        ${heuresPointeHTML}
        <div class="rapport-details">
            ${detailsHTML || '<div class="message info">Aucun détail disponible pour cette date.</div>'}
        </div>
        <div class="rapport-actions">
            <button class="btn-primary" onclick="imprimerRapport()">
                <i class="fas fa-print"></i> Imprimer le Rapport
            </button>
            <button class="btn-secondary" onclick="exporterRapport()">
                <i class="fas fa-download"></i> Exporter en PDF
            </button>
        </div>
    `;
}

// ANALYTICS
async function loadAnalytics() {
    try {
        showLoading('section-analytics');
        
        // Charger les données pour les analytics
        // Cette fonction peut être étendue avec des données spécifiques
        createPerformanceChart();
        loadTopChauffeurs();
        loadHeuresPointe();
        
    } catch (error) {
        console.error('Erreur analytics:', error);
        showMessage('error', '❌ Erreur de chargement des analytics', document.getElementById('section-analytics'));
    }
}

function createPerformanceChart() {
    const ctx = document.getElementById('chart-performance').getContext('2d');
    
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    // Données simulées pour la performance (à remplacer par des vraies données)
    const performanceData = {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [
            {
                label: 'Camions Entrés',
                data: [45, 52, 38, 61, 55, 48, 40],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Camions Sortis',
                data: [40, 48, 35, 55, 50, 42, 36],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    };
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: performanceData,
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Nombre de camions'
                    }
                }
            }
        }
    });
}

async function loadTopChauffeurs() {
    // Simulation de données (à remplacer par un appel API)
    const topChauffeurs = [
        { nom: 'Jean Dupont', voyages: 15, montant: 750000 },
        { nom: 'Pierre Martin', voyages: 12, montant: 600000 },
        { nom: 'Mohamed Ali', voyages: 10, montant: 500000 },
        { nom: 'Paul Wilson', voyages: 8, montant: 400000 },
        { nom: 'David Brown', voyages: 7, montant: 350000 }
    ];
    
    const container = document.getElementById('top-chauffeurs');
    container.innerHTML = topChauffeurs.map((chauffeur, index) => `
        <div class="chauffeur-item">
            <div class="chauffeur-rank">${index + 1}</div>
            <div class="chauffeur-info">
                <div class="chauffeur-nom">${chauffeur.nom}</div>
                <div class="chauffeur-stats">
                    <span>${chauffeur.voyages} voyages</span>
                    <span class="montant">${formatMoney(chauffeur.montant)} FCFA</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadHeuresPointe() {
    // Simulation de données (à remplacer par un appel API)
    const heuresPointe = [
        { heure: '08', count: 12 },
        { heure: '09', count: 18 },
        { heure: '10', count: 15 },
        { heure: '14', count: 10 },
        { heure: '16', count: 8 }
    ];
    
    const container = document.getElementById('heures-pointe');
    container.innerHTML = heuresPointe.map(heure => `
        <div class="heure-item">
            <div class="heure-label">${heure.heure}h</div>
            <div class="heure-bar">
                <div class="bar-fill" style="width: ${(heure.count / 20) * 100}%"></div>
            </div>
            <div class="heure-count">${heure.count}</div>
        </div>
    `).join('');
}

// FONCTIONS UTILITAIRES
function updatePagination(containerId, pagination, loadFunction) {
    const container = document.getElementById(containerId);
    const { page, pages } = pagination;
    
    if (pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Bouton précédent
    if (page > 1) {
        html += `<button onclick="${loadFunction.name}(${page - 1})"><i class="fas fa-chevron-left"></i></button>`;
    }
    
    // Pages
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === page) {
            html += `<button class="active">${i}</button>`;
        } else {
            html += `<button onclick="${loadFunction.name}(${i})">${i}</button>`;
        }
    }
    
    // Bouton suivant
    if (page < pages) {
        html += `<button onclick="${loadFunction.name}(${page + 1})"><i class="fas fa-chevron-right"></i></button>`;
    }
    
    container.innerHTML = html;
}

function showLoading(sectionId) {
    const section = document.getElementById(sectionId);
    const existingLoader = section.querySelector('.loading-spinner');
    if (!existingLoader) {
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
        loader.style.textAlign = 'center';
        loader.style.padding = '2rem';
        loader.style.color = 'var(--gray)';
        section.appendChild(loader);
    }
}

function removeLoading(sectionId) {
    const section = document.getElementById(sectionId);
    const loader = section.querySelector('.loading-spinner');
    if (loader) {
        loader.remove();
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
}

function formatMoney(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount);
}

function getStatutText(statut) {
    const statuts = {
        'en_attente': '⏳ En attente',
        'charge': '✅ Chargé',
        'paye': '💰 À payer',
        'sorti': '🚪 Sorti'
    };
    return statuts[statut] || statut;
}

// FONCTIONS D'ACTION (à implémenter)
function voirDetailsCamion(camionId) {
    alert(`Détails du camion ${camionId} - À implémenter`);
    // Ouvrir un modal avec les détails complets du camion
}

function editerCamion(camionId) {
    alert(`Édition du camion ${camionId} - À implémenter`);
    // Ouvrir un formulaire d'édition
}

function voirDetailsPaiement(paiementId) {
    alert(`Détails du paiement ${paiementId} - À implémenter`);
    // Afficher les détails du paiement
}

function genererRecu(paiementId) {
    alert(`Génération du reçu pour ${paiementId} - À implémenter`);
    // Générer un reçu PDF
}

function exporterDonnees() {
    alert('Exportation des données - À implémenter');
    // Exporter les données en CSV ou Excel
}

function imprimerRapport() {
    window.print();
}

function exporterRapport() {
    alert('Exportation du rapport en PDF - À implémenter');
    // Générer un PDF du rapport
}

async function chargerStatsAvancees() {
    const periode = document.getElementById('rapport-periode').value;
    alert(`Chargement des statistiques ${periode} - À implémenter`);
    // Charger et afficher des statistiques avancées
}

// Exposer les fonctions globales
window.voirDetailsCamion = voirDetailsCamion;
window.editerCamion = editerCamion;
window.voirDetailsPaiement = voirDetailsPaiement;
window.genererRecu = genererRecu;
window.exporterDonnees = exporterDonnees;
window.imprimerRapport = imprimerRapport;
window.exporterRapport = exporterRapport;
window.chargerStatsAvancees = chargerStatsAvancees;

console.log('📋 Interface admin chargée avec succès');
