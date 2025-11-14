// Module pour le tableau de bord bilan
class BilanManager {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBilanData();
    }

    setupEventListeners() {
        // Date selector
        const dateInput = document.getElementById('bilan-date');
        if (dateInput) {
            dateInput.value = this.currentDate;
            dateInput.addEventListener('change', (e) => {
                this.currentDate = e.target.value;
                this.loadBilanData();
            });
        }

        // Aujourd'hui button
        const btnAujourdhui = document.getElementById('btn-aujourdhui');
        if (btnAujourdhui) {
            btnAujourdhui.addEventListener('click', () => {
                this.currentDate = new Date().toISOString().split('T')[0];
                if (dateInput) dateInput.value = this.currentDate;
                this.loadBilanData();
            });
        }

        // Actualiser button
        const btnActualiser = document.getElementById('btn-actualiser-bilan');
        if (btnActualiser) {
            btnActualiser.addEventListener('click', () => {
                this.loadBilanData();
            });
        }

        // Filtres
        const filterStatut = document.getElementById('filter-bilan-statut');
        const searchBilan = document.getElementById('search-bilan');
        
        if (filterStatut) {
            filterStatut.addEventListener('change', () => {
                this.filterCamionsList();
            });
        }
        
        if (searchBilan) {
            searchBilan.addEventListener('input', () => {
                this.filterCamionsList();
            });
        }
    }

    async loadBilanData() {
        try {
            this.showLoading();
            
            const [stats, camionsDuJour] = await Promise.all([
                this.fetchStatsJournalieres(),
                this.fetchCamionsDuJour()
            ]);

            this.updateKPI(stats);
            this.updateCamionsList(camionsDuJour);

        } catch (error) {
            console.error('Erreur chargement bilan:', error);
            this.showError('Erreur de chargement des données');
        }
    }

    async fetchStatsJournalieres() {
        const response = await fetch(`http://localhost:5000/api/camions/stats-journalieres?date=${this.currentDate}`);
        if (!response.ok) throw new Error('Erreur stats journalières');
        return await response.json();
    }

    async fetchCamionsDuJour() {
        const response = await fetch(`http://localhost:5000/api/camions/historique?date=${this.currentDate}`);
        if (!response.ok) throw new Error('Erreur camions du jour');
        return await response.json();
    }

    updateKPI(stats) {
        const kpiContainer = document.getElementById('kpi-container');
        if (!kpiContainer) return;

        const tauxSortie = stats.totalCamions > 0 ? 
            Math.round((stats.camionsSortis / stats.totalCamions) * 100) : 0;

        kpiContainer.innerHTML = `
            <div class="kpi-card primary">
                <div class="kpi-icon">
                    <i class="fas fa-truck"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${stats.totalCamions}</div>
                    <div class="kpi-label">Camions Entrés</div>
                    <div class="kpi-trend">${new Date(this.currentDate).toLocaleDateString('fr-FR')}</div>
                </div>
            </div>

            <div class="kpi-card success">
                <div class="kpi-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${stats.camionsSortis}</div>
                    <div class="kpi-label">Camions Sortis</div>
                    <div class="kpi-trend">${tauxSortie}% de sortie</div>
                </div>
            </div>

            <div class="kpi-card revenue">
                <div class="kpi-icon">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${this.formatMoney(stats.sommeGeneree)}</div>
                    <div class="kpi-label">Revenus Générés</div>
                    <div class="kpi-trend">FCFA</div>
                </div>
            </div>

            <div class="kpi-card warning">
                <div class="kpi-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${stats.enAttente + stats.charges + stats.payes}</div>
                    <div class="kpi-label">En Cours</div>
                    <div class="kpi-trend">À traiter</div>
                </div>
            </div>

            <div class="kpi-card info">
                <div class="kpi-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${this.formatMoney(stats.sommeDue)}</div>
                    <div class="kpi-label">Total Dû</div>
                    <div class="kpi-trend">FCFA</div>
                </div>
            </div>
        `;
    }

    updateCamionsList(camions) {
        this.allCamions = camions;
        this.filterCamionsList();
    }

    filterCamionsList() {
        const statutFilter = document.getElementById('filter-bilan-statut')?.value || 'all';
        const searchFilter = document.getElementById('search-bilan')?.value.toLowerCase() || '';

        let filteredCamions = this.allCamions || [];

        if (statutFilter !== 'all') {
            filteredCamions = filteredCamions.filter(c => c.statut === statutFilter);
        }

        if (searchFilter) {
            filteredCamions = filteredCamions.filter(c => 
                c.plaque.toLowerCase().includes(searchFilter) || 
                c.chauffeur.toLowerCase().includes(searchFilter)
            );
        }

        this.renderCamionsList(filteredCamions);
    }

    renderCamionsList(camions) {
        const container = document.getElementById('liste-camions-bilan');
        if (!container) return;

        if (camions.length === 0) {
            container.innerHTML = '<div class="message info">Aucun camion trouvé</div>';
            return;
        }

        container.innerHTML = camions.map(camion => {
            const heureArrivee = new Date(camion.heureArrivee).toLocaleString('fr-FR');
            const heureDepart = camion.heureDepart ? 
                new Date(camion.heureDepart).toLocaleString('fr-FR') : 'En cours';

            return `
                <div class="camion-bilan-item ${camion.statut === 'sorti' ? 'completed' : ''}">
                    <div class="camion-bilan-header">
                        <div class="camion-info-main">
                            <h4>${camion.plaque}</h4>
                            <span class="chauffeur-name">${camion.chauffeur}</span>
                        </div>
                        <span class="statut statut-${camion.statut}">
                            ${this.getStatutText(camion.statut)}
                        </span>
                    </div>
                    <div class="camion-bilan-details">
                        <div class="detail">
                            <span class="label">Arrivée:</span>
                            <span class="value">${heureArrivee}</span>
                        </div>
                        <div class="detail">
                            <span class="label">Départ:</span>
                            <span class="value">${heureDepart}</span>
                        </div>
                        ${camion.montantDu > 0 ? `
                        <div class="detail">
                            <span class="label">Montant:</span>
                            <span class="value montant">${camion.montantDu} FCFA</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Utilitaires
    formatMoney(amount) {
        return new Intl.NumberFormat('fr-FR').format(amount);
    }

    getStatutText(statut) {
        const statuts = {
            'en_attente': '⏳ En attente',
            'charge': '✅ Chargé',
            'paye': '💰 À payer',
            'sorti': '🚪 Sorti'
        };
        return statuts[statut] || statut;
    }

    showLoading() {
        const kpiContainer = document.getElementById('kpi-container');
        if (kpiContainer) {
            kpiContainer.innerHTML = `
                <div class="loading-kpi">Chargement des données...</div>
            `;
        }
    }

    showError(message) {
        const kpiContainer = document.getElementById('kpi-container');
        if (kpiContainer) {
            kpiContainer.innerHTML = `
                <div class="message error">${message}</div>
            `;
        }
    }
}

// Initialisation quand la section bilan est active
let bilanManager = null;

function initBilan() {
    const sectionBilan = document.getElementById('section-bilan');
    if (sectionBilan && sectionBilan.classList.contains('active') && !bilanManager) {
        bilanManager = new BilanManager();
    }
}

// Observer les changements de section
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            initBilan();
        }
    });
});

// Démarrer l'observation
const sectionBilan = document.getElementById('section-bilan');
if (sectionBilan) {
    observer.observe(sectionBilan, { attributes: true });
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
    initBilan();
});
