const { get } = require('../db');
const { tenantStorage } = require('../tenantContext');

const tenantMiddleware = async (req, res, next) => {
  try {
    // 1. Ambil host dari request (misal: "siakad.kampus.ac.id" atau "kampus-a.siakad...")
    const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
    let tenant = null;

    // 2. Cek apakah Host cocok dengan Custom Domain terdaftar di database
    if (rawHost && rawHost !== 'localhost' && rawHost !== '127.0.0.1') {
      tenant = await get(
        'SELECT * FROM tenants WHERE custom_domain_siakad = ? OR custom_domain_spmb = ? LIMIT 1',
        [rawHost, rawHost]
      );

      // 3. Jika bukan custom domain, cek apakah ada subdomain slug (misal: "unimandiri.siakad.domain.com")
      if (!tenant && rawHost.includes('.')) {
        const parts = rawHost.split('.');
        // Jika format subdomain: slug.siakad... atau slug.spmb...
        const subCandidate = parts[0];
        if (subCandidate && subCandidate !== 'siakad' && subCandidate !== 'spmb' && subCandidate !== 'www') {
          tenant = await get('SELECT * FROM tenants WHERE slug = ? LIMIT 1', [subCandidate]);
        }
      }
    }

    // 4. Cek via header eksplisit (x-tenant-slug atau x-tenant-id)
    if (!tenant) {
      const explicitSlug = req.headers['x-tenant-slug'];
      if (explicitSlug) {
        tenant = await get('SELECT * FROM tenants WHERE slug = ? LIMIT 1', [explicitSlug]);
      }
    }

    // 5. Fallback ke Tenant ID: 1 jika belum terdeteksi (memastikan layanan tetap stabil)
    if (!tenant) {
      tenant = await get('SELECT * FROM tenants WHERE id = 1 LIMIT 1');
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant tidak ditemukan.' });
    }

    // Inject ke request dan context storage
    req.tenant_id = tenant.id;
    req.tenant = tenant;
    
    tenantStorage.run({ tenantId: tenant.id, tenantSlug: tenant.slug }, () => {
      next();
    });
  } catch (error) {
    console.error('Tenant Middleware Error:', error);
    return res.status(500).json({ error: 'Internal server error while resolving tenant.' });
  }
};

module.exports = { tenantMiddleware, tenantStorage };
