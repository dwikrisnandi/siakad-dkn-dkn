const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { query, run } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, convertInchesToTwip, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign, TableLayoutType, PageBreak } = docx;

// =====================================================
// EXAM MIGRATIONS (run once on startup)
// =====================================================
(async () => {
  try {
    await run(`CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('UTS', 'UAS')),
      title TEXT NOT NULL,
      description TEXT,
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      duration_minutes INTEGER DEFAULT 90,
      is_active INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await run(`CREATE TABLE IF NOT EXISTS exam_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('pg', 'true_false', 'essay')),
      question_text TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT,
      points INTEGER DEFAULT 10,
      order_num INTEGER DEFAULT 0
    )`);
    await run(`CREATE TABLE IF NOT EXISTS exam_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      mahasiswa_id INTEGER NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      submitted_at TIMESTAMP,
      is_submitted INTEGER DEFAULT 0,
      total_score REAL,
      UNIQUE(exam_id, mahasiswa_id)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS exam_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      mahasiswa_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer TEXT,
      is_correct INTEGER,
      points_earned REAL DEFAULT 0,
      essay_score REAL,
      graded_by_dosen INTEGER DEFAULT 0,
      UNIQUE(session_id, question_id)
    )`);
  } catch (e) {
    console.warn('[examRoute] Migration warning:', e.message);
  }
  // Add exam_blocks table
  try {
    await run(`CREATE TABLE IF NOT EXISTS exam_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      mahasiswa_id INTEGER NOT NULL,
      UNIQUE(exam_id, mahasiswa_id)
    )`);
  } catch (e) {
    console.warn('[examRoute] exam_blocks Migration warning:', e.message);
  }
  // Add last_pushed_at column for smart FCM push (avoid duplicate pushes)
  try { await run('ALTER TABLE exams ADD COLUMN last_pushed_at TIMESTAMP'); } catch (e) { /* column already exists */ }
  try { await run('ALTER TABLE exams ADD COLUMN last_pushed_hash TEXT'); } catch (e) { /* column already exists */ }
})();

// ─────────────────────────────────────────────────────────
// DOSEN: CRUD Ujian
// ─────────────────────────────────────────────────────────

// GET semua ujian untuk satu jadwal
router.get('/exams/schedule/:scheduleId', [verifyToken], async (req, res) => {
  try {
    const [exams] = await query(
      `SELECT e.*, 
        (SELECT COUNT(*) FROM exam_questions WHERE exam_id = e.id) as total_questions,
        (SELECT COUNT(*) FROM exam_sessions WHERE exam_id = e.id AND is_submitted = 1) as total_submitted
       FROM exams e WHERE e.schedule_id = ? ORDER BY e.created_at DESC`,
      [req.params.scheduleId]
    );
    res.json(exams);
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil data ujian' });
  }
});

// GET: ujian yang tersedia untuk mahasiswa (berdasarkan jadwal yang diikuti)
router.get('/exams/available', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const [exams] = await query(
      `SELECT DISTINCT e.*, c.name as course_name, c.code as course_code,
        es.id as session_id, es.is_submitted, es.total_score, es.started_at
       FROM exams e
       JOIN schedules s ON e.schedule_id = s.id
       JOIN courses c ON s.course_id = c.id
       JOIN class_enrollments ce ON (
         s.class_id = ce.class_id OR
         s.class_ids LIKE '%"' || ce.class_id::text || '"%' OR
         s.class_ids LIKE '%[' || ce.class_id::text || ']%' OR
         s.class_ids LIKE '%,' || ce.class_id::text || ']%' OR
         s.class_ids LIKE '%[' || ce.class_id::text || ',%' OR
         s.class_ids LIKE '%,' || ce.class_id::text || ',%'
       )
       LEFT JOIN exam_sessions es ON es.exam_id = e.id AND es.mahasiswa_id = ?
       WHERE ce.mahasiswa_id = ? AND e.is_active = 1
       ORDER BY e.created_at DESC`,
      [req.userId, req.userId]
    );
    res.json(exams);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal mengambil daftar ujian' });
  }
});

// GET satu ujian + soal-soalnya
router.get('/exams/:id', [verifyToken], async (req, res) => {
  try {
    const [[exam]] = await query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });

    const role = req.userRole;
    const [questions] = await query(
      `SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY order_num, id`,
      [req.params.id]
    );

    // Mahasiswa tidak boleh lihat kunci jawaban
    const safeQuestions = questions.map(q => {
      const opts = q.options ? JSON.parse(q.options) : null;
      return role === 'mahasiswa'
        ? { id: q.id, question_text: q.question_text, question_type: q.question_type, options: opts, points: q.points, order_num: q.order_num }
        : { ...q, options: opts };
    });

    res.json({ ...exam, questions: safeQuestions });
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil detail ujian' });
  }
});

// POST buat ujian baru
router.post('/exams', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, type, title, description, start_time, end_time, duration_minutes } = req.body;
    const crypto = require('crypto');
    const token = crypto.randomBytes(3).toString('hex').toUpperCase();
    const result = await run(
      `INSERT INTO exams (schedule_id, type, title, description, start_time, end_time, duration_minutes, is_active, token)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [schedule_id, type, title, description || '', start_time || null, end_time || null, duration_minutes || 90, token]
    );
    res.status(201).json({ message: 'Ujian berhasil dibuat', id: result.id });
  } catch (e) {
    res.status(500).json({ error: 'Gagal membuat ujian' });
  }
});

