const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');

// Multer Storage untuk Berkas & Bukti Pembayaran PMB
const uploadDir = path.join(__dirname, '../uploads/pmb');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `pmb_${Date.now()}_${Math.round(Math.random() * 1E6)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Hanya format JPG, PNG, atau PDF yang diperbolehkan!'));
  }
});

// Middleware Helper: Ambil Tenant ID dari Host Header, Query, Slug, atau Default 1
const resolveTenantId = async (req, res, next) => {
  try {
    const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
    
    // 1. Cek dari Custom Domain SPMB
    if (rawHost && rawHost !== 'localhost' && rawHost !== '127.0.0.1') {
      const dRes = await db.query('SELECT id FROM tenants WHERE custom_domain_spmb = $1 OR custom_domain_siakad = $1 LIMIT 1', [rawHost]);
      if (dRes.rows.length > 0) {
        req.tenantId = dRes.rows[0].id;
        return next();
      }

      // 2. Cek dari Subdomain Slug (misal: "unimandiri.spmb.domain.com")
      if (rawHost.includes('.')) {
        const parts = rawHost.split('.');
        const subCandidate = parts[0];
        if (subCandidate && subCandidate !== 'spmb' && subCandidate !== 'siakad' && subCandidate !== 'www') {
          const sRes = await db.query('SELECT id FROM tenants WHERE slug = $1 LIMIT 1', [subCandidate]);
          if (sRes.rows.length > 0) {
            req.tenantId = sRes.rows[0].id;
            return next();
          }
        }
      }
    }

    // 3. Cek dari Header eksplisit x-tenant-slug atau query string
    const tenantSlug = req.headers['x-tenant-slug'] || req.query.tenant_slug;
    if (tenantSlug) {
      const tenantRes = await db.query('SELECT id FROM tenants WHERE slug = $1 LIMIT 1', [tenantSlug]);
      if (tenantRes.rows.length > 0) {
        req.tenantId = tenantRes.rows[0].id;
        return next();
      }
    }

    // 4. Fallback ke x-tenant-id atau Tenant ID: 1
    req.tenantId = req.headers['x-tenant-id'] ? parseInt(req.headers['x-tenant-id'], 10) : 1;
    next();
  } catch (e) {
    console.error('Resolve tenant error in PMB:', e.message);
    req.tenantId = 1;
    next();
  }
};

// Middleware: Otentikasi Calon Mahasiswa (JWT Khusus PMB)
const verifyPmbToken = (req, res, next) => {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }
  if (!token) return res.status(401).json({ error: 'Token otentikasi tidak ditemukan' });

  jwt.verify(token, process.env.JWT_SECRET || 'siakad_secret_key', (err, decoded) => {
    if (err || decoded.role !== 'calon_mahasiswa') {
      return res.status(403).json({ error: 'Sesi tidak valid atau telah berakhir' });
    }
    req.pmbId = decoded.id;
    req.tenantId = decoded.tenant_id;
    next();
  });
};

// ── 1. INFO PUBLIK KAMPUS & JALUR PENDAFTARAN ────────────────────────────────
router.get('/info', resolveTenantId, async (req, res) => {
  try {
    const tenantRes = await db.query('SELECT id, name, slug, logo_url FROM tenants WHERE id = $1', [req.tenantId]);
    const tenant = tenantRes.rows[0] || { id: 1, name: 'SIAKAD Universitas', slug: 'main' };

    const jalurRes = await db.query(
      'SELECT id, nama_jalur, gelombang, tgl_buka, tgl_tutup, biaya_pendaftaran FROM pmb_jalur WHERE tenant_id = $1 AND is_active = true ORDER BY gelombang ASC',
      [req.tenantId]
    );

    // Ambil daftar prodi yang tersedia (menggunakan tabel programs)
    let prodiList = [];
    try {
      const pRes = await db.query('SELECT id, nama_prodi, kode_prodi, fakultas FROM programs ORDER BY nama_prodi ASC');
      prodiList = pRes.rows;
    } catch (e) {
      console.error('Fetch programs error:', e.message);
    }

    res.json({
      tenant,
      jalur: jalurRes.rows,
      prodi: prodiList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 2. REGISTRASI CALON MAHASISWA BARU ────────────────────────────────────────
router.post('/register', resolveTenantId, async (req, res) => {
  const {
    nama_lengkap, nik, email, no_hp, password,
    jalur_id, prodi_pilihan_1, prodi_pilihan_2,
    tempat_lahir, tanggal_lahir, jenis_kelamin, asal_sekolah
  } = req.body;

  if (!nama_lengkap || !email || !password || !no_hp || !nik) {
    return res.status(400).json({ error: 'Nama lengkap, NIK, email, no HP, dan password wajib diisi' });
  }

  try {
    // Cek apakah email atau NIK sudah terdaftar di tenant ini
    const existing = await db.query(
      'SELECT id FROM pmb_pendaftar WHERE tenant_id = $1 AND (email = $2 OR nik = $3)',
      [req.tenantId, email, nik]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email atau NIK sudah pernah terdaftar di gelombang ini' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Generate No Pendaftaran: PMB-YYYY-T[tenant]-RANDOM
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const noPendaftaran = `PMB-${year}-T${req.tenantId}-${rand}`;

    const insertRes = await db.query(`
      INSERT INTO pmb_pendaftar (
        tenant_id, no_pendaftaran, nama_lengkap, nik, email, no_hp, password_hash,
        jalur_id, prodi_pilihan_1, prodi_pilihan_2,
        tempat_lahir, tanggal_lahir, jenis_kelamin, asal_sekolah,
        status_pembayaran, status_berkas, status_kelulusan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'unpaid', 'draft', 'pending')
      RETURNING id, no_pendaftaran, nama_lengkap, email
    `, [
      req.tenantId, noPendaftaran, nama_lengkap, nik, email, no_hp, hash,
      jalur_id || null, prodi_pilihan_1 || null, prodi_pilihan_2 || null,
      tempat_lahir || null, tanggal_lahir || null, jenis_kelamin || null, asal_sekolah || null
    ]);

    const user = insertRes.rows[0];
    const token = jwt.sign(
      { id: user.id, role: 'calon_mahasiswa', tenant_id: req.tenantId, email: user.email },
      process.env.JWT_SECRET || 'siakad_secret_key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registrasi berhasil',
      token,
      pendaftar: user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 3. LOGIN CALON MAHASISWA BARU ────────────────────────────────────────────
router.post('/login', resolveTenantId, async (req, res) => {
  const { identifier, password } = req.body; // identifier bisa email atau no_pendaftaran
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/No Pendaftaran dan password wajib diisi' });
  }

  try {
    const userRes = await db.query(
      `SELECT * FROM pmb_pendaftar WHERE tenant_id = $1 AND (email = $2 OR no_pendaftaran = $2) LIMIT 1`,
      [req.tenantId, identifier]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Akun pendaftar tidak ditemukan' });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Password salah' });
    }

    const token = jwt.sign(
      { id: user.id, role: 'calon_mahasiswa', tenant_id: user.tenant_id, email: user.email },
      process.env.JWT_SECRET || 'siakad_secret_key',
      { expiresIn: '7d' }
    );

    delete user.password_hash;
    res.json({
      message: 'Login berhasil',
      token,
      pendaftar: user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 4. PROFILE & BIODATA LENGKAP PENDAFTAR ─────────────────────────────────────
router.get('/profile', verifyPmbToken, async (req, res) => {
  try {
    const pRes = await db.query(`
      SELECT p.*, j.nama_jalur, j.biaya_pendaftaran,
             pr1.nama_prodi as nama_prodi_1, pr2.nama_prodi as nama_prodi_2
      FROM pmb_pendaftar p
      LEFT JOIN pmb_jalur j ON p.jalur_id = j.id
      LEFT JOIN programs pr1 ON p.prodi_pilihan_1 = pr1.id
      LEFT JOIN programs pr2 ON p.prodi_pilihan_2 = pr2.id
      WHERE p.id = $1 AND p.tenant_id = $2
    `, [req.pmbId, req.tenantId]);

    if (pRes.rows.length === 0) return res.status(404).json({ error: 'Data pendaftar tidak ditemukan' });

    const pendaftar = pRes.rows[0];
    delete pendaftar.password_hash;

    // Ambil berkas-berkas yang sudah diunggah
    const berkasRes = await db.query(
      'SELECT id, jenis_berkas, file_url, status_verifikasi, catatan, uploaded_at FROM pmb_berkas WHERE pendaftar_id = $1 ORDER BY id ASC',
      [req.pmbId]
    );

    // Ambil riwayat pembayaran
    const bayarRes = await db.query(
      'SELECT id, metode_pembayaran, bukti_transfer_url, nominal, status, created_at FROM pmb_pembayaran WHERE pendaftar_id = $1 ORDER BY id DESC',
      [req.pmbId]
    );

    res.json({
      pendaftar,
      berkas: berkasRes.rows,
      pembayaran: bayarRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Biodata Calon Mahasiswa
router.put('/profile', verifyPmbToken, async (req, res) => {
  const {
    nama_lengkap, nik, no_hp, tempat_lahir, tanggal_lahir,
    jenis_kelamin, alamat, asal_sekolah, nama_ortu, no_hp_ortu,
    prodi_pilihan_1, prodi_pilihan_2
  } = req.body;

  try {
    await db.query(`
      UPDATE pmb_pendaftar SET
        nama_lengkap = COALESCE($1, nama_lengkap),
        nik = COALESCE($2, nik),
        no_hp = COALESCE($3, no_hp),
        tempat_lahir = COALESCE($4, tempat_lahir),
        tanggal_lahir = COALESCE($5, tanggal_lahir),
        jenis_kelamin = COALESCE($6, jenis_kelamin),
        alamat = COALESCE($7, alamat),
        asal_sekolah = COALESCE($8, asal_sekolah),
        nama_ortu = COALESCE($9, nama_ortu),
        no_hp_ortu = COALESCE($10, no_hp_ortu),
        prodi_pilihan_1 = COALESCE($11, prodi_pilihan_1),
        prodi_pilihan_2 = COALESCE($12, prodi_pilihan_2),
        status_berkas = CASE WHEN status_berkas = 'draft' THEN 'submitted' ELSE status_berkas END
      WHERE id = $13 AND tenant_id = $14
    `, [
      nama_lengkap, nik, no_hp, tempat_lahir, tanggal_lahir,
      jenis_kelamin, alamat, asal_sekolah, nama_ortu, no_hp_ortu,
      prodi_pilihan_1, prodi_pilihan_2, req.pmbId, req.tenantId
    ]);

    res.json({ message: 'Biodata berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 5. UPLOAD BERKAS SYARAT PMB ───────────────────────────────────────────────
router.post('/upload-berkas', verifyPmbToken, upload.single('berkas'), async (req, res) => {
  const { jenis_berkas } = req.body;
  if (!req.file || !jenis_berkas) {
    return res.status(400).json({ error: 'File berkas dan jenis berkas wajib dikirim' });
  }

  const fileUrl = `/uploads/pmb/${req.file.filename}`;

  try {
    // Hapus record berkas lama jika mengunggah ulang jenis berkas yang sama
    await db.query(
      'DELETE FROM pmb_berkas WHERE pendaftar_id = $1 AND jenis_berkas = $2',
      [req.pmbId, jenis_berkas]
    );

    const bRes = await db.query(`
      INSERT INTO pmb_berkas (tenant_id, pendaftar_id, jenis_berkas, file_url, status_verifikasi)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `, [req.tenantId, req.pmbId, jenis_berkas, fileUrl]);

    res.json({
      message: 'Berkas berhasil diunggah',
      berkas: bRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 6. KONFIRMASI PEMBAYARAN FORMULIR ─────────────────────────────────────────
router.post('/upload-pembayaran', verifyPmbToken, upload.single('bukti'), async (req, res) => {
  const { nominal, bank_tujuan, nomor_rekening_tujuan } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'Bukti transfer wajib diunggah' });
  }

  const buktiUrl = `/uploads/pmb/${req.file.filename}`;

  try {
    const payRes = await db.query(`
      INSERT INTO pmb_pembayaran (
        tenant_id, pendaftar_id, metode_pembayaran, bank_tujuan,
        nomor_rekening_tujuan, bukti_transfer_url, nominal, status
      ) VALUES ($1, $2, 'transfer_bank', $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [req.tenantId, req.pmbId, bank_tujuan || 'Bank BCA', nomor_rekening_tujuan || '1234567890', buktiUrl, nominal || 250000]);

    // Update status pembayaran pendaftar ke pending verifikasi
    await db.query(
      'UPDATE pmb_pendaftar SET status_pembayaran = \'pending\' WHERE id = $1',
      [req.pmbId]
    );

    res.json({
      message: 'Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.',
      pembayaran: payRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 7. ADMIN KAMPUS PMB: KELOLA JALUR PENDAFTARAN ─────────────────────────────
const { verifyToken, verifyRole } = require('../middlewares/auth');

// Ambil semua jalur pendaftaran milik tenant
router.get('/admin/jalur', [verifyToken, verifyRole(['admin', 'superadmin'])], async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 1;
    const jalur = await db.query(
      'SELECT * FROM pmb_jalur WHERE tenant_id = $1 ORDER BY gelombang ASC, id ASC',
      [tenantId]
    );
    res.json(jalur.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tambah jalur baru
router.post('/admin/jalur', [verifyToken, verifyRole(['admin', 'superadmin'])], async (req, res) => {
  const { nama_jalur, gelombang, tgl_buka, tgl_tutup, biaya_pendaftaran, is_active } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 1;
  try {
    const insertRes = await db.query(`
      INSERT INTO pmb_jalur (tenant_id, nama_jalur, gelombang, tgl_buka, tgl_tutup, biaya_pendaftaran, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [tenantId, nama_jalur, gelombang || 1, tgl_buka, tgl_tutup, biaya_pendaftaran || 0, is_active ?? true]);
    res.json({ message: 'Jalur pendaftaran berhasil ditambahkan', jalur: insertRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update jalur
router.put('/admin/jalur/:id', [verifyToken, verifyRole(['admin', 'superadmin'])], async (req, res) => {
  const { nama_jalur, gelombang, tgl_buka, tgl_tutup, biaya_pendaftaran, is_active } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 1;
  try {
    await db.query(`
      UPDATE pmb_jalur SET
        nama_jalur = COALESCE($1, nama_jalur),
        gelombang = COALESCE($2, gelombang),
        tgl_buka = COALESCE($3, tgl_buka),
        tgl_tutup = COALESCE($4, tgl_tutup),
        biaya_pendaftaran = COALESCE($5, biaya_pendaftaran),
        is_active = COALESCE($6, is_active)
      WHERE id = $7 AND tenant_id = $8
    `, [nama_jalur, gelombang, tgl_buka, tgl_tutup, biaya_pendaftaran, is_active, req.params.id, tenantId]);
    res.json({ message: 'Jalur pendaftaran berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hapus jalur
router.delete('/admin/jalur/:id', [verifyToken, verifyRole(['admin', 'superadmin'])], async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || 1;
  try {
    await db.query('DELETE FROM pmb_jalur WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    res.json({ message: 'Jalur pendaftaran berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 8. ADMIN KAMPUS PMB: KELOLA CALON PENDAFTAR & VERIFIKASI ──────────────────
router.get('/admin/pendaftar', [verifyToken, verifyRole(['admin', 'superadmin'])], async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || 1;
  try {
    const pRes = await db.query(`
      SELECT p.*, j.nama_jalur, pr1.nama_prodi as nama_prodi_1, pr2.nama_prodi as nama_prodi_2,
             (SELECT count(*) FROM pmb_berkas b WHERE b.pendaftar_id = p.id) as total_berkas
      FROM pmb_pendaftar p
      LEFT JOIN pmb_jalur j ON p.jalur_id = j.id
      LEFT JOIN programs pr1 ON p.prodi_pilihan_1 = pr1.id
      LEFT JOIN programs pr2 ON p.prodi_pilihan_2 = pr2.id
      WHERE p.tenant_id = $1
      ORDER BY p.id DESC
    `, [tenantId]);
    res.json(pRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status pendaftar (pembayaran, berkas, seleksi/lulus)
router.put('/admin/pendaftar/:id/status', [verifyToken, verifyRole(['admin', 'superadmin'])], async (req, res) => {
  const { status_pembayaran, status_berkas, status_kelulusan, catatan_admin } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 1;
  try {
    await db.query(`
      UPDATE pmb_pendaftar SET
        status_pembayaran = COALESCE($1, status_pembayaran),
        status_berkas = COALESCE($2, status_berkas),
        status_kelulusan = COALESCE($3, status_kelulusan),
        catatan_admin = COALESCE($4, catatan_admin)
      WHERE id = $5 AND tenant_id = $6
    `, [status_pembayaran, status_berkas, status_kelulusan, catatan_admin, req.params.id, tenantId]);
    res.json({ message: 'Status pendaftar berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Promote pendaftar yang lulus menjadi Mahasiswa Resmi di SIAKAD
router.post('/admin/pendaftar/:id/promote', [verifyToken, verifyRole(['admin', 'superadmin'])], async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || 1;
  const { nim, prodi_id } = req.body;

  try {
    const pRes = await db.query('SELECT * FROM pmb_pendaftar WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId]);
    if (pRes.rows.length === 0) return res.status(404).json({ error: 'Pendaftar tidak ditemukan' });

    const p = pRes.rows[0];
    const targetNim = nim || `${new Date().getFullYear()}${Math.floor(10000 + Math.random() * 90000)}`;
    const targetProdi = prodi_id || p.prodi_pilihan_1;

    // Cek apakah NIM sudah dipakai
    const existing = await db.query('SELECT id FROM users WHERE nidn_nim = $1 AND tenant_id = $2', [targetNim, tenantId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `NIM ${targetNim} sudah digunakan oleh mahasiswa lain!` });
    }

    // Insert ke tabel users sebagai mahasiswa
    const passDefault = p.nik ? p.nik.slice(-6) : '123456';
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(passDefault, 10);

    await db.query(`
      INSERT INTO users (nidn_nim, name, role, password, program_id, tenant_id)
      VALUES ($1, $2, 'mahasiswa', $3, $4, $5)
    `, [targetNim, p.nama_lengkap, hashed, targetProdi, tenantId]);

    // Update status di pmb_pendaftar
    await db.query(`
      UPDATE pmb_pendaftar SET 
        status_kelulusan = 'passed',
        nim_generated = $1
      WHERE id = $2
    `, [targetNim, req.params.id]);

    res.json({
      message: `Pendaftar ${p.nama_lengkap} berhasil dipromosikan menjadi Mahasiswa Aktif SIAKAD!`,
      nim: targetNim,
      password_default: passDefault
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
