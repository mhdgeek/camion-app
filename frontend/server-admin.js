const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 3001;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/admin.html' : req.url;
  filePath = path.join(__dirname, filePath);

  // Sécurité : empêcher l'accès aux fichiers en dehors du dossier frontend
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Accès interdit');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Si le fichier n'existe pas, servir admin.html
        fs.readFile(path.join(__dirname, 'admin.html'), (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('Fichier non trouvé');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Erreur serveur');
      }
    } else {
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(port, () => {
  console.log(`🚀 Serveur Admin démarré sur http://localhost:${port}`);
  console.log(`📁 Servant les fichiers depuis: ${__dirname}`);
});