// PUT update ujian
router.put('/exams/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { title, description, start_time, end_time, duration_minutes, is_active } = req.body;
    await run(
      `UPDATE exams SET title=?, description=?, start_time=?, end_time=?, duration_minutes=?, is_active=? WHERE id=?`,
      [title, description || '', start_time || null, end_time || null, duration_minutes || 90, is_active ? 1 : 0, req.params.id]
    );
    res.json({ message: 'Ujian berhasil diperbarui' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal memperbarui ujian' });
  }
});

// PATCH toggle aktif/nonaktif ujian
router.patch('/exams/:id/toggle', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const [[exam]] = await query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });
    const newActive = exam.is_active ? 0 : 1;
    await run('UPDATE exams SET is_active = ? WHERE id = ?', [newActive, req.params.id]);

    // ── PUSH EXAM DATA TO STUDENTS VIA FCM WHEN ACTIVATED ──
    if (newActive === 1) {
      try {
        // Get questions (strip correct_answer for security — grading happens server-side on submit)
        const [questions] = await query(
          'SELECT id, question_type, question_text, options, points, order_num FROM exam_questions WHERE exam_id = ? ORDER BY order_num, id',
          [req.params.id]
        );

        // Create a simple hash of question content to detect changes
        const questionHash = require('crypto')
          .createHash('md5')
          .update(JSON.stringify(questions.map(q => ({ id: q.id, t: q.question_text, o: q.options }))))
          .digest('hex');

        // Skip push if already pushed with same questions
        if (exam.last_pushed_at && exam.last_pushed_hash === questionHash) {
          console.log(`⏭️ Exam ${exam.id} already pushed with same questions, skipping FCM`);
        } else {
          const safeQuestions = questions.map(q => ({
            id: q.id,
            question_type: q.question_type,
            question_text: q.question_text,
            options: q.options ? JSON.parse(q.options) : null,
            points: q.points,
            order_num: q.order_num
          }));

          // Get course info
          const [[scheduleInfo]] = await query(
            `SELECT c.name as course_name, c.code as course_code FROM schedules s JOIN courses c ON s.course_id = c.id WHERE s.id = ?`,
            [exam.schedule_id]
          );

          // Build exam payload for caching
          const examPayload = {
            id: exam.id,
            title: exam.title,
            type: exam.type,
            description: exam.description,
            duration_minutes: exam.duration_minutes,
            start_time: exam.start_time,
            end_time: exam.end_time,
            token: exam.token,
            course_name: scheduleInfo?.course_name || '',
            course_code: scheduleInfo?.course_code || '',
            questions: safeQuestions
          };

          // Find all enrolled students' FCM tokens
          const [studentTokens] = await query(
            `SELECT DISTINCT uft.token
             FROM class_enrollments ce
             JOIN schedules s ON (
               s.class_id = ce.class_id OR
               s.class_ids LIKE '%"' || ce.class_id::text || '"%' OR
               s.class_ids LIKE '%[' || ce.class_id::text || ']%' OR
               s.class_ids LIKE '%,' || ce.class_id::text || ']%' OR
               s.class_ids LIKE '%[' || ce.class_id::text || ',%' OR
               s.class_ids LIKE '%,' || ce.class_id::text || ',%'
             )
             JOIN user_fcm_tokens uft ON uft.user_id = ce.mahasiswa_id
             WHERE s.id = ?`,
            [exam.schedule_id]
          );

          if (studentTokens.length > 0) {
            const { sendMulticastNotification } = require('../utils/fcm');
            const tokens = studentTokens.map(t => t.token);
            await sendMulticastNotification(
              tokens,
              `📝 Ujian ${exam.type}: ${exam.title}`,
              `Ujian ${exam.title} (${scheduleInfo?.course_name}) sudah dibuka. Soal sudah di-cache ke perangkat Anda.`,
              {
                type: 'exam_push',
                exam_payload: JSON.stringify(examPayload)
              }
            );
            console.log(`✅ Pushed exam ${exam.id} to ${tokens.length} student device(s)`);
          }

          // Mark as pushed with current question hash
          await run('UPDATE exams SET last_pushed_at = CURRENT_TIMESTAMP, last_pushed_hash = ? WHERE id = ?', [questionHash, req.params.id]);
        }
      } catch (pushErr) {
        console.error('⚠️ Failed to push exam data to students (non-blocking):', pushErr.message);
      }
    }

    res.json({ message: 'Status ujian diperbarui', is_active: !exam.is_active });
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengubah status ujian' });
  }
});

