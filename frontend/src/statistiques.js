// Module pour les statistiques avancées
class StatistiquesManager {
    constructor() {
        this.currentView = 'journalier';
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadStatsCompletes();
    }

    setupEventListeners() {
        // Navigation entre les vues
        document.querySelectorAll('.stat-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentView = e.target.dataset.view;
                this.updateView();
                this.loadStatsForCurrentView();
            });
        });

        // Sélecteurs de date
        document.getElementById('stat-date')?.addEventListener('change', (e) => {
            this.currentDate = e.target.value;
            this.loadStatsJournalieres();
        });

        document.getElementById('stat-month')?.addEventListener('change', (e) => {
            this.currentMonth = parseInt(e.target.value);
            this.loadStatsMensuelles();
        });

        document.getElementById('stat-year')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.loadStatsAnnuelles();
        });

        // Boutons de période
        document.getElementById('btn-aujourdhui')?.addEventListener('click', () => {
            this.currentDate = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('stat-date');
            if (dateInput) dateInput.value = this.currentDate;
            this.loadStatsJournalieres();
        });

        document.getElementById('btn-mois-courant')?.addEventListener('click', () => {
            this.currentMonth = new Date().getMonth() + 1;
            const monthInput = document.getElementById('stat-month');
            if (monthInput) monthInput.value = this.currentMonth;
            this.loadStatsMensuelles();
        });

        document.getElementById('btn-annee-courante')?.addEventListener('click', () => {
            this.currentYear = new Date().getFullYear();
            const yearInput = document.getElementById('stat-year');
            if (yearInput) yearInput.value = this.currentYear;
            this.loadStatsAnnuelles();
        });

        // Initialisation des sélecteurs
        this.initializeSelectors();
    }

    initializeSelectors() {
        // Sélecteur de date pour aujourd'hui
        const dateInput = document.getElementById('stat-date');
        if (dateInput) dateInput.value = this.currentDate;

        // Sélecteur de mois (1-12)
        const monthInput = document.getElementById('stat-month');
        if (monthInput) {
            for (let i = 1; i <= 12; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = new Date(2000, i - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });
                monthInput.appendChild(option);
            }
            monthInput.value = this.currentMonth;
        }

        // Sélecteur d'année (2020-2030)
        const yearInput = document.getElementById('stat-year');
        if (yearInput) {
            const currentYear = new Date().getFullYear();
            for (let i = currentYear - 3; i <= currentYear + 2; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                yearInput.appendChild(option);
            }
            yearInput.value = this.currentYear;
        }
    }

    updateView() {
        // Mettre à jour les boutons actifs
        document.querySelectorAll('.stat-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });

        // Afficher/masquer les sélecteurs appropriés
        document.querySelectorAll('.period-selector').forEach(selector => {
            selector.style.display = 'none';
        });

        const activeSelector = document.getElementById(`selector-${this.currentView}`);
        if (activeSelector) {
            activeSelector.style.display = 'flex';
        }
    }

    async loadStatsCompletes() {
        try {
            this.showLoading();
            const response = await fetch(`${API_BASE_URL}/camions/stats-completes`);
            if (!response.ok) throw new Error('Erreur stats complètes');
            
            const data = await response.json();
            this.updateDashboard(data);
        } catch (error) {
            console.error('Erreur chargement stats complètes:', error);
            this.showError('Erreur de chargement des statistiques');
        }
    }

    async loadStatsForCurrentView() {
        switch (this.currentView) {
            case 'journalier':
                await this.loadStatsJournalieres();
                break;
            case 'mensuel':
                await this.loadStatsMensuelles();
                break;
            case 'annuel':
                await this.loadStatsAnnuelles();
                break;
        }
    }

    async loadStatsJournalieres() {
        try {
            const response = await fetch(`${API_BASE_URL}/camions/stats-journalieres?date=${this.currentDate}`);
            if (!response.ok) throw new Error('Erreur stats journalières');
            
            const stats = await response.json();
            this.updateStatsJournalieres(stats);
        } catch (error) {
            console.error('Erreur stats journalières:', error);
        }
    }

    async loadStatsMensuelles() {
        try {
            const response = await fetch(`${API_BASE_URL}/camions/stats-mensuelles?annee=${this.currentYear}&mois=${this.currentMonth}`);
            if (!response.ok) throw new Error('Erreur stats mensuelles');
            
            const stats = await response.json();
            this.updateStatsMensuelles(stats);
        } catch (error) {
            console.error('Erreur stats mensuelles:', error);
        }
    }

    async loadStatsAnnuelles() {
        try {
            const response = await fetch(`${API_BASE_URL}/camions/stats-annuelles?annee=${this.currentYear}`);
            if (!response.ok) throw new Error('Erreur stats annuelles');
            
            const stats = await response.json();
            this.updateStatsAnnuelles(stats);
        } catch (error) {
            console.error('Erreur stats annuelles:', error);
        }
    }

    updateDashboard(data) {
        this.updateKPIs(data);
        this.createCharts(data);
    }

    updateKPIs(data) {
        const kpiContainer = document.getElementById('stats-kpi-container');
        if (!kpiContainer) return;

        const { journalier, mensuel, annuel, resume } = data;

        kpiContainer.innerHTML = `
            <!-- KPI Journalier -->
            <div class="kpi-card primary">
                <div class="kpi-icon">
                    <i class="fas fa-calendar-day"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${journalier.totalCamions}</div>
                    <div class="kpi-label">Camions Aujourd'hui</div>
                    <div class="kpi-trend">${journalier.camionsSortis} sortis</div>
                </div>
            </div>

            <!-- KPI Mensuel -->
            <div class="kpi-card success">
                <div class="kpi-icon">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${mensuel.totalCamions}</div>
                    <div class="kpi-label">Ce Mois</div>
                    <div class="kpi-trend">${mensuel.tauxSortie.toFixed(1)}% taux</div>
                </div>
            </div>

            <!-- KPI Annuel -->
            <div class="kpi-card revenue">
                <div class="kpi-icon">
                    <i class="fas fa-calendar"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${annuel.totalCamions}</div>
                    <div class="kpi-label">Cette Année</div>
                    <div class="kpi-trend">${annuel.moisActifs} mois actifs</div>
                </div>
            </div>

            <!-- Revenus Annuels -->
            <div class="kpi-card warning">
                <div class="kpi-icon">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${this.formatMoney(annuel.sommeGeneree)}</div>
                    <div class="kpi-label">Revenus Annuels</div>
                    <div class="kpi-trend">FCFA</div>
                </div>
            </div>

            <!-- Moyenne Mensuelle -->
            <div class="kpi-card info">
                <div class="kpi-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${Math.round(resume.moyenneMensuelle)}</div>
                    <div class="kpi-label">Moyenne/Mois</div>
                    <div class="kpi-trend">camions</div>
                </div>
            </div>

            <!-- Taux de Rotation -->
            <div class="kpi-card ${resume.tauxRotation > 80 ? 'success' : 'warning'}">
                <div class="kpi-icon">
                    <i class="fas fa-sync-alt"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-value">${resume.tauxRotation.toFixed(1)}%</div>
                    <div class="kpi-label">Taux Rotation</div>
                    <div class="kpi-trend">Annuel</div>
                </div>
            </div>
        `;
    }

    createCharts(data) {
        this.createTrendChart(data.historique30Jours);
        this.createMonthlyChart(data.historique12Mois);
        this.createPerformanceChart(data);
    }

    createTrendChart(historique) {
        const ctx = document.getElementById('chart-tendance');
        if (!ctx) return;

        if (this.charts.tendance) {
            this.charts.tendance.destroy();
        }

        const labels = historique.map(item => {
            const date = new Date(item._id);
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        });

        this.charts.tendance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Camions Entrés',
                        data: historique.map(item => item.totalCamions),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Camions Sortis',
                        data: historique.map(item => item.camionsSortis),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Activité des 30 derniers jours'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createMonthlyChart(statsMensuelles) {
        const ctx = document.getElementById('chart-mensuel');
        if (!ctx) return;

        if (this.charts.mensuel) {
            this.charts.mensuel.destroy();
        }

        const labels = statsMensuelles.map(item => {
            const [annee, mois] = item._id.split('-');
            return new Date(parseInt(annee), parseInt(mois) - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        });

        this.charts.mensuel = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Revenus (FCFA)',
                        data: statsMensuelles.map(item => item.sommeGeneree),
                        backgroundColor: '#f59e0b',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Camions',
                        data: statsMensuelles.map(item => item.totalCamions),
                        type: 'line',
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance des 12 derniers mois'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Revenus (FCFA)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('fr-FR') + ' F';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Nombre de camions'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    createPerformanceChart(data) {
        const ctx = document.getElementById('chart-performance');
        if (!ctx) return;

        if (this.charts.performance) {
            this.charts.performance.destroy();
        }

        this.charts.performance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['En Attente', 'Chargés', 'À Payer', 'Sortis'],
                datasets: [{
                    data: [
                        data.journalier.enAttente,
                        data.journalier.charges,
                        data.journalier.payes,
                        data.journalier.camionsSortis
                    ],
                    backgroundColor: [
                        '#f59e0b',
                        '#10b981',
                        '#3b82f6',
                        '#6b7280'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Répartition aujourd\'hui'
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '60%'
            }
        });
    }

    updateStatsJournalieres(stats) {
        const container = document.getElementById('stats-details-container');
        if (!container) return;

        const tauxSortie = stats.totalCamions > 0 ? 
            (stats.camionsSortis / stats.totalCamions * 100).toFixed(1) : 0;

        container.innerHTML = `
            <div class="stats-details">
                <h3>Détails Journaliers - ${new Date(this.currentDate).toLocaleDateString('fr-FR')}</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <i class="fas fa-truck"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.totalCamions}</span>
                            <span class="stat-label">Total Camions</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-check-circle"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.camionsSortis}</span>
                            <span class="stat-label">Camions Sortis</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-percentage"></i>
                        <div class="stat-content">
                            <span class="stat-value">${tauxSortie}%</span>
                            <span class="stat-label">Taux de Sortie</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-money-bill-wave"></i>
                        <div class="stat-content">
                            <span class="stat-value">${this.formatMoney(stats.sommeGeneree)}</span>
                            <span class="stat-label">Revenus Générés</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateStatsMensuelles(stats) {
        const container = document.getElementById('stats-details-container');
        if (!container) return;

        const moisNom = new Date(this.currentYear, this.currentMonth - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

        container.innerHTML = `
            <div class="stats-details">
                <h3>Détails Mensuels - ${moisNom}</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <i class="fas fa-truck"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.totalCamions}</span>
                            <span class="stat-label">Total Camions</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-check-circle"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.camionsSortis}</span>
                            <span class="stat-label">Camions Sortis</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-calendar"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.joursActifs}</span>
                            <span class="stat-label">Jours Actifs</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-money-bill-wave"></i>
                        <div class="stat-content">
                            <span class="stat-value">${this.formatMoney(stats.sommeGeneree)}</span>
                            <span class="stat-label">Revenus Mensuels</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-percentage"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.tauxSortie.toFixed(1)}%</span>
                            <span class="stat-label">Taux de Rotation</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-chart-line"></i>
                        <div class="stat-content">
                            <span class="stat-value">${Math.round(stats.totalCamions / stats.joursActifs)}</span>
                            <span class="stat-label">Moyenne/Jour</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateStatsAnnuelles(stats) {
        const container = document.getElementById('stats-details-container');
        if (!container) return;

        container.innerHTML = `
            <div class="stats-details">
                <h3>Détails Annuels - ${this.currentYear}</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <i class="fas fa-truck"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.totalCamions}</span>
                            <span class="stat-label">Total Camions</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-check-circle"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.camionsSortis}</span>
                            <span class="stat-label">Camions Sortis</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-calendar"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.moisActifs}</span>
                            <span class="stat-label">Mois Actifs</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-money-bill-wave"></i>
                        <div class="stat-content">
                            <span class="stat-value">${this.formatMoney(stats.sommeGeneree)}</span>
                            <span class="stat-label">Revenus Annuels</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-percentage"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.tauxSortie.toFixed(1)}%</span>
                            <span class="stat-label">Taux de Rotation</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-chart-line"></i>
                        <div class="stat-content">
                            <span class="stat-value">${Math.round(stats.moyenneMensuelle)}</span>
                            <span class="stat-label">Moyenne/Mois</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Utilitaires
    formatMoney(amount) {
        return new Intl.NumberFormat('fr-FR').format(amount);
    }

    showLoading() {
        const container = document.getElementById('stats-kpi-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-kpi">Chargement des statistiques...</div>
            `;
        }
    }

    showError(message) {
        const container = document.getElementById('stats-kpi-container');
        if (container) {
            container.innerHTML = `
                <div class="message error">${message}</div>
            `;
        }
    }
}

// Initialisation
let statistiquesManager = null;

function initStatistiques() {
    const sectionStats = document.getElementById('section-statistiques');
    if (sectionStats && sectionStats.classList.contains('active') && !statistiquesManager) {
        statistiquesManager = new StatistiquesManager();
    }
}

// Observer les changements de section
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            initStatistiques();
        }
    });
});

const sectionStats = document.getElementById('section-statistiques');
if (sectionStats) {
    observer.observe(sectionStats, { attributes: true });
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
    initStatistiques();
});
