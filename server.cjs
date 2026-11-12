// Tiny static file server for English Adventure (no dependencies).
// Serves the project folder with correct MIME types and HEAD support
// (HEAD is what the game's recorded-audio detection relies on).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  let urlPath = '/';
  try {
    urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (err) {
    res.writeHead(400); res.end(); return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    const headers = {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
    };
    if (req.method === 'HEAD') { res.writeHead(200, headers); res.end(); return; }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => console.log(`English Adventure is running at http://localhost:${PORT}`));