// DELETE ujian
router.delete('/exams/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    await run('DELETE FROM exam_answers WHERE exam_id = ?', [req.params.id]);
    await run('DELETE FROM exam_sessions WHERE exam_id = ?', [req.params.id]);
    await run('DELETE FROM exam_questions WHERE exam_id = ?', [req.params.id]);
    await run('DELETE FROM exams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ujian berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menghapus ujian' });
  }
});

// =====================================================
// EXPORT DOCX
// =====================================================
router.get('/exams/:id/export-docx', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    const examId = req.params.id;
    const [exams] = await query(
      `SELECT e.*, c.name as course_name, c.code as course_code, u.name as dosen_name
       FROM exams e
       JOIN schedules s ON e.schedule_id = s.id
       JOIN courses c ON s.course_id = c.id
       JOIN users u ON s.dosen_id = u.id
       WHERE e.id = ?`,
      [examId]
    );
    if (exams.length === 0) return res.status(404).json({ error: 'Ujian tidak ditemukan' });
    const exam = exams[0];

    const [questions] = await query('SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY order_num, id ASC', [examId]);

    // Group questions by type
    const pgQuestions = questions.filter(q => q.question_type === 'pg');
    const tfQuestions = questions.filter(q => q.question_type === 'true_false');
    const essayQuestions = questions.filter(q => q.question_type === 'essay');

    // Determine exam type labels
    const isUAS = exam.type === 'UAS';
    const examTypeTitle = isUAS ? 'UJIAN AKHIR SEMESTER' : 'UJIAN TENGAH SEMESTER';

    // Determine semester info from current date
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const semesterType = (month >= 7) ? 'GANJIL' : 'GENAP';
    const academicYear = (month >= 7) ? `${year}/${year + 1}` : `${year - 1}/${year}`;

    // Helper: create a no-border cell config
    const noBorders = {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
    };

    // Helper: strip HTML tags from question text
    const stripHtml = (text) => (text || '').replace(/<[^>]+>/g, '');

    // ── Build document children ──
    const children = [];

    // ─── HEADER: Logo + Institution Info (Table Layout) ───
    const logoPath = path.join(__dirname, '..', 'assets', 'logo_pamitran.png');
    const logoBuffer = fs.readFileSync(logoPath);

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
        insideVertical: { style: BorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            // Logo cell (left)
            new TableCell({
              width: { size: 18, type: WidthType.PERCENTAGE },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: logoBuffer,
                      transformation: { width: 80, height: 80 },
                      type: 'png',
                    }),
                  ],
                }),
              ],
            }),
            // Text cell (right)
            new TableCell({
              width: { size: 82, type: WidthType.PERCENTAGE },
              borders: noBorders,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0 },
                  children: [
                    new TextRun({ text: ' STMIK PAMITRAN', bold: true, size: 32, font: 'Times New Roman' }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0 },
                  children: [
                    new TextRun({ text: 'The Heart Of Management and Informatics Engineering University', italics: true, size: 20, font: 'Times New Roman' }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0 },
                  children: [
                    new TextRun({ text: 'Jl. Bharata Raya Blok K No. 22, 23, 24 Sukaluyu, Teluk Jambe Timur, Karawang 41361', size: 18, font: 'Times New Roman' }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0 },
                  children: [
                    new TextRun({ text: 'Email: stmik@stmikpamitran.ac.id  Telepon: 082121444219', size: 18, font: 'Times New Roman' }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0 },
                  children: [
                    new TextRun({ text: 'Website: stmikpamitran.ac.id', size: 18, font: 'Times New Roman' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
    children.push(headerTable);

    // ─── Horizontal line (border bottom paragraph) ───
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        },
        children: [new TextRun({ text: '', size: 2 })],
      }),
    );

    // ─── EXAM TITLE ───
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 0 },
        children: [
          new TextRun({ text: examTypeTitle, bold: true, size: 28, font: 'Times New Roman' }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: `SEMESTER ${semesterType} ${academicYear}`, bold: true, size: 24, font: 'Times New Roman' }),
        ],
      }),
    );

    // ─── EXAM INFO TABLE ───
    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        // Row 1: Mata Kuliah
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: 'Mata Kuliah', size: 22, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              width: { size: 5, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: ':', size: 22, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: `${exam.course_name.toUpperCase()}`, bold: true, size: 22, font: 'Times New Roman' })] })],
            }),
          ],
        }),
        // Row 2: Waktu
        new TableRow({
          children: [
            new TableCell({
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: 'Waktu', size: 22, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: ':', size: 22, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: `${exam.duration_minutes} Menit`, size: 22, font: 'Times New Roman' })] })],
            }),
          ],
        }),
        // Row 3: Dosen
        new TableRow({
          children: [
            new TableCell({
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: 'Dosen', size: 22, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: ':', size: 22, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: exam.dosen_name || '-', bold: true, size: 22, font: 'Times New Roman' })] })],
            }),
          ],
        }),
        // Row 4: Sifat
        new TableRow({
          children: [
            new TableCell({
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: 'Sifat', size: 22, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: ':', size: 22, font: 'Times New Roman' })] })],
            }),
            new TableCell({
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: 'Close Book', size: 22, font: 'Times New Roman' })] })],
            }),
          ],
        }),
      ],
    });
    children.push(infoTable);

    // ─── PETUNJUK UMUM ───
    children.push(
      new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Petunjuk Umum :', bold: true, size: 22, font: 'Times New Roman' })] }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: 'Sebelum dikerjakan, berdoa dan dibaca terlebih dahulu soalnya dengan teliti.', size: 22, font: 'Times New Roman' })],
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: 'Jangan menyontek dan kerjasama.', size: 22, font: 'Times New Roman' })],
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: 'Dilarang menggunakan HP/perangkat elektronik on-line kecuali Kalkulator.', size: 22, font: 'Times New Roman' })],
      }),
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: 'Kerjakanlah soal di bawah ini dengan benar!', bold: true, size: 22, font: 'Times New Roman' })],
      }),
    );

    // ─── SECTION A: PILIHAN GANDA ───
    if (pgQuestions.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({ text: 'A.  ', bold: true, size: 22, font: 'Times New Roman' }),
            new TextRun({ text: 'PILIHAN GANDA', bold: true, underline: {}, size: 22, font: 'Times New Roman' }),
          ],
        }),
      );

      pgQuestions.forEach((q, index) => {
        // Question text
        children.push(new Paragraph({
          spacing: { before: 80 },
          children: [
            new TextRun({ text: `${index + 1}.  `, bold: true, size: 22, font: 'Times New Roman' }),
            new TextRun({ text: stripHtml(q.question_text), size: 22, font: 'Times New Roman' }),
          ],
        }));

        // Options
        if (q.options) {
          try {
            const opts = JSON.parse(q.options);
            const labels = ['A', 'B', 'C', 'D', 'E'];
            opts.forEach((opt, oIdx) => {
              children.push(new Paragraph({
                indent: { left: convertInchesToTwip(0.4) },
                children: [
                  new TextRun({ text: `${labels[oIdx] || '-'}.  ${stripHtml(opt)}`, size: 22, font: 'Times New Roman' }),
                ],
              }));
            });
          } catch (e) {}
        }

        // Spacing after each question
        children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '', size: 10 })] }));
      });
    }

    // ─── SECTION B: BENAR ATAU SALAH ───
    if (tfQuestions.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 100 },
          children: [
            new TextRun({ text: `${pgQuestions.length > 0 ? 'B' : 'A'}.  `, bold: true, size: 22, font: 'Times New Roman' }),
            new TextRun({ text: 'BENAR ATAU SALAH', bold: true, underline: {}, size: 22, font: 'Times New Roman' }),
          ],
        }),
      );

      tfQuestions.forEach((q, index) => {
        children.push(new Paragraph({
          spacing: { before: 60 },
          children: [
            new TextRun({ text: `${index + 1}.  `, bold: true, size: 22, font: 'Times New Roman' }),
            new TextRun({ text: `${stripHtml(q.question_text)} `, size: 22, font: 'Times New Roman' }),
            new TextRun({ text: '(Benar / Salah)', italics: true, size: 22, font: 'Times New Roman' }),
          ],
        }));
      });
    }

    // ─── SECTION C: ESSAY ───
    if (essayQuestions.length > 0) {
      // Determine section letter
      let sectionLetter = 'A';
      if (pgQuestions.length > 0 && tfQuestions.length > 0) sectionLetter = 'C';
      else if (pgQuestions.length > 0 || tfQuestions.length > 0) sectionLetter = 'B';

      children.push(
        new Paragraph({
          spacing: { before: 300, after: 100 },
          children: [
            new TextRun({ text: `${sectionLetter}.  `, bold: true, size: 22, font: 'Times New Roman' }),
            new TextRun({ text: 'ESSAY', bold: true, underline: {}, size: 22, font: 'Times New Roman' }),
          ],
        }),
      );

      essayQuestions.forEach((q, index) => {
        children.push(new Paragraph({
          spacing: { before: 80 },
          children: [
            new TextRun({ text: `${index + 1}.  `, bold: true, size: 22, font: 'Times New Roman' }),
            new TextRun({ text: stripHtml(q.question_text), size: 22, font: 'Times New Roman' }),
          ],
        }));
      });
    }

    // ── Build final document ──
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 22,
            },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      }],
    });

    const b64string = await Packer.toBase64String(doc);
    const buffer = Buffer.from(b64string, 'base64');

    res.setHeader('Content-Disposition', `attachment; filename=Soal_${exam.type}_${exam.course_code}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);

  } catch (error) {
    console.error("Export DOCX error:", error);
    res.status(500).json({ error: 'Gagal men-generate file DOCX' });
  }
});

// ─────────────────────────────────────────────────────────
// DOSEN: CRUD Soal
// ─────────────────────────────────────────────────────────

// POST tambah soal
router.post('/exam-questions', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { exam_id, question_type, question_text, options, correct_answer, points, order_num } = req.body;
    const result = await run(
      `INSERT INTO exam_questions (exam_id, question_type, question_text, options, correct_answer, points, order_num)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        exam_id,
        question_type,
        question_text,
        options ? JSON.stringify(options) : null,
        correct_answer || null,
        points || 10,
        order_num || 0
      ]
    );
    res.status(201).json({ message: 'Soal berhasil ditambahkan', id: result.id });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menambahkan soal' });
  }
});

