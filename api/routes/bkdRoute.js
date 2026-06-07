const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { get, query, run } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

// Configure Multer for PDF/Image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../client/dist/uploads/bkd');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// === ROLES & TUGAS TAMBAHAN ===

// GET structural roles (Admin)
router.get('/bkd/roles', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const [roles] = await query('SELECT * FROM structural_roles ORDER BY id ASC');
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching roles' });
  }
});

// GET dosen tugas tambahan (Admin/Pimpinan)
router.get('/bkd/tugas-tambahan', [verifyToken, verifyRole(['admin', 'dosen'])], async (req, res) => {
  try {
    const sql = `
      SELECT dt.*, u.name as dosen_name, u.nidn_nim, r.nama_jabatan, r.sks_ekuivalen
      FROM dosen_tugas_tambahan dt
      JOIN users u ON dt.dosen_id = u.id
      JOIN structural_roles r ON dt.structural_role_id = r.id
    `;
    const [data] = await query(sql);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching tugas tambahan' });
  }
});

// POST assign tugas tambahan (Admin)
router.post('/bkd/tugas-tambahan', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { dosen_id, structural_role_id, nomor_sk, tgl_mulai, tgl_selesai } = req.body;
    await run(
      `INSERT INTO dosen_tugas_tambahan (dosen_id, structural_role_id, nomor_sk, tgl_mulai, tgl_selesai) 
       VALUES (?, ?, ?, ?, ?)`,
      [dosen_id, structural_role_id, nomor_sk, tgl_mulai, tgl_selesai]
    );
    res.json({ message: 'Tugas tambahan berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ error: 'Failed assigning role' });
  }
});

// DELETE tugas tambahan (Admin)
router.delete('/bkd/tugas-tambahan/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM dosen_tugas_tambahan WHERE id = ?', [req.params.id]);
    res.json({ message: 'Tugas tambahan dihapus' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// === REPOSITORY BKD ===

// GET documents for logged-in Dosen
router.get('/bkd/documents/me', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const [docs] = await query(
      'SELECT d.*, a.name as academic_year FROM bkd_documents d LEFT JOIN academic_years a ON d.academic_year_id = a.id WHERE d.dosen_id = ? ORDER BY d.id DESC',
      [req.user.id]
    );
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching documents' });
  }
});

// GET all documents for Admin/Kaprodi
router.get('/bkd/documents', [verifyToken, verifyRole(['admin', 'dosen'])], async (req, res) => {
  try {
    const [docs] = await query(`
      SELECT d.*, u.name as dosen_name, u.nidn_nim, a.name as academic_year 
      FROM bkd_documents d 
      JOIN users u ON d.dosen_id = u.id
      LEFT JOIN academic_years a ON d.academic_year_id = a.id
      ORDER BY d.id DESC
    `);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching documents' });
  }
});

// POST upload document (Dosen)
router.post('/bkd/documents', [verifyToken, verifyRole(['dosen']), upload.single('file')], async (req, res) => {
  try {
    const { category, title } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File wajib diunggah' });
    
    const activeYear = await get('SELECT id FROM academic_years WHERE is_active = 1');
    const academic_year_id = activeYear ? activeYear.id : null;
    const file_url = `/uploads/bkd/${req.file.filename}`;

    await run(
      'INSERT INTO bkd_documents (dosen_id, category, title, file_url, academic_year_id) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, category, title, file_url, academic_year_id]
    );

    res.json({ message: 'Dokumen berhasil diunggah', url: file_url });
  } catch (err) {
    res.status(500).json({ error: 'Gagal upload dokumen' });
  }
});

// DELETE document (Dosen)
router.delete('/bkd/documents/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const doc = await get('SELECT file_url FROM bkd_documents WHERE id = ? AND dosen_id = ?', [req.params.id, req.user.id]);
    if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

    // Hapus file fisik
    const filePath = path.join(__dirname, '../../client/dist', doc.file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await run('DELETE FROM bkd_documents WHERE id = ? AND dosen_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Dokumen dihapus' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal hapus dokumen' });
  }
});

module.exports = router;
