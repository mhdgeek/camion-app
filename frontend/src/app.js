// Variables globales
let camions = [];
let currentFilter = 'all';
const API_BASE_URL = 'http://localhost:5000/api';

// Éléments DOM
const sections = {
    entree: document.getElementById('section-entree'),
    tableau: document.getElementById('section-tableau'),
    sortie: document.getElementById('section-sortie'),
    historique: document.getElementById('section-historique'),
    stats: document.getElementById('section-stats')
};

const navButtons = {
    entree: document.getElementById('btn-entree'),
    tableau: document.getElementById('btn-tableau'),
    sortie: document.getElementById('btn-sortie'),
    historique: document.getElementById('btn-historique'),
    stats: document.getElementById('btn-stats')
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Configuration des écouteurs d'événements pour la navigation
    Object.keys(navButtons).forEach(section => {
        navButtons[section].addEventListener('click', () => afficherSection(section));
    });
    
    // Écouteur pour le formulaire d'entrée
    document.getElementById('form-entree').addEventListener('submit', enregistrerEntree);
    
    // Écouteurs pour les boutons
    document.getElementById('btn-rafraichir').addEventListener('click', chargerCamions);
    document.getElementById('btn-search').addEventListener('click', chargerHistorique);
    document.getElementById('btn-clear-filters').addEventListener('click', clearFilters);
    
    // Écouteurs pour les filtres
    document.getElementById('filter-statut').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        afficherCamionsTableau();
    });
    
    document.getElementById('filter-date').addEventListener('change', chargerHistorique);
    document.getElementById('search-historique').addEventListener('input', chargerHistorique);
    
    // Modal events
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('btn-confirm-chargement').addEventListener('click', validerChargementGroupé);
    
    // Charger les données initiales
    await chargerCamions();
    await updateHeaderStats();
    
    // Actualiser les données toutes les 30 secondes
    setInterval(async () => {
        await chargerCamions();
        await updateHeaderStats();
    }, 30000);
    
    console.log('Application initialisée avec design premium');
}

// Fonction pour afficher une section
function afficherSection(section) {
    // Masquer toutes les sections
    Object.values(sections).forEach(s => s.classList.remove('active'));
    Object.values(navButtons).forEach(b => b.classList.remove('active'));
    
    // Afficher la section sélectionnée
    sections[section].classList.add('active');
    navButtons[section].classList.add('active');
    
    // Charger les données spécifiques à la section
    switch(section) {
        case 'tableau':
            chargerCamions().then(afficherCamionsTableau);
            break;
        case 'sortie':
            chargerCamions().then(afficherCamionsSortie);
            break;
        case 'historique':
            chargerHistorique();
            break;
        case 'stats':
            chargerCamions().then(afficherStats);
            break;
    }
}

// Fonction pour charger les camions depuis l'API
async function chargerCamions() {
    try {
        const response = await fetch(`${API_BASE_URL}/camions`);
        if (!response.ok) throw new Error('Erreur réseau');
        
        camions = await response.json();
        return camions;
    } catch (error) {
        console.error('Erreur lors du chargement des camions:', error);
        afficherMessage('error', 'Erreur de connexion au serveur');
        return [];
    }
}

// Fonction pour mettre à jour les stats du header
async function updateHeaderStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/camions/stats`);
        if (!response.ok) throw new Error('Erreur réseau');
        
        const stats = await response.json();
        
        const headerStats = document.getElementById('header-stats');
        headerStats.innerHTML = `
            <div class="stat-badge">Total: ${stats.totalCamions}</div>
            <div class="stat-badge">En attente: ${stats.enAttente}</div>
            <div class="stat-badge ${stats.nonSortis > 0 ? 'alert' : ''}">
                ⚠️ Non sortis: ${stats.nonSortis}
            </div>
        `;
    } catch (error) {
        console.error('Erreur stats header:', error);
    }
}

// Fonction pour enregistrer une entrée de camion
async function enregistrerEntree(e) {
    e.preventDefault();
    
    const plaque = document.getElementById('plaque').value.trim();
    const chauffeur = document.getElementById('chauffeur').value.trim();
    const messageElement = document.getElementById('message-entree');
    
    if (!plaque || !chauffeur) {
        afficherMessage('error', 'Veuillez remplir tous les champs', messageElement);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/camions/entree`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plaque, chauffeur })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            afficherMessage('success', '✅ Camion enregistré avec succès!', messageElement);
            document.getElementById('form-entree').reset();
            await chargerCamions();
            await updateHeaderStats();
            
            // Si on est sur le tableau de bord, mettre à jour l'affichage
            if (sections.tableau.classList.contains('active')) {
                afficherCamionsTableau();
            }
        } else {
            afficherMessage('error', data.message || 'Erreur lors de l\'enregistrement', messageElement);
        }
    } catch (error) {
        console.error('Erreur:', error);
        afficherMessage('error', 'Erreur de connexion au serveur', messageElement);
    }
}