// PUT update soal
router.put('/exam-questions/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { question_type, question_text, options, correct_answer, points, order_num } = req.body;
    await run(
      `UPDATE exam_questions SET question_type=?, question_text=?, options=?, correct_answer=?, points=?, order_num=? WHERE id=?`,
      [
        question_type,
        question_text,
        options ? JSON.stringify(options) : null,
        correct_answer || null,
        points || 10,
        order_num || 0,
        req.params.id
      ]
    );
    res.json({ message: 'Soal berhasil diperbarui' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal memperbarui soal' });
  }
});

// DELETE soal
router.delete('/exam-questions/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    await run('DELETE FROM exam_answers WHERE question_id = ?', [req.params.id]);
    await run('DELETE FROM exam_questions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Soal berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menghapus soal' });
  }
});

// ─────────────────────────────────────────────────────────
// DOSEN: BANK SOAL
// ─────────────────────────────────────────────────────────

// GET semua soal di bank berdasarkan schedule_id
router.get('/question-bank/schedule/:scheduleId', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const paketName = req.query.paket;
    const qStr = paketName ? 'SELECT * FROM question_bank WHERE schedule_id = ? AND paket_name = ? ORDER BY id DESC' : 'SELECT * FROM question_bank WHERE schedule_id = ? ORDER BY id DESC';
    const params = paketName ? [req.params.scheduleId, paketName] : [req.params.scheduleId];
    
    const [questions] = await query(qStr, params);
    res.json(questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null
    })));
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil bank soal' });
  }
});

