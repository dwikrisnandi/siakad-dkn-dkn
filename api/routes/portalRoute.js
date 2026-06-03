const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { query, run } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

// =====================================================
// ASSIGNMENTS
// =====================================================
router.get('/assignments/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const [assignments] = await query('SELECT * FROM assignments WHERE schedule_id = ? ORDER BY deadline ASC', [req.params.scheduleId]);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching assignments' });
  }
});

router.post('/assignments', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, title, description, deadline } = req.body;
    const result = await run(
      'INSERT INTO assignments (schedule_id, title, description, deadline) VALUES (?, ?, ?, ?)',
      [schedule_id, title, description, deadline]
    );

    // ── NOTIFY ALL STUDENTS IN CLASS VIA FCM ──
    try {
      const [schedRows] = await query('SELECT class_id, class_ids FROM schedules WHERE id = ?', [schedule_id]);
      if (schedRows.length > 0) {
        let classIds = [];
        if (schedRows[0].class_ids) {
          try { classIds = JSON.parse(schedRows[0].class_ids); } catch (_) {}
        } else if (schedRows[0].class_id) {
          classIds = [schedRows[0].class_id];
        }

        if (classIds.length > 0) {
          const placeholders = classIds.map(() => '?').join(',');
          const [students] = await query(
            `SELECT DISTINCT ce.mahasiswa_id FROM class_enrollments ce WHERE ce.class_id IN (${placeholders})`,
            classIds
          );

          const allTokens = [];
          for (const st of students) {
            const [tokenRows] = await query('SELECT token FROM user_fcm_tokens WHERE user_id = ?', [st.mahasiswa_id]);
            tokenRows.forEach(r => allTokens.push(r.token));
          }

          if (allTokens.length > 0) {
            const { sendMulticastNotification } = require('../utils/fcm');
            await sendMulticastNotification(
              allTokens,
              'Tugas Baru',
              `Dosen memberikan tugas baru: "${title}"`,
              { type: 'NEW_ASSIGNMENT', schedule_id: schedule_id.toString() }
            );
          }
        }
      }
    } catch (notifErr) {
      console.warn('Non-fatal: failed to notify students on new assignment:', notifErr.message);
    }

    res.status(201).json({ message: 'Assignment created', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed creating assignment' });
  }
});

router.put('/assignments/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    await run(
      'UPDATE assignments SET title = ?, description = ?, deadline = ? WHERE id = ?',
      [title, description, deadline, req.params.id]
    );
    res.json({ message: 'Assignment updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed updating assignment' });
  }
});

router.delete('/assignments/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    await run('DELETE FROM submissions WHERE assignment_id = ?', [req.params.id]);
    await run('DELETE FROM assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting assignment' });
  }
});

