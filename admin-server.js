import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3001;

// Simple HTTP server that only serves our static admin
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let filePath;
  if (req.url === '/' || req.url === '/admin') {
    filePath = path.join(__dirname, 'static-admin-fixed.html');
  } else if (req.url === '/static-admin-fixed.html') {
    filePath = path.join(__dirname, 'static-admin-fixed.html');
  } else {
    // Try to serve the file from current directory
    filePath = path.join(__dirname, req.url);
  }
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found, serve the admin dashboard
      filePath = path.join(__dirname, 'static-admin-fixed.html');
    }
    
    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
        return;
      }
      
      // Set content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'text/html';
      
      switch (ext) {
        case '.js':
          contentType = 'application/javascript';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.svg':
          contentType = 'image/svg+xml';
          break;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🎭 Static Admin Server running at http://127.0.0.1:${PORT}/`);
  console.log(`📱 Admin Dashboard: http://127.0.0.1:${PORT}/`);
  console.log(`🔧 Direct access: http://127.0.0.1:${PORT}/static-admin-fixed.html`);
  console.log('✅ No React, no reloading, pure HTML admin dashboard');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down static admin server...');
  server.close(() => {
    console.log('✅ Static admin server stopped');
    process.exit(0);
  });
});