// GET list paket
router.get('/question-bank/schedule/:scheduleId/pakets', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const [pakets] = await query('SELECT DISTINCT paket_name, COUNT(id) as total_questions FROM question_bank WHERE schedule_id = ? GROUP BY paket_name', [req.params.scheduleId]);
    res.json(pakets);
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil list paket' });
  }
});

// POST tambah ke bank soal
router.post('/question-bank', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { schedule_id, question_type, question_text, options, correct_answer, points, paket_name } = req.body;
    const result = await run(
      `INSERT INTO question_bank (schedule_id, question_type, question_text, options, correct_answer, points, paket_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [schedule_id, question_type, question_text, options ? JSON.stringify(options) : null, correct_answer || null, points || 10, paket_name || 'Paket Default']
    );
    res.status(201).json({ message: 'Soal ditambahkan ke bank', id: result.id });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menyimpan ke bank soal' });
  }
});

// PUT edit soal di bank soal
router.put('/question-bank/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { question_type, question_text, options, correct_answer, points } = req.body;
    await run(
      `UPDATE question_bank SET question_type = ?, question_text = ?, options = ?, correct_answer = ?, points = ? WHERE id = ?`,
      [question_type, question_text, options ? JSON.stringify(options) : null, correct_answer || null, points || 10, req.params.id]
    );
    res.json({ message: 'Soal berhasil diperbarui' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal memperbarui soal di bank' });
  }
});

// DELETE dari bank soal
router.delete('/question-bank/:id', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    await run('DELETE FROM question_bank WHERE id = ?', [req.params.id]);
    res.json({ message: 'Soal dihapus dari bank' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menghapus dari bank soal' });
  }
});

// DELETE seluruh paket dari bank soal
router.delete('/question-bank/schedule/:scheduleId/paket/:paketName', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    await run('DELETE FROM question_bank WHERE schedule_id = ? AND paket_name = ?', [req.params.scheduleId, req.params.paketName]);
    res.json({ message: 'Paket soal berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menghapus paket soal' });
  }
});

// POST import dari bank ke ujian
router.post('/exams/:examId/import-from-bank', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { question_ids } = req.body;
    if (!question_ids || !Array.isArray(question_ids)) return res.json({ message: 'Tidak ada soal yang dipilih' });
    
    // First, delete all exam_questions that came from the bank but are NO LONGER selected
    // Note: To be safe, if we want sync behavior, we should delete existing bank-imported questions that are NOT in question_ids,
    // but the user might just want to add. Wait, the user said "nah yang sudah masuk terpilih ke soal sudah ter celis".
    // If they uncheck, it should be removed. So we should sync.
    // Let's get current bank_ids in the exam
    const [currentQs] = await query('SELECT id, bank_id FROM exam_questions WHERE exam_id = ? AND bank_id IS NOT NULL', [req.params.examId]);
    const currentBankIds = currentQs.map(q => q.bank_id);
    
    const idsToAdd = question_ids.filter(id => !currentBankIds.includes(id));
    const idsToRemove = currentBankIds.filter(id => !question_ids.includes(id));
    
    // Remove unselected
    if (idsToRemove.length > 0) {
      const placeholders = idsToRemove.map(() => '?').join(',');
      await run(`DELETE FROM exam_questions WHERE exam_id = ? AND bank_id IN (${placeholders})`, [req.params.examId, ...idsToRemove]);
    }
    
    // Add newly selected
    for (const qId of idsToAdd) {
      const [bankQs] = await query('SELECT * FROM question_bank WHERE id = ?', [qId]);
      if (bankQs.length > 0) {
        const bankQ = bankQs[0];
        await run(
          `INSERT INTO exam_questions (exam_id, question_type, question_text, options, correct_answer, points, order_num, bank_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.params.examId, bankQ.question_type, bankQ.question_text, bankQ.options, bankQ.correct_answer, bankQ.points, 0, bankQ.id]
        );
      }
    }
    res.json({ message: 'Berhasil sinkronisasi soal dari bank' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengimpor dari bank' });
  }
});

