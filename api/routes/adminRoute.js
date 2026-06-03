const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');
const { query, run } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

router.get('/backup', [verifyToken, verifyRole(['admin'])], (req, res) => {
  const tempFile = path.join(__dirname, '..', `backup_tmp_${Date.now()}.sql`);
  const cmd = `"C:\\Program Files\\SIAKAD\\pgsql\\bin\\pg_dump.exe" -p 8256 -U postgres -d siakad -f "${tempFile}"`;
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup execution error: ${error}`);
      return res.status(500).json({ error: 'Failed to generate backup.' });
    }
    
    res.download(tempFile, 'backup.sql', (err) => {
      fs.unlink(tempFile, () => {});
    });
  });
});

router.get('/khs/:mahasiswaId', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const mhsId = req.params.mahasiswaId;
    
    // Get all enrollments for this student
    const [enrolls] = await query('SELECT class_id FROM class_enrollments WHERE mahasiswa_id = ?', [mhsId]);
    if (enrolls.length === 0) return res.json([]);
    const classIds = enrolls.map(e => e.class_id);
    
    // Get all schedules
    const [schedules] = await query(`
      SELECT s.id as schedule_id, c.code, c.name as course_name, c.sks, c.semester, u.name as dosen_name, cl.name as class_name, s.class_ids, s.class_id as single_class_id
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON s.dosen_id = u.id
      LEFT JOIN classes cl ON s.class_id = cl.id
    `);

    const mySchedules = schedules.filter(s => {
      let targetClassIds = [];
      if (s.class_ids) {
        try { targetClassIds = JSON.parse(s.class_ids); } catch(e){}
      } else if (s.single_class_id) {
        targetClassIds = [s.single_class_id];
      }
      return classIds.some(cId => targetClassIds.includes(parseInt(cId)));
    });

    const result = [];
    
    for (const s of mySchedules) {
      const scheduleId = s.schedule_id;
      
      const [attRows] = await query('SELECT COUNT(DISTINCT meeting_number) as total_meetings FROM attendance WHERE schedule_id = ?', [scheduleId]);
      const totalMeetings = attRows[0].total_meetings || 0;
      
      let kehadiran = 0;
      if (totalMeetings > 0) {
        const [presentRows] = await query('SELECT COUNT(*) as present FROM attendance WHERE schedule_id = ? AND mahasiswa_id = ? AND status = ?', [scheduleId, mhsId, 'Hadir']);
        kehadiran = Math.round((presentRows[0].present / totalMeetings) * 100);
      }
      
      let avgTugas = 0;
      const [tugasRows] = await query(`
        SELECT s.nilai 
        FROM submissions s 
        JOIN assignments a ON s.assignment_id = a.id 
        WHERE a.schedule_id = ? AND s.mahasiswa_id = ? AND s.nilai IS NOT NULL
      `, [scheduleId, mhsId]);
      if (tugasRows.length > 0) {
        const sum = tugasRows.reduce((a, b) => a + b.nilai, 0);
        avgTugas = Math.round(sum / tugasRows.length);
      }
      
      let uts = 0, uas = 0;
      const [gradeRows] = await query('SELECT nilai_uts, nilai_uas FROM course_grades WHERE schedule_id = ? AND mahasiswa_id = ?', [scheduleId, mhsId]);
      if (gradeRows.length > 0) {
        uts = gradeRows[0].nilai_uts;
        uas = gradeRows[0].nilai_uas;
      }
      
      const finalScore = Math.round((kehadiran * 0.1) + (avgTugas * 0.2) + (uts * 0.3) + (uas * 0.4));
      
      result.push({
        course_code: s.code,
        course_name: s.course_name,
        sks: s.sks,
        semester: s.semester,
        dosen_name: s.dosen_name,
        kehadiran,
        tugas: avgTugas,
        uts,
        uas,
        final_score: finalScore
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('KHS fetch error:', error);
    res.status(500).json({ error: 'Failed fetching KHS' });
  }
});

router.get('/users', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  const { role } = req.query; // 'dosen' or 'mahasiswa'
  let sql = 'SELECT id, nidn_nim, name, role, created_at FROM users';
  const params = [];

  if (role === 'mahasiswa') {
    sql = `
      SELECT u.id, u.nidn_nim, u.name, u.role, u.created_at, 
             ce.class_id, c.name as class_name 
      FROM users u 
      LEFT JOIN class_enrollments ce ON u.id = ce.mahasiswa_id
      LEFT JOIN classes c ON ce.class_id = c.id
      WHERE u.role = 'mahasiswa'
    `;
  } else if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }

  try {
    const [users] = await query(sql, params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching users' });
  }
});

router.post('/users', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { nidn_nim, name, role, password } = req.body;
    // Basic validation
    if (!nidn_nim || !name || !role || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (nidn_nim, name, role, password) VALUES (?, ?, ?, ?)',
      [nidn_nim, name, role, hashedPassword]
    );
    res.status(201).json({ message: 'User created successfully', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed creating user' });
  }
});

router.put('/users/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { nidn_nim, name, password } = req.body;
    let sql = 'UPDATE users SET nidn_nim = ?, name = ?';
    const params = [nidn_nim, name];

    if (password) {
      sql += ', password = ?';
      const hashedPassword = await bcrypt.hash(password, 10);
      params.push(hashedPassword);
    }

    sql += ' WHERE id = ?';
    params.push(req.params.id);

    await run(sql, params);

    const { role, class_id } = req.body;
    if (role === 'mahasiswa') {
      await run('DELETE FROM class_enrollments WHERE mahasiswa_id = ?', [req.params.id]);
      if (class_id) {
        await run('INSERT INTO class_enrollments (class_id, mahasiswa_id) VALUES (?, ?)', [class_id, req.params.id]);
      }
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed updating user' });
  }
});

router.delete('/users/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting user' });
  }
});

// =====================================================
// FCM TOKEN MANAGEMENT
// =====================================================
router.get('/fcm-tokens', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const [tokens] = await query(`
      SELECT t.id, t.user_id, t.token, t.last_used_at, 
             u.name, u.nidn_nim, u.role
      FROM user_fcm_tokens t
      JOIN users u ON t.user_id = u.id
      ORDER BY u.role, u.name, t.last_used_at DESC
    `);
    res.json(tokens);
  } catch (error) {
    console.error('FCM tokens fetch error:', error);
    res.status(500).json({ error: 'Failed fetching FCM tokens' });
  }
});

router.delete('/fcm-tokens/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM user_fcm_tokens WHERE id = ?', [req.params.id]);
    res.json({ message: 'Token deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting token' });
  }
});

// =====================================================
// ACADEMIC YEARS MANAGEMENT
// =====================================================
router.get('/academic-years', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const [years] = await query('SELECT * FROM academic_years ORDER BY id DESC');
    res.json(years);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching academic years' });
  }
});

router.post('/academic-years', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { name } = req.body;
    const result = await run('INSERT INTO academic_years (name, is_active) VALUES (?, false)', [name]);
    res.status(201).json({ message: 'Tahun Akademik dibuat', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat Tahun Akademik' });
  }
});

router.put('/academic-years/:id/activate', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('UPDATE academic_years SET is_active = false');
    await run('UPDATE academic_years SET is_active = true WHERE id = ?', [req.params.id]);
    res.json({ message: 'Tahun Akademik diaktifkan' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengaktifkan Tahun Akademik' });
  }
});

router.delete('/academic-years/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    // Check if it's the active one
    const [year] = await query('SELECT is_active FROM academic_years WHERE id = ?', [req.params.id]);
    if (year.length > 0 && year[0].is_active) {
      return res.status(400).json({ error: 'Tidak dapat menghapus Tahun Akademik yang sedang aktif' });
    }
    
    await run('DELETE FROM academic_years WHERE id = ?', [req.params.id]);
    res.json({ message: 'Tahun Akademik dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus Tahun Akademik (Mungkin sudah ada jadwal yang terkait)' });
  }
});

module.exports = router;
