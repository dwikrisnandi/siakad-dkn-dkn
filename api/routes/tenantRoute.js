const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, run, get } = require('../db');

// ── GET Subscription Plans untuk ditampilkan di halaman pendaftaran ──
router.get('/plans', async (req, res) => {
  try {
    const [plans] = await query('SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price_per_month ASC');
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memuat paket sewa' });
  }
});

// ── POST Register Tenant Baru (Self-Serve) ──
router.post('/register', async (req, res) => {
  try {
    const { 
      campus_name, 
      campus_slug, 
      admin_nidn, 
      admin_name, 
      admin_password, 
      plan_id,
      country
    } = req.body;

    // Validasi input
    if (!campus_name || !campus_slug || !admin_nidn || !admin_name || !admin_password || !plan_id) {
      return res.status(400).json({ error: 'Semua kolom wajib diisi.' });
    }

    // Default country Indonesia jika tidak diisi
    const selectedCountry = country || 'Indonesia';

    // Pastikan slug unik dan URL-friendly
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(campus_slug)) {
      return res.status(400).json({ error: 'Slug hanya boleh berisi huruf kecil, angka, dan strip (-).' });
    }

    const [existingTenant] = await query('SELECT id FROM tenants WHERE slug = ?', [campus_slug]);
    if (existingTenant.length > 0) {
      return res.status(400).json({ error: 'Subdomain/Slug tersebut sudah digunakan kampus lain.' });
    }

    // Ambil detail paket langganan
    const [plans] = await query('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
    if (plans.length === 0) {
      return res.status(400).json({ error: 'Paket langganan tidak valid.' });
    }
    const plan = plans[0];

    // Mulai pembuatan Tenant dan Admin
    // Set trial atau status unpaid, di sini kita set active dengan trial 14 hari
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14); // Trial 14 hari

    const insertTenant = await run(
      `INSERT INTO tenants (
        slug, name, theme_color, max_students, is_ai_enabled, ai_points, 
        subscription_status, subscription_end_date, active_plan_id, country
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        campus_slug, 
        campus_name, 
        '#0d6efd', // Default bootstrap blue
        plan.max_students, 
        true, 
        10, // Beri 10 poin AI gratis untuk trial
        'trial', 
        endDate, 
        plan.id,
        selectedCountry
      ]
    );

    const newTenantId = insertTenant.id;

    // Buat akun Admin
    const hashedPassword = await bcrypt.hash(admin_password, 10);
    await run(
      'INSERT INTO users (nidn_nim, name, role, password, tenant_id) VALUES (?, ?, ?, ?, ?)',
      [admin_nidn, admin_name, 'admin', hashedPassword, newTenantId]
    );

    res.status(201).json({ 
      message: 'Pendaftaran kampus berhasil! Anda sekarang bisa login.',
      tenant_slug: campus_slug
    });

  } catch (error) {
    console.error('Register Tenant Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mendaftarkan kampus.' });
  }
});

module.exports = router;