// ─────────────────────────────────────────────────────────
// DOSEN: Lihat Hasil & Koreksi Essay
// ─────────────────────────────────────────────────────────

// GET hasil semua mahasiswa untuk 1 ujian
router.get('/exams/:id/results', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    const [sessions] = await query(
      `SELECT es.*, u.name as mahasiswa_name, u.nidn_nim as mahasiswa_nim
       FROM exam_sessions es
       JOIN users u ON es.mahasiswa_id = u.id
       WHERE es.exam_id = ?
       ORDER BY es.total_score DESC`,
      [req.params.id]
    );

    const [questions] = await query(
      'SELECT id, question_type, question_text, points FROM exam_questions WHERE exam_id = ? ORDER BY order_num, id',
      [req.params.id]
    );

    const result = [];
    for (const s of sessions) {
      const [answers] = await query(
        `SELECT ea.*, eq.question_text, eq.question_type, eq.correct_answer, eq.points
         FROM exam_answers ea
         JOIN exam_questions eq ON ea.question_id = eq.id
         WHERE ea.session_id = ?
         ORDER BY eq.order_num, eq.id`,
        [s.id]
      );
      result.push({ ...s, answers });
    }

    res.json({ sessions: result, questions });
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil hasil ujian' });
  }
});

// PUT nilai essay dari dosen
router.put('/exam-answers/:id/score', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const { essay_score } = req.body;
    const [[ans]] = await query(
      `SELECT ea.session_id, eq.points FROM exam_answers ea JOIN exam_questions eq ON ea.question_id = eq.id WHERE ea.id = ?`,
      [req.params.id]
    );
    if (!ans) return res.status(404).json({ error: 'Jawaban tidak ditemukan' });

    const score = Math.min(parseFloat(essay_score) || 0, ans.points);
    await run(
      'UPDATE exam_answers SET essay_score = ?, points_earned = ?, graded_by_dosen = 1 WHERE id = ?',
      [score, score, req.params.id]
    );

    // Recalculate total score for the session
    const [[session]] = await query('SELECT id, exam_id, mahasiswa_id FROM exam_sessions WHERE id = ?', [ans.session_id]);
    const [allAnswers] = await query(
      'SELECT points_earned FROM exam_answers WHERE session_id = ?',
      [ans.session_id]
    );
    const [allQuestions] = await query('SELECT SUM(points) as total FROM exam_questions WHERE exam_id = ?', [session.exam_id]);
    const totalPoints = allQuestions[0].total || 1;
    const earned = allAnswers.reduce((acc, a) => acc + (parseFloat(a.points_earned) || 0), 0);
    const totalScore = Math.round((earned / totalPoints) * 100);

    await run('UPDATE exam_sessions SET total_score = ? WHERE id = ?', [totalScore, ans.session_id]);
    res.json({ message: 'Nilai essay disimpan', total_score: totalScore });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menyimpan nilai essay' });
  }
});

