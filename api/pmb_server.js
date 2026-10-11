/**
 * Server Mandiri Khusus Frontend PMB (Penerimaan Mahasiswa Baru)
 * Berjalan di Port 7543 (Terpisah dari Frontend SIAKAD di Port 7542)
 */

const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PMB_PORT || 7543;

app.use(compression());

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
