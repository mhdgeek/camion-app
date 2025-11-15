const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 3001;

http.createServer((req, res) => {
  console.log('Requête reçue:', req.url);
  
  let filePath = req.url;
  if (filePath === '/') {
    filePath = '/admin.html';
  }
  
  // Chemin complet du fichier
  const fullPath = path.join(__dirname, filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      console.log('Fichier non trouvé:', filePath);
      res.writeHead(404);
      res.end('Fichier non trouvé: ' + filePath);
    } else {
      // Déterminer le type de contenu
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      
      if (ext === '.css') contentType = 'text/css';
      if (ext === '.js') contentType = 'application/javascript';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}).listen(port, () => {
  console.log('=================================');
  console.log('🚀 INTERFACE ADMIN DÉMARRÉE !');
  console.log('=================================');
  console.log('📊 Accédez à: http://localhost:' + port);
  console.log('🔐 Identifiants: admin@carriere.com / admin123');
  console.log('=================================');
});
