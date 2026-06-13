const express = require('express');
const router = express.Router();
const { query, run, get } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

// ==========================================
// 1. Master Data Prodi (Programs)
// ==========================================

router.get('/programs', verifyToken, async (req, res) => {
  try {
    const [programs] = await query('SELECT * FROM programs ORDER BY nama_prodi ASC');
    res.json(programs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/programs', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { nama_prodi, fakultas, kode_prodi } = req.body;
    await run('INSERT INTO programs (nama_prodi, fakultas, kode_prodi) VALUES (?, ?, ?)', [nama_prodi, fakultas, kode_prodi]);
    res.json({ message: 'Program studi berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/programs/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { nama_prodi, fakultas, kode_prodi } = req.body;
    await run('UPDATE programs SET nama_prodi = ?, fakultas = ?, kode_prodi = ? WHERE id = ?', [nama_prodi, fakultas, kode_prodi, req.params.id]);
    res.json({ message: 'Program studi berhasil diupdate' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/programs/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM programs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Program studi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. Master Kurikulum
// ==========================================

router.get('/curriculums', verifyToken, async (req, res) => {
  try {
    const [curriculums] = await query(`
      SELECT c.*, p.nama_prodi 
      FROM curriculums c 
      LEFT JOIN programs p ON c.program_id = p.id 
      ORDER BY c.tahun_berlaku DESC
    `);
    res.json(curriculums);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/curriculums', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { program_id, tahun_berlaku, status_aktif } = req.body;
    await run('INSERT INTO curriculums (program_id, tahun_berlaku, status_aktif) VALUES (?, ?, ?)', [program_id, tahun_berlaku, status_aktif]);
    res.json({ message: 'Kurikulum berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/curriculums/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { program_id, tahun_berlaku, status_aktif } = req.body;
    await run('UPDATE curriculums SET program_id = ?, tahun_berlaku = ?, status_aktif = ? WHERE id = ?', [program_id, tahun_berlaku, status_aktif, req.params.id]);
    res.json({ message: 'Kurikulum berhasil diupdate' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/curriculums/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM curriculums WHERE id = ?', [req.params.id]);
    res.json({ message: 'Kurikulum berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. Modul Keuangan (Invoices)
// ==========================================

router.get('/invoices', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const [invoices] = await query(`
      SELECT i.*, u.name as mahasiswa_name, u.nidn_nim as nim, a.name as academic_year_name 
      FROM invoices i 
      LEFT JOIN users u ON i.mahasiswa_id = u.id 
      LEFT JOIN academic_years a ON i.academic_year_id = a.id 
      ORDER BY i.id DESC
    `);
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invoices', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { mahasiswa_id, academic_year_id, nominal, status_lunas, tanggal_bayar } = req.body;
    await run('INSERT INTO invoices (mahasiswa_id, academic_year_id, nominal, status_lunas, tanggal_bayar) VALUES (?, ?, ?, ?, ?)', 
      [mahasiswa_id, academic_year_id, nominal, status_lunas || false, tanggal_bayar || null]);
    res.json({ message: 'Tagihan berhasil dibuat' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/invoices/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { nominal, status_lunas, tanggal_bayar } = req.body;
    await run('UPDATE invoices SET nominal = ?, status_lunas = ?, tanggal_bayar = ? WHERE id = ?', 
      [nominal, status_lunas, tanggal_bayar || null, req.params.id]);
    res.json({ message: 'Tagihan berhasil diupdate' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/invoices/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Tagihan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper route to get user invoices for students
router.get('/my-invoices', verifyToken, async (req, res) => {
  try {
    const [invoices] = await query(`
      SELECT i.*, a.name as academic_year_name 
      FROM invoices i 
      LEFT JOIN academic_years a ON i.academic_year_id = a.id 
      WHERE i.mahasiswa_id = ?
      ORDER BY i.id DESC
    `, [req.userId]);
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
