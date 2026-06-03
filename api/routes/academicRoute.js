const express = require('express');
const router = express.Router();
const { query, run } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

router.get('/courses', [verifyToken], async (req, res) => {
  try {
    const [courses] = await query('SELECT * FROM courses');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching courses' });
  }
});

router.post('/courses', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { code, name, sks, semester } = req.body;
    const result = await run(
      'INSERT INTO courses (code, name, sks, semester) VALUES (?, ?, ?, ?)',
      [code, name, sks, semester]
    );
    res.status(201).json({ message: 'Course created successfully', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed creating course' });
  }
});

router.put('/courses/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { code, name, sks, semester } = req.body;
    await run(
      'UPDATE courses SET code = ?, name = ?, sks = ?, semester = ? WHERE id = ?',
      [code, name, sks, semester, req.params.id]
    );
    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed updating course' });
  }
});

router.delete('/courses/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting course' });
  }
});

router.get('/classes', [verifyToken], async (req, res) => {
  try {
    const [classes] = await query('SELECT * FROM classes');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching classes' });
  }
});

router.post('/classes', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { name } = req.body;
    const result = await run('INSERT INTO classes (name) VALUES (?)', [name]);
    res.status(201).json({ message: 'Class created successfully', id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed creating class' });
  }
});

router.put('/classes/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { name } = req.body;
    await run('UPDATE classes SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed updating class' });
  }
});

router.delete('/classes/:id', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM classes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed deleting class' });
  }
});

router.get('/enrollments', [verifyToken], async (req, res) => {
  try {
    const { class_id, class_ids } = req.query;
    let sql = `
      SELECT ce.*, u.name as mahasiswa_name, u.nidn_nim as mahasiswa_nim 
      FROM class_enrollments ce
      JOIN users u ON ce.mahasiswa_id = u.id
    `;
    const params = [];

    if (class_ids) {
      let idsArr = [];
      try { idsArr = JSON.parse(class_ids); } catch (e) { }
      if (idsArr.length > 0) {
        const placeholders = idsArr.map(() => '?').join(',');
        sql += ` WHERE ce.class_id IN (${placeholders})`;
        params.push(...idsArr);
      }
    } else if (class_id) {
      sql += ' WHERE ce.class_id = ?';
      params.push(class_id);
    }

    const [enrollments] = await query(sql, params);
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: 'Failed fetching enrollments' });
  }
});

router.delete('/enrollments/:mahasiswaId', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    await run('DELETE FROM class_enrollments WHERE mahasiswa_id = ?', [req.params.mahasiswaId]);
    res.json({ message: 'Mahasiswa berhasil dikeluarkan dari kelas' });
  } catch (error) {
    res.status(500).json({ error: 'Failed removing student from class' });
  }
});

router.post('/enrollments/bulk', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { class_id, mahasiswa_ids } = req.body;
    if (!Array.isArray(mahasiswa_ids)) return res.status(400).json({ error: 'mahasiswa_ids must be an array' });

    const placeholders = mahasiswa_ids.map(() => '?').join(',');
    const [existing] = await query(`SELECT mahasiswa_id FROM class_enrollments WHERE mahasiswa_id IN (${placeholders})`, mahasiswa_ids);

    const existingIds = existing.map(e => e.mahasiswa_id);
    const newIds = mahasiswa_ids.filter(id => !existingIds.includes(parseInt(id)));

    if (newIds.length === 0 && mahasiswa_ids.length > 0) {
      return res.status(400).json({ error: 'Semua mahasiswa yang dipilih sudah terdaftar di kelas lain.' });
    }

    let count = 0;
    for (const mhs_id of newIds) {
      try {
        await run('INSERT INTO class_enrollments (class_id, mahasiswa_id) VALUES (?, ?)', [class_id, mhs_id]);
        count++;
      } catch (e) {}
    }

    if (count < mahasiswa_ids.length) {
      return res.status(201).json({ message: `Berhasil mendaftarkan ${count} mahasiswa. Beberapa mahasiswa diabaikan karena sudah terdaftar di kelas lain.` });
    }

    res.status(201).json({ message: `Berhasil mendaftarkan ${count} mahasiswa ke kelas` });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mendaftarkan mahasiswa' });
  }
});

module.exports = router;
