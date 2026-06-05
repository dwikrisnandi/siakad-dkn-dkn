const express = require('express');
const router = express.Router();
const { query, run } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

// =====================================================
// MAHASISWA KRS ROUTES
// =====================================================

// Cek status aktif, tagihan, dan KRS saat ini
router.get('/krs/status', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const mahasiswaId = req.userId;
    
    // Get active academic year
    const [yearRows] = await query('SELECT * FROM academic_years WHERE is_active = true LIMIT 1');
    if (yearRows.length === 0) return res.status(404).json({ error: 'Tidak ada tahun akademik aktif' });
    const activeYear = yearRows[0];

    // Cek tagihan
    const [invoiceRows] = await query('SELECT * FROM invoices WHERE mahasiswa_id = ? AND academic_year_id = ?', [mahasiswaId, activeYear.id]);
    const isLunas = invoiceRows.length > 0 && invoiceRows[0].status_lunas === 1;

    // Cek existing KRS
    const [krsRows] = await query('SELECT * FROM krs WHERE mahasiswa_id = ? AND academic_year_id = ?', [mahasiswaId, activeYear.id]);
    let krs = krsRows.length > 0 ? krsRows[0] : null;

    let krsItems = [];
    if (krs) {
      const [items] = await query(`
        SELECT ki.id, ki.schedule_id, s.course_id, c.code, c.name, c.sks, c.semester, u.name as dosen_name, s.day, s.time_start, s.time_end
        FROM krs_items ki
        JOIN schedules s ON ki.schedule_id = s.id
        JOIN courses c ON s.course_id = c.id
        JOIN users u ON s.dosen_id = u.id
        WHERE ki.krs_id = ?
      `, [krs.id]);
      krsItems = items;
    }

    // Get mahasiswa program_id and dpa
    const [mhsRows] = await query('SELECT program_id, dpa_id FROM users WHERE id = ?', [mahasiswaId]);
    const mhs = mhsRows[0];

    res.json({
      academic_year: activeYear,
      is_lunas: isLunas,
      krs: krs,
      krs_items: krsItems,
      program_id: mhs.program_id,
      dpa_id: mhs.dpa_id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memuat status KRS' });
  }
});

// Ambil jadwal yang tersedia untuk KRS
router.get('/krs/available-schedules', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const [yearRows] = await query('SELECT id FROM academic_years WHERE is_active = true LIMIT 1');
    if (yearRows.length === 0) return res.json([]);
    const activeYearId = yearRows[0].id;

    const [mhsRows] = await query('SELECT program_id FROM users WHERE id = ?', [req.userId]);
    const programId = mhsRows[0].program_id;

    if (!programId) return res.json([]);

    // Get schedules that match the curriculum of the student's program
    const [schedules] = await query(`
      SELECT s.*, c.name as course_name, c.code as course_code, c.sks, c.semester, u.name as dosen_name
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      JOIN curriculums curr ON c.curriculum_id = curr.id
      JOIN users u ON s.dosen_id = u.id
      WHERE s.academic_year_id = ? AND curr.program_id = ? AND curr.status_aktif = 1
    `, [activeYearId, programId]);

    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memuat jadwal' });
  }
});

// Submit KRS
router.post('/krs/submit', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const { schedule_ids } = req.body;
    const mahasiswaId = req.userId;

    const [yearRows] = await query('SELECT id FROM academic_years WHERE is_active = true LIMIT 1');
    if (yearRows.length === 0) return res.status(400).json({ error: 'Tidak ada tahun akademik aktif' });
    const activeYearId = yearRows[0].id;

    // Cek tagihan lagi untuk keamanan
    const [invoiceRows] = await query('SELECT status_lunas FROM invoices WHERE mahasiswa_id = ? AND academic_year_id = ?', [mahasiswaId, activeYearId]);
    if (invoiceRows.length === 0 || invoiceRows[0].status_lunas !== 1) {
      return res.status(403).json({ error: 'Anda harus melunasi tagihan keuangan terlebih dahulu' });
    }

    // Cek existing KRS
    const [krsRows] = await query('SELECT id, status_approval FROM krs WHERE mahasiswa_id = ? AND academic_year_id = ?', [mahasiswaId, activeYearId]);
    let krsId;
    if (krsRows.length > 0) {
      if (krsRows[0].status_approval === 'Approved') {
        return res.status(400).json({ error: 'KRS sudah disetujui, tidak bisa diubah.' });
      }
      krsId = krsRows[0].id;
      await run('UPDATE krs SET status_approval = ? WHERE id = ?', ['Pending', krsId]);
      await run('DELETE FROM krs_items WHERE krs_id = ?', [krsId]);
    } else {
      const result = await run('INSERT INTO krs (mahasiswa_id, academic_year_id, status_approval) VALUES (?, ?, ?)', [mahasiswaId, activeYearId, 'Pending']);
      krsId = result.id;
    }

    for (const s_id of schedule_ids) {
      await run('INSERT INTO krs_items (krs_id, schedule_id) VALUES (?, ?)', [krsId, s_id]);
    }

    res.json({ message: 'KRS berhasil diajukan ke Dosen PA' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengajukan KRS' });
  }
});


