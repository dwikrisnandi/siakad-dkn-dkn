const express = require('express');
const router = express.Router();
const { get, query } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

const generateCsv = (headers, rows) => {
  const headerStr = headers.join(';');
  const rowStrs = rows.map(row => 
    headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(';')
  );
  return [headerStr, ...rowStrs].join('\n');
};

router.get('/feeder/mahasiswa', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const [data] = await query(`
      SELECT nidn_nim as NIM, name as Nama_Mahasiswa, email as Email,
             (SELECT nama_prodi FROM programs WHERE id = program_id) as Program_Studi,
             gender as Jenis_Kelamin, date_of_birth as Tanggal_Lahir
      FROM users WHERE role = 'mahasiswa'
    `);
    const csv = generateCsv(['NIM', 'Nama_Mahasiswa', 'Email', 'Program_Studi', 'Jenis_Kelamin', 'Tanggal_Lahir'], data);
    res.header('Content-Type', 'text/csv');
    res.attachment('feeder_mahasiswa.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/feeder/krs', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const [data] = await query(`
      SELECT 
        u.nidn_nim as NIM,
        u.name as Nama_Mahasiswa,
        c.code as Kode_MK,
        cl.name as Nama_Kelas,
        ay.name as Tahun_Akademik
      FROM class_enrollments ce
      JOIN users u ON ce.mahasiswa_id = u.id
      JOIN classes cl ON ce.class_id = cl.id
      JOIN schedules s ON cl.id = s.class_id
      JOIN courses c ON s.course_id = c.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
    `);
    const csv = generateCsv(['NIM', 'Nama_Mahasiswa', 'Kode_MK', 'Nama_Kelas', 'Tahun_Akademik'], data);
    res.header('Content-Type', 'text/csv');
    res.attachment('feeder_krs.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/feeder/nilai', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const [data] = await query(`
      SELECT 
        u.nidn_nim as NIM,
        u.name as Nama_Mahasiswa,
        c.code as Kode_MK,
        ay.name as Tahun_Akademik,
        cg.final_score as Nilai_Angka
      FROM course_grades cg
      JOIN users u ON cg.mahasiswa_id = u.id
      JOIN schedules s ON cg.schedule_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
    `);
    const csv = generateCsv(['NIM', 'Nama_Mahasiswa', 'Kode_MK', 'Tahun_Akademik', 'Nilai_Angka'], data);
    res.header('Content-Type', 'text/csv');
    res.attachment('feeder_nilai.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