// POST: Dosen buka kembali sesi ujian mahasiswa (Re-open)
router.post('/exam-sessions/:sessionId/reopen', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    // Kita hapus flag is_submitted dan submitted_at supaya mahasiswa bisa lanjut
    // total_score kita null-kan sementara sampai dia submit lagi
    await run(
      'UPDATE exam_sessions SET is_submitted = 0, submitted_at = NULL, total_score = NULL WHERE id = ?',
      [sessionId]
    );
    res.json({ message: 'Ujian berhasil dibuka kembali untuk mahasiswa ini' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal membuka kembali ujian' });
  }
});

// GET: ambil daftar peserta ujian beserta status blokirnya
router.get('/exams/:id/students', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    const [[exam]] = await query('SELECT schedule_id FROM exams WHERE id = ?', [req.params.id]);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });

    const [students] = await query(
      `SELECT DISTINCT u.id, u.name, u.nidn_nim as nim, 
              (CASE WHEN eb.id IS NOT NULL THEN 1 ELSE 0 END) as is_blocked
       FROM class_enrollments ce
       JOIN schedules s ON (
         s.class_id = ce.class_id OR
         s.class_ids LIKE '%"' || ce.class_id::text || '"%' OR
         s.class_ids LIKE '%[' || ce.class_id::text || ']%' OR
         s.class_ids LIKE '%,' || ce.class_id::text || ']%' OR
         s.class_ids LIKE '%[' || ce.class_id::text || ',%' OR
         s.class_ids LIKE '%,' || ce.class_id::text || ',%'
       )
       JOIN users u ON ce.mahasiswa_id = u.id
       LEFT JOIN exam_blocks eb ON eb.exam_id = ? AND eb.mahasiswa_id = u.id
       WHERE s.id = ?
       ORDER BY u.name`,
      [req.params.id, exam.schedule_id]
    );

    res.json(students);
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil daftar mahasiswa' });
  }
});

// POST: ubah status blokir mahasiswa untuk ujian tertentu
router.post('/exams/:id/blocks', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    const { mahasiswa_id, is_blocked } = req.body;
    if (is_blocked) {
      await run('INSERT INTO exam_blocks (exam_id, mahasiswa_id) VALUES (?, ?) ON CONFLICT (exam_id, mahasiswa_id) DO NOTHING', [req.params.id, mahasiswa_id]);
    } else {
      await run('DELETE FROM exam_blocks WHERE exam_id = ? AND mahasiswa_id = ?', [req.params.id, mahasiswa_id]);
    }
    res.json({ message: 'Status blokir berhasil diubah' });
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengubah status blokir' });
  }
});

// ─────────────────────────────────────────────────────────
// MAHASISWA: Sesi Ujian
// ─────────────────────────────────────────────────────────


// POST: mulai sesi ujian
router.post('/exam-sessions/:examId/start', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const mahasiswaId = req.userId;
    const { token } = req.body;

    const [[exam]] = await query('SELECT * FROM exams WHERE id = ?', [examId]);
    if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });
    if (!exam.is_active) return res.status(403).json({ error: 'Ujian belum dibuka oleh dosen' });

    // Validasi token terlebih dahulu (selalu wajib)
    if (exam.token && exam.token !== token) {
      return res.status(403).json({ error: 'Token ujian tidak valid' });
    }

    // Cek apakah mahasiswa diblokir dari ujian ini
    const [blocked] = await query('SELECT * FROM exam_blocks WHERE exam_id = ? AND mahasiswa_id = ?', [examId, mahasiswaId]);
    if (blocked.length > 0) {
      return res.status(403).json({ error: 'Maaf, Anda tidak diizinkan untuk mengikuti ujian ini' });
    }

    // Cek apakah sudah ada sesi
    const [existing] = await query('SELECT * FROM exam_sessions WHERE exam_id = ? AND mahasiswa_id = ?', [examId, mahasiswaId]);
    if (existing.length > 0) {
      if (existing[0].is_submitted) return res.status(400).json({ error: 'Anda sudah mengumpulkan ujian ini' });
      return res.json({ message: 'Sesi sudah ada', session_id: existing[0].id });
    }

    // Jika sesi baru, validasi jadwal
    const now = new Date();
    if (exam.start_time && new Date(exam.start_time) > now) {
      return res.status(403).json({ error: 'Ujian belum dimulai sesuai jadwal' });
    }
    if (exam.end_time && new Date(exam.end_time) < now) {
      return res.status(403).json({ error: 'Waktu ujian telah berakhir' });
    }

    const result = await run(
      'INSERT INTO exam_sessions (exam_id, mahasiswa_id) VALUES (?, ?)',
      [examId, mahasiswaId]
    );
    res.status(201).json({ message: 'Sesi ujian dimulai', session_id: result.id });
  } catch (e) {
    res.status(500).json({ error: 'Gagal memulai sesi ujian' });
  }
});