// =====================================================
// DPA (DOSEN PEMBIMBING AKADEMIK) ROUTES
// =====================================================

router.get('/dpa/students', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const dosenId = req.userId;
    
    // Ambil tahun akademik aktif
    const [yearRows] = await query('SELECT id FROM academic_years WHERE is_active = true LIMIT 1');
    const activeYearId = yearRows.length > 0 ? yearRows[0].id : null;

    let sql = `
      SELECT u.id, u.nidn_nim, u.name, p.nama_prodi,
             (SELECT status_approval FROM krs WHERE mahasiswa_id = u.id AND academic_year_id = ?) as krs_status
      FROM users u
      LEFT JOIN programs p ON u.program_id = p.id
      WHERE u.dpa_id = ? AND u.role = 'mahasiswa'
    `;
    const [students] = await query(sql, [activeYearId, dosenId]);
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal memuat daftar mahasiswa wali' });
  }
});

router.get('/dpa/krs/:studentId', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const dosenId = req.userId;

    // Verify anak wali
    const [checkRows] = await query('SELECT id FROM users WHERE id = ? AND dpa_id = ?', [studentId, dosenId]);
    if (checkRows.length === 0) return res.status(403).json({ error: 'Mahasiswa ini bukan anak wali Anda' });

    const [yearRows] = await query('SELECT id FROM academic_years WHERE is_active = true LIMIT 1');
    if (yearRows.length === 0) return res.status(404).json({ error: 'Tahun akademik belum aktif' });
    const activeYearId = yearRows[0].id;

    const [krsRows] = await query('SELECT * FROM krs WHERE mahasiswa_id = ? AND academic_year_id = ?', [studentId, activeYearId]);
    if (krsRows.length === 0) return res.json({ krs: null, items: [] });
    const krs = krsRows[0];

    const [items] = await query(`
      SELECT ki.id, s.id as schedule_id, c.code, c.name, c.sks, c.semester, u.name as dosen_name, s.day, s.time_start, s.time_end
      FROM krs_items ki
      JOIN schedules s ON ki.schedule_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON s.dosen_id = u.id
      WHERE ki.krs_id = ?
    `, [krs.id]);

    res.json({ krs, items });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat KRS mahasiswa' });
  }
});

router.post('/dpa/krs/:krsId/approve', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { action } = req.body; // 'Approved' or 'Rejected'
    const krsId = req.params.krsId;
    
    await run('UPDATE krs SET status_approval = ? WHERE id = ?', [action, krsId]);

    // Jika Approve, copy class_id dari schedules ke class_enrollments
    if (action === 'Approved') {
      const [krsRows] = await query('SELECT mahasiswa_id FROM krs WHERE id = ?', [krsId]);
      const mahasiswaId = krsRows[0].mahasiswa_id;

      const [items] = await query('SELECT schedule_id FROM krs_items WHERE krs_id = ?', [krsId]);
      
      // Ambil daftar class_id dari schedule yang di-approve
      for (const item of items) {
        const [schedRows] = await query('SELECT class_id, class_ids FROM schedules WHERE id = ?', [item.schedule_id]);
        if (schedRows.length > 0) {
          let classIds = [];
          if (schedRows[0].class_ids) {
            try { classIds = JSON.parse(schedRows[0].class_ids); } catch(e){}
          } else if (schedRows[0].class_id) {
            classIds = [schedRows[0].class_id];
          }

          // Masukkan mahasiswa ke kelas tersebut jika belum terdaftar
          for (const cId of classIds) {
            const [cek] = await query('SELECT id FROM class_enrollments WHERE class_id = ? AND mahasiswa_id = ?', [cId, mahasiswaId]);
            if (cek.length === 0) {
              await run('INSERT INTO class_enrollments (class_id, mahasiswa_id) VALUES (?, ?)', [cId, mahasiswaId]);
            }
          }
        }
      }
    }

    res.json({ message: `KRS berhasil di-${action}` });
  } catch (error) {
    res.status(500).json({ error: 'Gagal merubah status KRS' });
  }
});

module.exports = router;