// Fonction pour afficher les camions dans le tableau de bord
function afficherCamionsTableau() {
    const listeCamions = document.getElementById('liste-camions');
    
    let camionsFiltres = camions;
    if (currentFilter !== 'all') {
        camionsFiltres = camions.filter(c => c.statut === currentFilter);
    }
    
    // Filtrer pour n'afficher que les camions non sortis
    camionsFiltres = camionsFiltres.filter(c => c.statut !== 'sorti');
    
    if (camionsFiltres.length === 0) {
        listeCamions.innerHTML = `
            <div class="message info">
                <i class="fas fa-info-circle"></i>
                Aucun camion ${currentFilter !== 'all' ? `avec le statut "${currentFilter}"` : 'en attente'}.
            </div>
        `;
        return;
    }
    
    listeCamions.innerHTML = camionsFiltres.map(camion => {
        const isAlert = camion.statut === 'en_attente';
        const heureArrivee = new Date(camion.heureArrivee).toLocaleString('fr-FR');
        
        return `
            <div class="camion-card ${isAlert ? 'alert' : ''}">
                <div class="camion-header">
                    <h3><i class="fas fa-truck"></i> Camion #${camion.ordreArrivee}</h3>
                    <span class="statut statut-${camion.statut}">
                        ${getStatutText(camion.statut)}
                    </span>
                </div>
                <div class="camion-info">
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-id-card"></i> Plaque</span>
                        <span class="info-value">${camion.plaque}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-user"></i> Chauffeur</span>
                        <span class="info-value">${camion.chauffeur}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-clock"></i> Arrivée</span>
                        <span class="info-value">${heureArrivee}</span>
                    </div>
                    ${camion.montantDu > 0 ? `
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-money-bill-wave"></i> Montant dû</span>
                        <span class="montant-value">${camion.montantDu} FCFA</span>
                    </div>
                    ` : ''}
                </div>
                <div class="camion-actions">
                    ${camion.statut === 'en_attente' ? `
                        <button class="action-btn btn-charger" onclick="chargerCamion('${camion._id}')">
                            <i class="fas fa-check"></i> Marquer Chargé
                        </button>
                    ` : ''}
                    ${camion.statut === 'charge' ? `
                        <button class="action-btn btn-payer" onclick="definirMontant('${camion._id}')">
                            <i class="fas fa-money-bill"></i> Définir Montant
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Fonction pour afficher les camions dans la section sortie
function afficherCamionsSortie() {
    const listeSortie = document.getElementById('liste-sortie');
    const camionsAPayer = camions.filter(c => c.statut === 'paye');
    
    if (camionsAPayer.length === 0) {
        listeSortie.innerHTML = `
            <div class="message info">
                <i class="fas fa-info-circle"></i>
                Aucun camion prêt à sortir. Les camions doivent être marqués comme "À payer".
            </div>
        `;
        return;
    }
    
    listeSortie.innerHTML = camionsAPayer.map(camion => {
        const heureArrivee = new Date(camion.heureArrivee).toLocaleString('fr-FR');
        
        return `
            <div class="camion-card">
                <div class="camion-header">
                    <h3><i class="fas fa-truck"></i> ${camion.plaque}</h3>
                    <span class="statut statut-${camion.statut}">
                        ${getStatutText(camion.statut)}
                    </span>
                </div>
                <div class="camion-info">
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-user"></i> Chauffeur</span>
                        <span class="info-value">${camion.chauffeur}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-clock"></i> Arrivée</span>
                        <span class="info-value">${heureArrivee}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"><i class="fas fa-money-bill-wave"></i> Montant dû</span>
                        <span class="montant-value">${camion.montantDu} FCFA</span>
                    </div>
                </div>
                <div class="camion-actions">
                    <form class="paiement-form" onsubmit="enregistrerSortie(event, '${camion._id}')">
                        <div class="form-group paiement-input">
                            <label for="montant-${camion._id}">Montant payé (FCFA)</label>
                            <input type="number" id="montant-${camion._id}" name="montantPaye" 
                                   min="${camion.montantDu}" step="100" required
                                   placeholder="${camion.montantDu}" class="montant-input">
                        </div>
                        <button type="submit" class="action-btn btn-sortie">
                            <i class="fas fa-sign-out-alt"></i> Enregistrer Sortie
                        </button>
                    </form>
                </div>
            </div>
        `;
    }).join('');
}

// Fonction pour charger et afficher l'historique
async function chargerHistorique() {
    try {
        const search = document.getElementById('search-historique').value;
        const date = document.getElementById('filter-date').value;
        
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (date) params.append('date', date);
        
        const response = await fetch(`${API_BASE_URL}/camions/historique?${params}`);
        if (!response.ok) throw new Error('Erreur réseau');
        
        const historique = await response.json();
        afficherHistorique(historique);
    } catch (error) {
        console.error('Erreur historique:', error);
        document.getElementById('liste-historique').innerHTML = `
            <div class="message error">Erreur de chargement de l'historique</div>
        `;
    }
}

function afficherHistorique(camions) {
    const listeHistorique = document.getElementById('liste-historique');
    
    if (camions.length === 0) {
        listeHistorique.innerHTML = `
            <div class="message info">
                <i class="fas fa-info-circle"></i>
                Aucun camion trouvé avec les critères de recherche.
            </div>
        `;
        return;
    }
    
    listeHistorique.innerHTML = camions.map(camion => {
        const isSorti = camion.statut === 'sorti';
        const heureArrivee = new Date(camion.heureArrivee).toLocaleString('fr-FR');
        const heureDepart = camion.heureDepart ? new Date(camion.heureDepart).toLocaleString('fr-FR') : 'En cours';
        
        // Calcul de la durée de séjour
        let duree = 'En cours';
        if (camion.heureDepart) {
            const dureeMs = new Date(camion.heureDepart) - new Date(camion.heureArrivee);
            const heures = Math.floor(dureeMs / (1000 * 60 * 60));
            const minutes = Math.floor((dureeMs % (1000 * 60 * 60)) / (1000 * 60));
            duree = `${heures}h ${minutes}m`;
        }
        
        return `
            <div class="historique-item ${isSorti ? 'sorti' : ''}">
                <div class="historique-header">
                    <h4><i class="fas fa-truck"></i> ${camion.plaque}</h4>
                    <span class="statut statut-${camion.statut}">
                        ${getStatutText(camion.statut)}
                    </span>
                </div>
                <div class="historique-info">
                    <div class="info-item">
                        <span class="info-label">Chauffeur</span>
                        <span class="info-value">${camion.chauffeur}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Arrivée</span>
                        <span class="info-value">${heureArrivee}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Départ</span>
                        <span class="info-value">${heureDepart}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Durée séjour</span>
                        <span class="duree-sejour">${duree}</span>
                    </div>
                    ${camion.montantPaye > 0 ? `
                    <div class="info-item">
                        <span class="info-label">Montant payé</span>
                        <span class="montant-value">${camion.montantPaye} FCFA</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Fonction pour afficher les statistiques
async function afficherStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/camions/stats`);
        if (!response.ok) throw new Error('Erreur réseau');
        
        const stats = await response.json();
        
        const statsContainer = document.getElementById('stats-container');
        statsContainer.innerHTML = `
            <div class="stat-card ${stats.nonSortis > 0 ? 'alert' : ''}">
                <div class="stat-number">${stats.nonSortis}</div>
                <div class="stat-label">Camions Non Sortis</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.enAttente}</div>
                <div class="stat-label">En Attente</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.charges}</div>
                <div class="stat-label">Chargés</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.payes}</div>
                <div class="stat-label">À Payer</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.sortis}</div>
                <div class="stat-label">Sortis Aujourd'hui</div>
            </div>
        `;
        
        // Chart simple (placeholder)
        document.getElementById('chart-statuts').innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-chart-pie" style="font-size: 3rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                <p>Répartition: ${stats.enAttente} attente, ${stats.charges} chargés, ${stats.payes} à payer</p>
            </div>
        `;
    } catch (error) {
        console.error('Erreur stats:', error);
        document.getElementById('stats-container').innerHTML = 
            '<div class="message error">Erreur de chargement des statistiques</div>';
    }
}

