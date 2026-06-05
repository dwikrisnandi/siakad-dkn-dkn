const express = require('express');
const router = express.Router();
const { get, all, run } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

// GET all skripsi for admin/kaprodi
router.get('/skripsi', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const sql = `
      SELECT s.*, u.name as mahasiswa_name, u.nidn_nim,
             p1.name as pembimbing_1_name, p2.name as pembimbing_2_name
      FROM skripsi s
      JOIN users u ON s.mahasiswa_id = u.id
      LEFT JOIN users p1 ON s.pembimbing_1_id = p1.id
      LEFT JOIN users p2 ON s.pembimbing_2_id = p2.id
      ORDER BY s.created_at DESC
    `;
    const data = await all(sql);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching skripsi' });
  }
});

// GET my skripsi (mahasiswa)
router.get('/skripsi/me', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const sql = `
      SELECT s.*, p1.name as pembimbing_1_name, p2.name as pembimbing_2_name
      FROM skripsi s
      LEFT JOIN users p1 ON s.pembimbing_1_id = p1.id
      LEFT JOIN users p2 ON s.pembimbing_2_id = p2.id
      WHERE s.mahasiswa_id = ?
    `;
    const data = await get(sql, [req.user.id]);
    res.json(data || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching my skripsi' });
  }
});

// POST submit judul skripsi (mahasiswa)
router.post('/skripsi/submit', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const { title_1, title_2, title_3 } = req.body;
    
    // Check if already submitted
    const existing = await get('SELECT id FROM skripsi WHERE mahasiswa_id = ?', [req.user.id]);
    if (existing) return res.status(400).json({ error: 'Anda sudah mengajukan Skripsi.' });

    await run(
      'INSERT INTO skripsi (mahasiswa_id, title_1, title_2, title_3) VALUES (?, ?, ?, ?)',
      [req.user.id, title_1, title_2 || '', title_3 || '']
    );
    res.json({ message: 'Pengajuan skripsi berhasil' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengajukan skripsi' });
  }
});

// PUT review skripsi (admin)
router.put('/skripsi/:id/review', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_title, pembimbing_1_id, pembimbing_2_id } = req.body;
    await run(
      'UPDATE skripsi SET status = ?, approved_title = ?, pembimbing_1_id = ?, pembimbing_2_id = ? WHERE id = ?',
      [status, approved_title, pembimbing_1_id || null, pembimbing_2_id || null, id]
    );
    res.json({ message: 'Review skripsi berhasil disimpan' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal review skripsi' });
  }
});

// GET bimbingan schedules (dosen)
router.get('/skripsi/bimbingan', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const sql = `
      SELECT s.*, u.name as mahasiswa_name, u.nidn_nim
      FROM skripsi s
      JOIN users u ON s.mahasiswa_id = u.id
      WHERE (s.pembimbing_1_id = ? OR s.pembimbing_2_id = ?) AND s.status != 'Pending'
    `;
    const data = await all(sql, [req.user.id, req.user.id]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching bimbingan' });
  }
});

// GET logbooks
router.get('/skripsi/:id/logbooks', [verifyToken], async (req, res) => {
  try {
    const data = await all('SELECT * FROM skripsi_logbooks WHERE skripsi_id = ? ORDER BY id DESC', [req.params.id]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching logbooks' });
  }
});

// POST add logbook (mahasiswa)
router.post('/skripsi/:id/logbooks', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const { date, activity, note } = req.body;
    await run(
      'INSERT INTO skripsi_logbooks (skripsi_id, date, activity, note) VALUES (?, ?, ?, ?)',
      [req.params.id, date, activity, note]
    );
    res.json({ message: 'Logbook berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal tambah logbook' });
  }
});

// PUT validate logbook (dosen)
router.put('/skripsi/logbooks/:logbookId', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { status_validation } = req.body;
    await run('UPDATE skripsi_logbooks SET status_validation = ? WHERE id = ?', [status_validation, req.params.logbookId]);
    res.json({ message: 'Logbook divalidasi' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal validasi logbook' });
  }
});

module.exports = router;
