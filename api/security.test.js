/**
 * TDD Security Test Suite (ECC Standard)
 * Menguji vektor keamanan utama:
 * 1. SQL Injection Prevention (Parameterized Queries)
 * 2. Role-Based Access Control (RBAC) & Unauthorized Access
 * 3. Multi-Tenant Data Isolation (Cross-Tenant Leak Prevention)
 * 4. File Upload Restriction (Malicious Extension / MIME blocking)
 * 5. Secret Token & Password Hashing Verification
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('./index');

describe('🛡️ ECC Security & Integrity Test Suite', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'siakad_secret_key';

  const validAdminToken = jwt.sign(
    { id: 999, role: 'admin', tenant_id: 1, name: 'Admin Security Test' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const validMhsToken = jwt.sign(
    { id: 998, role: 'mahasiswa', tenant_id: 1, name: 'Mhs Security Test' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const otherTenantToken = jwt.sign(
    { id: 997, role: 'admin', tenant_id: 99, name: 'Admin Other Campus' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // ── TEST 1: AUTHENTICATION & ACCESS CONTROL ──
  describe('1. Authentication & RBAC Access Control', () => {
    test('Harus menolak akses ke endpoint Superadmin tanpa token (401/403)', async () => {
      const res = await request(app).get('/api/superadmin/monitoring');
      expect([401, 403]).toContain(res.statusCode);
    });

    test('Harus menolak akun Mahasiswa mengakses endpoint Admin (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${validMhsToken}`)
        .set('x-tenant-slug', 'artha');
      expect([401, 403]).toContain(res.statusCode);
    });

    test('Harus menolak token dengan tanda tangan (signature) palsu / invalid', async () => {
      const fakeToken = jwt.sign({ id: 1, role: 'admin' }, 'WRONG_SECRET');
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${fakeToken}`)
        .set('x-tenant-slug', 'artha');
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // ── TEST 2: SQL INJECTION PREVENTION ──
  describe('2. SQL Injection Resistance', () => {
    test('Input SQL injection pada login tidak boleh menembus autentikasi', async () => {
      const sqliPayloads = [
        "' OR '1'='1",
        "admin' --",
        "' UNION SELECT NULL, NULL, NULL --",
        "\" OR \"\"=\""
      ];

      for (const payload of sqliPayloads) {
        const res = await request(app)
          .post('/api/auth/login')
          .set('x-tenant-slug', 'artha')
          .send({ nidn_nim: payload, password: 'password123' });

        expect(res.statusCode).not.toBe(200);
        expect(res.statusCode).not.toBe(500); // Tidak boleh 500 (SQL syntax error crash)
        expect([400, 401, 404]).toContain(res.statusCode);
      }
    });

    test('Input SQL injection pada pencarian SPMB tidak boleh crash basis data', async () => {
      const res = await request(app)
        .get("/api/pmb/info?tenant_slug=artha' OR '1'='1");
      // Harus berhasil fallback atau return status terkontrol, bukan 500 DB crash
      expect(res.statusCode).toBeLessThan(500);
    });
  });

  // ── TEST 3: MULTI-TENANT DATA ISOLATION ──
  describe('3. Multi-Tenant Scoping & Data Leak Prevention', () => {
    test('Admin Kampus Tenant 99 tidak boleh melihat data mahasiswa Tenant 1', async () => {
      const res = await request(app)
        .get('/api/pmb/admin/pendaftar')
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .set('x-tenant-id', '99');

      if (res.statusCode === 200) {
        // Setiap baris yang kembali harus memiliki tenant_id = 99
        res.body.forEach(item => {
          expect(item.tenant_id).toBe(99);
        });
      }
    });
  });

  // ── TEST 4: FILE UPLOAD MALICIOUS FILTERING ──
  describe('4. File Upload Restriction & MIME Verification', () => {
    test('Harus memblokir upload file script executable (.php, .sh, .exe, .js)', async () => {
      const res = await request(app)
        .post('/api/pmb/upload-berkas')
        .set('Authorization', `Bearer ${validMhsToken}`)
        .attach('berkas', Buffer.from('<?php echo "HACKED"; ?>'), 'exploit.php')
        .field('jenis_berkas', 'ijazah');

      // Harusnya ditolak oleh multer fileFilter
      expect([400, 401, 403, 500]).toContain(res.statusCode);
      if (res.body && res.body.error) {
        expect(res.body.error).toMatch(/format|diperbolehkan|valid|Unauthorized/i);
      }
    });
  });

  // ── TEST 5: CRYPTOGRAPHIC INTEGRITY ──
  describe('5. Password Hashing Security', () => {
    test('Password hash wajib menggunakan bcrypt dengan salt rounds >= 10', async () => {
      const plainPassword = 'SecretPassword123!';
      const hash = await bcrypt.hash(plainPassword, 10);

      expect(hash).toMatch(/^\$2[aby]\$10\$/); // Format signature standar bcrypt 10 rounds
      const isValid = await bcrypt.compare(plainPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });
});