// Fonctions pour les actions
async function chargerCamion(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/camions/charger/${id}`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            afficherMessage('success', '✅ Camion marqué comme chargé');
            await chargerCamions();
            await updateHeaderStats();
            afficherCamionsTableau();
        } else {
            const data = await response.json();
            afficherMessage('error', data.message || 'Erreur lors du chargement du camion');
        }
    } catch (error) {
        console.error('Erreur:', error);
        afficherMessage('error', 'Erreur de connexion au serveur');
    }
}

async function definirMontant(id) {
    const camion = camions.find(c => c._id === id);
    if (!camion) return;
    
    const montant = prompt(`Définir le montant pour ${camion.plaque} (${camion.chauffeur}) en FCFA:`, "50000");
    if (montant && !isNaN(montant)) {
        try {
            const response = await fetch(`${API_BASE_URL}/camions/valider-chargement`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    montants: [{ camionId: id, montant: parseFloat(montant) }] 
                })
            });
            
            if (response.ok) {
                afficherMessage('success', '✅ Montant défini avec succès');
                await chargerCamions();
                await updateHeaderStats();
                afficherCamionsTableau();
            } else {
                afficherMessage('error', 'Erreur lors de la définition du montant');
            }
        } catch (error) {
            console.error('Erreur:', error);
            afficherMessage('error', 'Erreur de connexion au serveur');
        }
    }
}

async function enregistrerSortie(e, id) {
    e.preventDefault();
    
    const montantPaye = parseFloat(e.target.montantPaye.value);
    const camion = camions.find(c => c._id === id);
    
    if (!camion) {
        afficherMessage('error', 'Camion non trouvé');
        return;
    }
    
    if (montantPaye < camion.montantDu) {
        afficherMessage('error', `Le montant payé (${montantPaye} FCFA) est inférieur au montant dû (${camion.montantDu} FCFA)`);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/camions/sortie/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ montantPaye })
        });
        
        if (response.ok) {
            afficherMessage('success', '✅ Sortie enregistrée avec succès!');
            await chargerCamions();
            await updateHeaderStats();
            afficherCamionsSortie();
        } else {
            const data = await response.json();
            afficherMessage('error', data.message || 'Erreur lors de l\'enregistrement de la sortie');
        }
    } catch (error) {
        console.error('Erreur:', error);
        afficherMessage('error', 'Erreur de connexion au serveur');
    }
}

// Fonctions utilitaires
function clearFilters() {
    document.getElementById('search-historique').value = '';
    document.getElementById('filter-date').value = '';
    chargerHistorique();
}

function afficherMessage(type, text, element = null) {
    const messageElement = element || document.createElement('div');
    if (!element) {
        messageElement.className = 'message';
        document.querySelector('.main-content').appendChild(messageElement);
    }
    
    messageElement.innerHTML = text;
    messageElement.className = `message ${type}`;
    
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 5000);
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

// Modal functions
function openModal() {
    document.getElementById('modal-chargement').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal-chargement').style.display = 'none';
}

async function validerChargementGroupé() {
    // Implémentation pour la validation groupée
    closeModal();
}

// Exposer les fonctions globales
window.chargerCamion = chargerCamion;
window.definirMontant = definirMontant;
window.enregistrerSortie = enregistrerSortie;
window.chargerHistorique = chargerHistorique;
