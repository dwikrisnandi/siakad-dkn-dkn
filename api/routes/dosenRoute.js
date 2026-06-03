const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { query, run } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

router.get('/schedules', [verifyToken], async (req, res) => {
  try {
    const [activeYearRows] = await query('SELECT id FROM academic_years WHERE is_active = true LIMIT 1');
    const activeYearId = activeYearRows.length > 0 ? activeYearRows[0].id : null;

    if (!activeYearId) {
      return res.json([]);
    }

    const [schedules] = await query(`
      SELECT s.*, c.name as course_name, c.code as course_code, cl.name as single_class_name, u.name as dosen_name
      FROM schedules s
      LEFT JOIN classes cl ON s.class_id = cl.id
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON s.dosen_id = u.id
      WHERE s.academic_year_id = ?
    `, [activeYearId]);

    const [allClasses] = await query('SELECT * FROM classes');
    const classMap = {};
    allClasses.forEach(c => classMap[c.id] = c.name);

    const formattedSchedules = schedules.map(s => {
      let parsedIds = [];
      let classNames = [];
      if (s.class_ids) {
        try { parsedIds = JSON.parse(s.class_ids); } catch (e) { }
        classNames = parsedIds.map(id => classMap[id]).filter(Boolean);
      } else if (s.class_id) {
        parsedIds = [s.class_id];
        classNames = [s.single_class_name];
      }
      return {
        ...s,
        class_ids_array: parsedIds,
        class_name: classNames.join(', ')
      };
    });

    let finalSchedules = formattedSchedules;

    if (req.userRole === 'mahasiswa') {
      const [enrolls] = await query('SELECT class_id FROM class_enrollments WHERE mahasiswa_id = ?', [req.userId]);
      const enrolledClassIds = enrolls.map(e => e.class_id);

      finalSchedules = formattedSchedules.filter(s =>
        s.class_ids_array.some(id => enrolledClassIds.includes(parseInt(id)))
      );
    }

    res.json(finalSchedules);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching schedules', details: error.message });
  }
});

router.post('/schedules', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { class_ids, course_id, dosen_id, day, time_start, time_end, room } = req.body;
    const newClassIds = class_ids || (req.body.class_id ? [parseInt(req.body.class_id)] : []);
    
    const [activeYearRows] = await query('SELECT id FROM academic_years WHERE is_active = true LIMIT 1');
    const activeYearId = activeYearRows.length > 0 ? activeYearRows[0].id : null;
    if (!activeYearId) return res.status(400).json({ error: 'Tidak ada Tahun Akademik yang aktif' });

    const result = await run(
      'INSERT INTO schedules (class_id, class_ids, course_id, dosen_id, day, time_start, time_end, room, academic_year_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newClassIds[0] || null, JSON.stringify(newClassIds), course_id, dosen_id, day, time_start, time_end, room, activeYearId]
    );
    res.status(201).json({ message: 'Schedule created', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed creating schedule' });
  }
});

router.put('/schedules/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { class_ids, course_id, dosen_id, day, time_start, time_end, room } = req.body;
    const newClassIds = class_ids || (req.body.class_id ? [parseInt(req.body.class_id)] : []);

    await run(
      'UPDATE schedules SET class_id = ?, class_ids = ?, course_id = ?, dosen_id = ?, day = ?, time_start = ?, time_end = ?, room = ? WHERE id = ?',
      [newClassIds[0] || null, JSON.stringify(newClassIds), course_id, dosen_id, day, time_start, time_end, room, req.params.id]
    );
    res.json({ message: 'Schedule updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed updating schedule' });
  }
});

router.delete('/schedules/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting schedule' });
  }
});

router.get('/rps/:courseId', [verifyToken], async (req, res) => {
  try {
    const [rpsList] = await query('SELECT id, course_id, title, file_url, uploaded_at FROM rps WHERE course_id = ? ORDER BY uploaded_at DESC', [req.params.courseId]);
    res.json(rpsList);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching rps' });
  }
});

router.post('/rps', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { course_id, title, file_url, file_data } = req.body;
    let finalFileUrl = file_url;

    if (file_data && file_data.includes('base64,')) {
      const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'rps');
      if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

      const [header, base64Data] = file_data.split(',');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `rps_${course_id}_${Date.now()}.pdf`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
      finalFileUrl = `/uploads/rps/${filename}`;
    }

    await run('INSERT INTO rps (course_id, title, file_url, file_data) VALUES (?, ?, ?, NULL)', [course_id, title, finalFileUrl]);
    res.json({ message: 'RPS berhasil disimpan' });
  } catch (error) {
    console.error('RPS upload err:', error);
    res.status(500).json({ error: 'Gagal upload RPS' });
  }
});

router.delete('/rps/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    // Optionally delete the physical file before removing from DB
    const rps = await query('SELECT file_url FROM rps WHERE id = ?', [req.params.id]);
    if (rps[0] && rps[0].length > 0 && rps[0][0].file_url) {
      const url = rps[0][0].file_url;
      if (url.startsWith('/uploads/rps/')) {
         const filePath = path.join(__dirname, '..', url);
         if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    
    await run('DELETE FROM rps WHERE id = ?', [req.params.id]);
    res.json({ message: 'RPS dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus RPS' });
  }
});

router.get('/materials/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const [materials] = await query('SELECT * FROM materials WHERE schedule_id = ? ORDER BY id DESC', [req.params.scheduleId]);
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching materials' });
  }
});

router.post('/materials', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, title, description, file_url, content_type, content } = req.body;
    await run(
      'INSERT INTO materials (schedule_id, title, description, file_url, content_type, content) VALUES (?, ?, ?, ?, ?, ?)',
      [schedule_id, title, description, file_url || null, content_type || 'link', content || null]
    );
    res.status(201).json({ message: 'Material added' });
  } catch (error) {
    console.error('Material add error:', error);
    res.status(500).json({ error: 'Failed adding material' });
  }
});

router.put('/materials/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { title, description, file_url, content_type, content } = req.body;
    await run(
      'UPDATE materials SET title=?, description=?, file_url=?, content_type=?, content=? WHERE id=?',
      [title, description, file_url || null, content_type || 'link', content || null, req.params.id]
    );
    res.json({ message: 'Material updated' });
  } catch (error) {
    console.error('Material update error:', error);
    res.status(500).json({ error: 'Failed updating material' });
  }
});

router.delete('/materials/:id', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    await run('DELETE FROM materials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting material' });
  }
});

module.exports = router;
