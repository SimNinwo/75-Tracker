const http = require('http');
const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

function startServer(port = 3000) {
  const root = path.resolve(__dirname, '../../');
  const server = http.createServer((req, res) => {
    const requestedUrl = req.url.split('?')[0];
    let filePath = path.join(root, requestedUrl === '/' ? 'index.html' : requestedUrl);

    // If path is a directory, serve index.html from it
    fs.stat(filePath, (statErr, stats) => {
      if (!statErr && stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found: ' + filePath);
          return;
        }
        const ext = path.extname(filePath);
        const type = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(data);
      });
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${port}`,
      close: () => new Promise((done) => server.close(done)),
    }));
  });
}

module.exports = { startServer };
