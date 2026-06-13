const { get } = require('../db');

const tenantMiddleware = async (req, res, next) => {
  // 1. Ambil slug dari header
  const tenantSlug = req.headers['x-tenant-slug'];

  if (!tenantSlug) {
    return res.status(400).json({ error: 'x-tenant-slug header is missing. Access denied.' });
  }

  try {
    // 2. Cek database apakah tenant ada
    const tenant = await get('SELECT * FROM tenants WHERE slug = ?', [tenantSlug]);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    // 3. Inject ke object request agar route selanjutnya bisa pakai req.tenant_id
    req.tenant_id = tenant.id;
    req.tenant = tenant; // Menyimpan info tenant lengkap jika dibutuhkan
    
    next();
  } catch (error) {
    console.error('Tenant Middleware Error:', error);
    return res.status(500).json({ error: 'Internal server error while resolving tenant.' });
  }
};

module.exports = { tenantMiddleware };
