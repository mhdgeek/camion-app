// Configuration automatique des URLs API
const CONFIG = {
  API_BASE_URL: window.location.hostname.includes('localhost') 
    ? 'http://localhost:5000/api'
    : 'https://camion-app-backend.vercel.app/api'
};

console.log('🔧 Configuration chargée:', CONFIG);
window.APP_CONFIG = CONFIG;