// GET: jawaban mahasiswa saat ini (untuk resume)
router.get('/exam-sessions/:examId/answers', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const [[session]] = await query(
      'SELECT * FROM exam_sessions WHERE exam_id = ? AND mahasiswa_id = ?',
      [req.params.examId, req.userId]
    );
    if (!session) return res.json({ answers: {} });

    const [answers] = await query(
      'SELECT question_id, answer FROM exam_answers WHERE session_id = ?',
      [session.id]
    );
    const answerMap = {};
    answers.forEach(a => { answerMap[a.question_id] = a.answer; });
    res.json({ session, answers: answerMap });
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil jawaban' });
  }
});

// POST/PUT: simpan satu jawaban (auto-save)
router.post('/exam-sessions/:examId/answer', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const { question_id, answer } = req.body;
    const examId = parseInt(req.params.examId);
    const mahasiswaId = req.userId;

    const [[session]] = await query(
      'SELECT * FROM exam_sessions WHERE exam_id = ? AND mahasiswa_id = ?',
      [examId, mahasiswaId]
    );
    if (!session) return res.status(400).json({ error: 'Sesi tidak ditemukan. Mulai ujian terlebih dahulu.' });
    if (session.is_submitted) return res.status(400).json({ error: 'Ujian sudah dikumpulkan' });

    // Ambil soal untuk mengecek tipe & jawaban benar
    const [[question]] = await query('SELECT * FROM exam_questions WHERE id = ?', [question_id]);
    if (!question) return res.status(404).json({ error: 'Soal tidak ditemukan' });

    let is_correct = null;
    let points_earned = 0;

    if (question.question_type === 'pg' || question.question_type === 'true_false') {
      is_correct = answer === question.correct_answer ? 1 : 0;
      points_earned = is_correct ? question.points : 0;
    }
    // Essay: graded manually by dosen

    await run(
      `INSERT INTO exam_answers (exam_id, session_id, mahasiswa_id, question_id, answer, is_correct, points_earned)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id, question_id) DO UPDATE SET answer=excluded.answer, is_correct=excluded.is_correct, points_earned=excluded.points_earned`,
      [examId, session.id, mahasiswaId, question_id, answer, is_correct, points_earned]
    );

    res.json({ message: 'Jawaban disimpan', is_correct });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal menyimpan jawaban' });
  }
});

// POST: submit / kumpulkan ujian
router.post('/exam-sessions/:examId/submit', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const mahasiswaId = req.userId;

    const [[session]] = await query(
      'SELECT * FROM exam_sessions WHERE exam_id = ? AND mahasiswa_id = ?',
      [examId, mahasiswaId]
    );
    if (!session) return res.status(400).json({ error: 'Sesi tidak ditemukan' });
    if (session.is_submitted) return res.status(400).json({ error: 'Ujian sudah dikumpulkan' });

    // Hitung skor dari PG & T/F (essay menyusul dinilai manual)
    const [allAnswers] = await query(
      'SELECT points_earned FROM exam_answers WHERE session_id = ?',
      [session.id]
    );
    const [allQuestions] = await query(
      'SELECT SUM(points) as total FROM exam_questions WHERE exam_id = ?',
      [examId]
    );
    const totalPoints = allQuestions[0].total || 1;
    const earned = allAnswers.reduce((acc, a) => acc + (parseFloat(a.points_earned) || 0), 0);
    const totalScore = Math.round((earned / totalPoints) * 100);

    await run(
      'UPDATE exam_sessions SET is_submitted = 1, submitted_at = CURRENT_TIMESTAMP, total_score = ? WHERE id = ?',
      [totalScore, session.id]
    );

    res.json({ message: 'Ujian berhasil dikumpulkan', total_score: totalScore });
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengumpulkan ujian' });
  }
});

// GET hasil ujian mahasiswa sendiri
router.get('/exam-sessions/:examId/result', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const [[session]] = await query(
      'SELECT * FROM exam_sessions WHERE exam_id = ? AND mahasiswa_id = ?',
      [req.params.examId, req.userId]
    );
    if (!session || !session.is_submitted) return res.json(null);

    const [answers] = await query(
      `SELECT ea.id, ea.exam_id, ea.session_id, ea.mahasiswa_id, ea.question_id, ea.answer, ea.points_earned, ea.essay_score, ea.graded_by_dosen, ea.is_correct, eq.question_text, eq.question_type, eq.points, eq.options
       FROM exam_answers ea
       JOIN exam_questions eq ON ea.question_id = eq.id
       WHERE ea.session_id = ?
       ORDER BY eq.order_num, eq.id`,
      [session.id]
    );

    const enriched = answers.map(a => ({ ...a, options: a.options ? JSON.parse(a.options) : null }));
    res.json({ session, answers: enriched });
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil hasil' });
  }
});

module.exports = router;