// =====================================================
// SUBMISSIONS
// =====================================================
router.post('/submissions', [verifyToken], async (req, res) => {
  try {
    const { assignment_id, file_url, file_data } = req.body;
    const mahasiswa_id = req.userId;

    let processedFileData = file_data;
    if (processedFileData) {
      const base64Regex = /<img[^>]+src=["'](data:image\/([a-zA-Z0-9]+);base64,([^"']+))["'][^>]*>/gi;
      let match;
      while ((match = base64Regex.exec(processedFileData)) !== null) {
        const fullImgTag = match[0];
        const fullDataUrl = match[1];
        const ext = match[2] === 'jpeg' ? 'jpg' : match[2];
        const base64Data = match[3];

        try {
          const buffer = Buffer.from(base64Data, 'base64');
          const filename = `img_pasted_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
          const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'submissions');
          if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
          const newImgTag = fullImgTag.replace(fullDataUrl, `/uploads/submissions/${filename}`);
          processedFileData = processedFileData.replace(fullImgTag, newImgTag);
        } catch (err) {
          console.error('Error extracting base64 image during submission:', err);
        }
      }
    }

    await run('DELETE FROM submissions WHERE assignment_id = ? AND mahasiswa_id = ?', [assignment_id, mahasiswa_id]);
    const result = await run(
      'INSERT INTO submissions (assignment_id, mahasiswa_id, file_url, file_data) VALUES (?, ?, ?, ?)',
      [assignment_id, mahasiswa_id, file_url || null, processedFileData || null]
    );

    // ── NOTIFY DOSEN VIA FCM ──
    try {
      const [dosenRows] = await query(`
        SELECT s.dosen_id, u_mhs.name as student_name, a.title as assignment_title
        FROM assignments a
        JOIN schedules s ON a.schedule_id = s.id
        JOIN users u_mhs ON u_mhs.id = ?
        WHERE a.id = ?
      `, [mahasiswa_id, assignment_id]);

      if (dosenRows.length > 0) {
        const { dosen_id, student_name, assignment_title } = dosenRows[0];
        
        const [tokenRows] = await query('SELECT token FROM user_fcm_tokens WHERE user_id = ?', [dosen_id]);
        const tokens = tokenRows.map(r => r.token);

        if (tokens.length > 0) {
          const { sendMulticastNotification } = require('../utils/fcm');
          await sendMulticastNotification(
            tokens,
            'Tugas Baru Dikumpulkan',
            `${student_name} telah mengumpulkan tugas: "${assignment_title}"`,
            { type: 'SUBMISSION_RECEIVED', assignment_id: assignment_id.toString() }
          );
        }
      }
    } catch (notifErr) {
      console.warn('Non-fatal: failed to notify dosen on submission:', notifErr.message);
    }

    res.status(201).json({ message: 'Tugas berhasil dikumpulkan', id: result.id });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Gagal mengumpulkan tugas' });
  }
});

router.get('/submissions/:assignmentId', [verifyToken], async (req, res) => {
  try {
    const [subs] = await query(
      `SELECT s.*, u.name as mahasiswa_name, u.nidn_nim as mahasiswa_nim 
       FROM submissions s JOIN users u ON s.mahasiswa_id = u.id
       WHERE s.assignment_id = ?`,
      [parseInt(req.params.assignmentId)]
    );
    res.json(subs);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching submissions' });
  }
});

router.delete('/submissions/:assignmentId', [verifyToken], async (req, res) => {
  try {
    const mahasiswa_id = req.userId;
    const assignment_id = parseInt(req.params.assignmentId);
    await run('DELETE FROM submissions WHERE assignment_id = ? AND mahasiswa_id = ?', [assignment_id, mahasiswa_id]);
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

router.put('/submissions/:id/nilai', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    const { nilai } = req.body;
    const subId = req.params.id;

    await run('UPDATE submissions SET nilai = ? WHERE id = ?', [nilai, subId]);

    // ── SEND NOTIFICATION UPON SAVING GRADE ──
    try {
      const [subRows] = await query(`
        SELECT u.nidn_nim, u.fcm_token, a.title as assignment_title 
        FROM submissions s 
        JOIN users u ON s.mahasiswa_id = u.id 
        JOIN assignments a ON s.assignment_id = a.id 
        WHERE s.id = ?
      `, [subId]);

      if (subRows.length > 0) {
        const { nidn_nim, fcm_token, assignment_title } = subRows[0];
        
        // Update/Create JSON Notification
        const NOTIF_DIR = path.join(__dirname, '..', 'notifications');
        if (!fs.existsSync(NOTIF_DIR)) fs.mkdirSync(NOTIF_DIR, { recursive: true });
        
        const filePath = path.join(NOTIF_DIR, `${nidn_nim}.json`);
        let notifications = [];
        if (fs.existsSync(filePath)) {
          try { notifications = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (_) {}
        }

        // Check if there's an existing notification for this assignment to update, or add new
        const existingIdx = notifications.findIndex(n => n.assignment_title === assignment_title && !n.dismissed_at);
        if (existingIdx !== -1) {
          notifications[existingIdx].skor = nilai;
        } else {
          notifications.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            assignment_title: assignment_title,
            skor: nilai,
            feedback: 'Nilai telah diberikan oleh dosen.',
            created_at: new Date().toISOString(),
            dismissed_at: null
          });
        }
        fs.writeFileSync(filePath, JSON.stringify(notifications, null, 2), 'utf-8');

        // Send Push Notification
        const [tokenRows] = await query('SELECT token FROM user_fcm_tokens WHERE user_id = ?', [mahasiswa_id]);
        const tokens = tokenRows.map(r => r.token);

        if (tokens.length > 0) {
          const { sendMulticastNotification } = require('../utils/fcm');
          await sendMulticastNotification(
            tokens,
            'Nilai Tugas Tersedia',
            `Nilai untuk "${assignment_title}" telah diberikan: ${nilai}`,
            { type: 'GRADE_SAVED', assignment_title }
          );
        }
      }
    } catch (notifErr) {
      console.warn('Non-fatal: failed to trigger notification on grade save:', notifErr.message);
    }

    res.json({ message: 'Nilai berhasil disimpan dan notifikasi dikirim' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menyimpan nilai' });
  }
});

router.post('/submissions/:id/ai-feedback', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { feedback, skor } = req.body;
    const subId = req.params.id;

    const [subRows] = await query(`
      SELECT u.nidn_nim, a.title as assignment_title 
      FROM submissions s 
      JOIN users u ON s.mahasiswa_id = u.id 
      JOIN assignments a ON s.assignment_id = a.id 
      WHERE s.id = ?
    `, [subId]);

    if (subRows.length === 0) return res.status(404).json({ error: 'Submission not found' });
    const { nidn_nim, assignment_title } = subRows[0];

    const NOTIF_DIR = path.join(__dirname, '..', 'notifications');
    if (!fs.existsSync(NOTIF_DIR)) fs.mkdirSync(NOTIF_DIR, { recursive: true });

    const filePath = path.join(NOTIF_DIR, `${nidn_nim}.json`);
    let notifications = [];
    if (fs.existsSync(filePath)) {
      try { notifications = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (_) {}
    }

    // Update existing notification for this assignment or add new
    const existingIdx = notifications.findIndex(n => n.assignment_title === assignment_title && !n.dismissed_at);
    if (existingIdx !== -1) {
      notifications[existingIdx].feedback = feedback;
      if (skor) notifications[existingIdx].skor = skor;
    } else {
      notifications.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        assignment_title: assignment_title,
        skor: skor || 0,
        feedback: feedback,
        created_at: new Date().toISOString(),
        dismissed_at: null
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(notifications, null, 2), 'utf-8');
    res.json({ message: 'Feedback AI berhasil disimpan ke dashboard mahasiswa' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal menyimpan feedback AI' });
  }
});

// =====================================================
// GRADES
// =====================================================
router.get('/grades/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId);
    const [schedRows] = await query('SELECT class_id, class_ids FROM schedules WHERE id = ?', [scheduleId]);
    if (schedRows.length === 0) return res.status(404).json({ error: 'Schedule not found' });

    let targetClassIds = [];
    if (schedRows[0].class_ids) {
      try { targetClassIds = JSON.parse(schedRows[0].class_ids); } catch (e) { }
    } else if (schedRows[0].class_id) {
      targetClassIds = [schedRows[0].class_id];
    }
    if (targetClassIds.length === 0) return res.json([]);

    const placeholders = targetClassIds.map(() => '?').join(',');
    const [students] = await query(`
      SELECT u.id as mahasiswa_id, u.nidn_nim as mahasiswa_nim, u.name as mahasiswa_name 
      FROM class_enrollments ce 
      JOIN users u ON ce.mahasiswa_id = u.id 
      WHERE ce.class_id IN (${placeholders})
    `, targetClassIds);

    const [attRows] = await query('SELECT COUNT(DISTINCT meeting_number) as total_meetings FROM attendance WHERE schedule_id = ?', [scheduleId]);
    const totalMeetings = attRows[0].total_meetings || 0;

    // Total tugas yang diberikan untuk jadwal ini (sebagai pembagi nilai tugas)
    const [totalAssignmentRows] = await query('SELECT COUNT(*) as total FROM assignments WHERE schedule_id = ?', [scheduleId]);
    const totalAssignments = totalAssignmentRows[0]?.total || 0;

    const result = [];
    for (const st of students) {
      const mhsId = st.mahasiswa_id;
      let kehadiran = 0;
      if (totalMeetings > 0) {
        const [presentRows] = await query('SELECT COUNT(*) as present FROM attendance WHERE schedule_id = ? AND mahasiswa_id = ? AND status = ?', [scheduleId, mhsId, 'Hadir']);
        kehadiran = Math.round((presentRows[0].present / totalMeetings) * 100);
      }

      // Nilai tugas = jumlah semua nilai / jumlah tugas yang diberikan
      // (tugas yang belum dikumpulkan / belum dinilai dihitung 0)
      let avgTugas = 0;
      const [tugasRows] = await query(
        `SELECT s.nilai FROM submissions s JOIN assignments a ON s.assignment_id = a.id WHERE a.schedule_id = ? AND s.mahasiswa_id = ? AND s.nilai IS NOT NULL`,
        [scheduleId, mhsId]
      );
      if (totalAssignments > 0) {
        const sumNilai = tugasRows.reduce((acc, r) => acc + parseFloat(r.nilai), 0);
        avgTugas = Math.round(sumNilai / totalAssignments);
      }

      let uts = 0, uas = 0;
      const [gradeRows] = await query('SELECT nilai_uts, nilai_uas FROM course_grades WHERE schedule_id = ? AND mahasiswa_id = ?', [scheduleId, mhsId]);
      if (gradeRows.length > 0) { uts = gradeRows[0].nilai_uts; uas = gradeRows[0].nilai_uas; }

      result.push({
        mahasiswa_id: mhsId,
        mahasiswa_nim: st.mahasiswa_nim,
        mahasiswa_name: st.mahasiswa_name,
        kehadiran,
        tugas: avgTugas,
        uts,
        uas,
        final_score: Math.round((kehadiran * 0.1) + (avgTugas * 0.2) + (uts * 0.3) + (uas * 0.4))
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching grades' });
  }
});

router.put('/grades/:scheduleId', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId);
    const { grades } = req.body;
    for (const [mhsId, data] of Object.entries(grades)) {
      await run('DELETE FROM course_grades WHERE schedule_id = ? AND mahasiswa_id = ?', [scheduleId, mhsId]);
      await run('INSERT INTO course_grades (schedule_id, mahasiswa_id, nilai_uts, nilai_uas) VALUES (?, ?, ?, ?)', [scheduleId, mhsId, data.uts || 0, data.uas || 0]);
    }
    res.json({ message: 'Grades saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed saving grades' });
  }
});

// =====================================================
// ATTENDANCE
// =====================================================
router.get('/attendance/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const meeting_number = req.query.meeting_number;
    let queryStr = 'SELECT * FROM attendance WHERE schedule_id = ?';
    const params = [req.params.scheduleId];
    if (meeting_number) { queryStr += ' AND meeting_number = ?'; params.push(parseInt(meeting_number)); }
    const [records] = await query(queryStr, params);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching attendance records' });
  }
});

router.post('/attendance', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, mahasiswa_id, meeting_number, status, date } = req.body;
    await run('DELETE FROM attendance WHERE schedule_id = ? AND mahasiswa_id = ? AND meeting_number = ?', [schedule_id, mahasiswa_id, meeting_number]);
    const result = await run('INSERT INTO attendance (schedule_id, mahasiswa_id, meeting_number, status, date) VALUES (?, ?, ?, ?, ?)', [schedule_id, mahasiswa_id, meeting_number, status, date]);
    res.status(201).json({ message: 'Attendance recorded', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed recording attendance' });
  }
});

router.get('/attendance-note/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const { meeting_number } = req.query;
    if (!meeting_number) return res.status(400).json({ error: 'meeting_number required' });
    const [notes] = await query('SELECT note FROM attendance_notes WHERE schedule_id = ? AND meeting_number = ?', [req.params.scheduleId, meeting_number]);
    res.json(notes.length > 0 ? notes[0] : { note: '' });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

router.post('/attendance-note', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, meeting_number, note } = req.body;
    await run('DELETE FROM attendance_notes WHERE schedule_id = ? AND meeting_number = ?', [schedule_id, meeting_number]);
    const result = await run('INSERT INTO attendance_notes (schedule_id, meeting_number, note) VALUES (?, ?, ?)', [schedule_id, meeting_number, note || '']);
    res.status(201).json({ message: 'Note saved', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed saving note' });
  }
});

// =====================================================
// NOTIFICATIONS
// =====================================================
router.get('/notifications', [verifyToken], async (req, res) => {
  try {
    if (req.userRole === 'mahasiswa') {
      const [notifs] = await query(`
        SELECT a.id, a.schedule_id, a.title, a.deadline, c.name as course_name 
        FROM assignments a
        JOIN schedules s ON a.schedule_id = s.id
        JOIN courses c ON s.course_id = c.id
        JOIN class_enrollments ce ON s.class_id = ce.class_id OR s.class_ids LIKE '%"' || ce.class_id::text || '"%' OR s.class_ids LIKE '%[' || ce.class_id::text || ']%' OR s.class_ids LIKE '%,' || ce.class_id::text || ']%' OR s.class_ids LIKE '%[' || ce.class_id::text || ',%' OR s.class_ids LIKE '%,' || ce.class_id::text || ',%'
        WHERE ce.mahasiswa_id = ?
          AND CAST(a.deadline AS timestamp) > CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta'
          AND a.id NOT IN (SELECT assignment_id FROM submissions WHERE mahasiswa_id = ?)
        ORDER BY a.deadline ASC LIMIT 5
      `, [req.userId, req.userId]);

      const countRes = await query(`
        SELECT COUNT(*) as cnt FROM assignments a
        JOIN schedules s ON a.schedule_id = s.id
        JOIN class_enrollments ce ON s.class_id = ce.class_id OR s.class_ids LIKE '%"' || ce.class_id::text || '"%' OR s.class_ids LIKE '%[' || ce.class_id::text || ']%' OR s.class_ids LIKE '%,' || ce.class_id::text || ']%' OR s.class_ids LIKE '%[' || ce.class_id::text || ',%' OR s.class_ids LIKE '%,' || ce.class_id::text || ',%'
        WHERE ce.mahasiswa_id = ?
          AND CAST(a.deadline AS timestamp) > CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta'
          AND a.id NOT IN (SELECT assignment_id FROM submissions WHERE mahasiswa_id = ?)
      `, [req.userId, req.userId]);

      return res.json({ count: countRes[0][0].cnt, items: notifs });
    } else if (req.userRole === 'dosen') {
      const [notifs] = await query(`
        SELECT sub.id, sub.assignment_id, sub.submitted_at, u.name as mahasiswa_name, a.title, c.name as course_name, s.id as schedule_id
        FROM submissions sub
        JOIN assignments a ON sub.assignment_id = a.id
        JOIN schedules s ON a.schedule_id = s.id
        JOIN courses c ON s.course_id = c.id
        JOIN users u ON sub.mahasiswa_id = u.id
        WHERE s.dosen_id = ? AND sub.nilai IS NULL
        ORDER BY sub.submitted_at DESC LIMIT 5
      `, [req.userId]);

      const countRes = await query(`
        SELECT COUNT(*) as cnt FROM submissions sub
        JOIN assignments a ON sub.assignment_id = a.id
        JOIN schedules s ON a.schedule_id = s.id
        WHERE s.dosen_id = ?
          AND CAST(sub.submitted_at AS timestamp) > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta' - INTERVAL '7 days')
          AND sub.nilai IS NULL
      `, [req.userId]);

      return res.json({ count: countRes[0][0].cnt, items: notifs });
    } else {
      return res.json({ count: 0, items: [] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed getting notifications' });
  }
});

// =====================================================
// AI GRADE NOTIFICATIONS (JSON file-based, per NIM)
// =====================================================
router.get('/ai-notifications', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const [userRows] = await query('SELECT nidn_nim FROM users WHERE id = ?', [req.userId]);
    if (userRows.length === 0) return res.json([]);
    const nim = userRows[0].nidn_nim;

    const filePath = path.join(__dirname, '..', 'notifications', `${nim}.json`);
    if (!fs.existsSync(filePath)) return res.json([]);

    let notifications = [];
    try { notifications = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (_) { return res.json([]); }

    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    // Auto-cleanup: remove entries dismissed more than 7 days ago
    const cleaned = notifications.filter(n => {
      if (n.dismissed_at && (now - new Date(n.dismissed_at).getTime()) > SEVEN_DAYS) return false;
      return true;
    });

    // Save cleaned version if something was removed
    if (cleaned.length !== notifications.length) {
      fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf-8');
    }

    // Return only non-dismissed notifications to the student
    const active = cleaned.filter(n => !n.dismissed_at);
    res.json(active);
  } catch (error) {
    console.error('AI Notifications error:', error);
    res.status(500).json({ error: 'Gagal memuat notifikasi AI.' });
  }
});

router.put('/ai-notifications/:id/dismiss', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const [userRows] = await query('SELECT nidn_nim FROM users WHERE id = ?', [req.userId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan.' });
    const nim = userRows[0].nidn_nim;

    const filePath = path.join(__dirname, '..', 'notifications', `${nim}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Notifikasi tidak ditemukan.' });

    let notifications = [];
    try { notifications = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (_) { return res.status(404).json({ error: 'File rusak.' }); }

    const targetId = req.params.id;
    const idx = notifications.findIndex(n => n.id === targetId);
    if (idx === -1) return res.status(404).json({ error: 'Notifikasi tidak ditemukan.' });

    notifications[idx].dismissed_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(notifications, null, 2), 'utf-8');

    res.json({ message: 'Notifikasi akan dihapus dalam 7 hari.' });
  } catch (error) {
    console.error('Dismiss notification error:', error);
    res.status(500).json({ error: 'Gagal menghapus notifikasi.' });
  }
});

module.exports = router;
