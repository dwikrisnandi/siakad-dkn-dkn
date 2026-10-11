/**
 * Server Mandiri Khusus Frontend PMB (Penerimaan Mahasiswa Baru)
 * Berjalan di Port 7543 (Terpisah dari Frontend SIAKAD di Port 7542)
 */

const express = require('express');
const path = require('path');
const compression = require('compression');
const http = require('http');

const app = express();
const PORT = process.env.PMB_PORT || 7543;
const API_TARGET_PORT = 7542;

app.use(compression());

// Proxy otomatis untuk request /api/ dan /uploads/ ke port 7542
const forwardRequest = (targetPathPrefix) => (req, res) => {
  const originalHost = req.headers['x-forwarded-host'] || req.headers.host || '';
  const options = {
    hostname: 'localhost',
    port: API_TARGET_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      'x-forwarded-host': originalHost,
      host: `localhost:${API_TARGET_PORT}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy Error to 7542:', err.message);
    res.status(502).json({ error: 'Gagal terhubung ke API Server (7542)' });
  });

  req.pipe(proxyReq, { end: true });
};

app.use('/api', forwardRequest('/api'));
app.use('/uploads', forwardRequest('/uploads'));

// Melayani file hasil build pmb-client
const distPath = path.join(__dirname, '../pmb-client/dist');
app.use(express.static(distPath, {
  maxAge: '1y',
  etag: true
}));

// Fallback SPA routing
app.use((req, res, next) => {
  if (path.extname(req.path) !== '') return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎓 PMB Web Server berjalan di port ${PORT}`);
  console.log(`   Akses: http://localhost:${PORT}`);
});
