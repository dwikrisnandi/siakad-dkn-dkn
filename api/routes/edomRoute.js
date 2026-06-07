const express = require('express');
const router = express.Router();
const { get, query, run } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

// Seed default questions if none exist
const seedQuestions = async () => {
  const count = await get('SELECT COUNT(*) as c FROM edom_questions');
  if (count.c === 0) {
    const qs = [
      ['Dosen datang tepat waktu dan memberikan perkuliahan sesuai jadwal', 'Disiplin'],
      ['Dosen menjelaskan materi dengan jelas dan mudah dipahami', 'Pedagogik'],
      ['Dosen memberikan kesempatan bertanya dan berdiskusi', 'Sosial'],
      ['Dosen menggunakan media pembelajaran yang menarik', 'Pedagogik'],
      ['Dosen bersikap objektif dan transparan dalam memberikan nilai', 'Profesional']
    ];
    for (const q of qs) {
      await run('INSERT INTO edom_questions (question_text, aspect) VALUES (?, ?)', q);
    }
  }
};
seedQuestions();

// GET all questions
router.get('/edom/questions', [verifyToken], async (req, res) => {
  try {
    const [questions] = await query('SELECT * FROM edom_questions ORDER BY id ASC');
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// GET schedules that require EDOM for a student
router.get('/edom/schedules', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const mahasiswaId = req.user.id;
    // Get active academic year
    const activeYear = await get('SELECT id FROM academic_years WHERE is_active = 1');
    if (!activeYear) return res.json({ error: 'Tahun akademik belum aktif' });

    // Get all enrolled classes for this student
    const sql = `
      SELECT s.id as schedule_id, c.name as course_name, c.code as course_code, 
             u.name as dosen_name, cl.name as class_name,
             (SELECT COUNT(*) FROM edom_answers ea WHERE ea.schedule_id = s.id AND ea.mahasiswa_id = ?) as is_filled
      FROM class_enrollments ce
      JOIN classes cl ON ce.class_id = cl.id
      JOIN schedules s ON cl.id = s.class_id
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON s.dosen_id = u.id
      WHERE ce.mahasiswa_id = ? AND s.academic_year_id = ?
    `;
    const [schedules] = await query(sql, [mahasiswaId, mahasiswaId, activeYear.id]);
    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch edom schedules' });
  }
});

// SUBMIT EDOM
router.post('/edom/submit', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const mahasiswaId = req.user.id;
    const { schedule_id, answers, comment } = req.body;
    
    // Check if already filled
    const exists = await get('SELECT id FROM edom_answers WHERE mahasiswa_id = ? AND schedule_id = ?', [mahasiswaId, schedule_id]);
    if (exists) return res.status(400).json({ error: 'EDOM untuk kelas ini sudah diisi' });

    for (const ans of answers) {
      await run(
        'INSERT INTO edom_answers (mahasiswa_id, schedule_id, question_id, score, comment) VALUES (?, ?, ?, ?, ?)',
        [mahasiswaId, schedule_id, ans.question_id, ans.score, comment || '']
      );
    }
    res.json({ message: 'EDOM berhasil disimpan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan EDOM' });
  }
});

// CHECK if student has completed all EDOM for active semester
router.get('/edom/check-completion', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const mahasiswaId = req.user.id;
    const activeYear = await get('SELECT id FROM academic_years WHERE is_active = 1');
    if (!activeYear) return res.json({ completed: true });

    const sql = `
      SELECT s.id as schedule_id,
             (SELECT COUNT(*) FROM edom_answers ea WHERE ea.schedule_id = s.id AND ea.mahasiswa_id = ?) as is_filled
      FROM class_enrollments ce
      JOIN classes cl ON ce.class_id = cl.id
      JOIN schedules s ON cl.id = s.class_id
      WHERE ce.mahasiswa_id = ? AND s.academic_year_id = ?
    `;
    const [schedules] = await query(sql, [mahasiswaId, mahasiswaId, activeYear.id]);
    
    // If any schedule has 0 answers filled, it's not completed
    const notCompleted = schedules.some(s => s.is_filled === 0);
    res.json({ completed: !notCompleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed checking completion' });
  }
});

// DOSEN views summary of EDOM
router.get('/edom/summary/:scheduleId', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // Check if dosen owns schedule
    const schedule = await get('SELECT dosen_id FROM schedules WHERE id = ?', [scheduleId]);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    if (req.user.role === 'dosen' && schedule.dosen_id !== req.user.id) {
      return res.status(403).json({ error: 'Bukan kelas Anda' });
    }

    const sql = `
      SELECT q.id as question_id, q.question_text, q.aspect, 
             AVG(ea.score) as average_score, COUNT(ea.id) as total_responses
      FROM edom_questions q
      LEFT JOIN edom_answers ea ON q.id = ea.question_id AND ea.schedule_id = ?
      GROUP BY q.id
    `;
    const [summary] = await query(sql, [scheduleId]);

    const commentsSql = `SELECT comment FROM edom_answers WHERE schedule_id = ? AND comment != '' GROUP BY comment`;
    const [comments] = await query(commentsSql, [scheduleId]);

    res.json({
      summary,
      comments: comments.map(c => c.comment),
      total_students: summary.length > 0 ? summary[0].total_responses : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
