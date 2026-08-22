const express = require('express');
const router = express.Router();
const { get, query } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

// Complex Query for Cumulative Transcript
// Logic: If retaken, get max final_score
const getTranscriptData = async (mahasiswaId) => {
  // Fetch all schedules for this mahasiswa
  const [schedules] = await query(`
    SELECT 
      c.id as course_id, c.code as course_code, c.name as course_name, c.sks, c.semester,
      s.id as schedule_id
    FROM course_grades cg
    JOIN schedules s ON cg.schedule_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE cg.mahasiswa_id = ?
    ORDER BY c.semester ASC, c.name ASC
  `, [mahasiswaId]);

  const courseMap = new Map();

  for (const s of schedules) {
    const scheduleId = s.schedule_id;
    
    // Kehadiran
    const [attRows] = await query('SELECT COUNT(DISTINCT meeting_number) as total_meetings FROM attendance WHERE schedule_id = ?', [scheduleId]);
    const totalMeetings = attRows[0].total_meetings || 0;
    let kehadiran = 0;
    if (totalMeetings > 0) {
      const [presentRows] = await query('SELECT COUNT(*) as present FROM attendance WHERE schedule_id = ? AND mahasiswa_id = ? AND status = ?', [scheduleId, mahasiswaId, 'Hadir']);
      kehadiran = Math.round((presentRows[0].present / totalMeetings) * 100);
    }
    
    // Tugas
    let avgTugas = 0;
    const [tugasRows] = await query(`
      SELECT s.nilai 
      FROM submissions s 
      JOIN assignments a ON s.assignment_id = a.id 
      WHERE a.schedule_id = ? AND s.mahasiswa_id = ? AND s.nilai IS NOT NULL
    `, [scheduleId, mahasiswaId]);
    if (tugasRows.length > 0) {
      const sum = tugasRows.reduce((a, b) => a + b.nilai, 0);
      avgTugas = Math.round(sum / tugasRows.length);
    }
    
    // Grades
    let uts = 0, uas = 0, tugasOverride = null;
    const [gradeRows] = await query('SELECT nilai_uts, nilai_uas, tugas_override FROM course_grades WHERE schedule_id = ? AND mahasiswa_id = ?', [scheduleId, mahasiswaId]);
    if (gradeRows.length > 0) {
      uts = gradeRows[0].nilai_uts || 0;
      uas = gradeRows[0].nilai_uas || 0;
      tugasOverride = gradeRows[0].tugas_override;
    }
    
    const finalTugas = tugasOverride !== null ? tugasOverride : avgTugas;
    const finalScore = Math.round((kehadiran * 0.1) + (finalTugas * 0.2) + (uts * 0.3) + (uas * 0.4));

    // Update MAX score in courseMap
    if (!courseMap.has(s.course_id)) {
      courseMap.set(s.course_id, {
        course_code: s.course_code,
        course_name: s.course_name,
        sks: s.sks,
        semester: s.semester,
        final_score: finalScore
      });
    } else {
      const existing = courseMap.get(s.course_id);
      if (finalScore > existing.final_score) {
        existing.final_score = finalScore;
      }
    }
  }

  const records = Array.from(courseMap.values());
  
  // Sort by semester then name
  records.sort((a, b) => {
    if (a.semester !== b.semester) return a.semester - b.semester;
    return a.course_name.localeCompare(b.course_name);
  });

  // Transform scores to letters
  const getLetterGrade = (score) => {
    if (score >= 80) return { letter: 'A', mutu: 4.0 };
    if (score >= 70) return { letter: 'B', mutu: 3.0 };
    if (score >= 60) return { letter: 'C', mutu: 2.0 };
    if (score >= 50) return { letter: 'D', mutu: 1.0 };
    return { letter: 'E', mutu: 0.0 };
  };

  let totalSks = 0;
  let totalMutu = 0;

  const items = records.map(r => {
    const grade = getLetterGrade(r.final_score);
    totalSks += r.sks;
    totalMutu += (r.sks * grade.mutu);
    return {
      ...r,
      letter: grade.letter,
      mutu: grade.mutu,
      total_mutu: (r.sks * grade.mutu).toFixed(2)
    };
  });

  const ipk = totalSks > 0 ? (totalMutu / totalSks).toFixed(2) : '0.00';

  return {
    items,
    totalSks,
    ipk
  };
};

// GET my transcript
router.get('/transkrip/me', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    const data = await getTranscriptData(req.userId);
    
    // Get identity
    const user = await get('SELECT nidn_nim, name, program_id FROM users WHERE id = ?', [req.userId]);
    const program = await get('SELECT nama_prodi FROM programs WHERE id = ?', [user.program_id]);
    
    res.json({ ...data, student: { ...user, prodi: program?.nama_prodi || '-' } });
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching transcript: ' + err.message });
  }
});

// GET transcript by admin
router.get('/transkrip/:mahasiswaId', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { mahasiswaId } = req.params;
    const data = await getTranscriptData(mahasiswaId);
    
    const user = await get('SELECT nidn_nim, name, program_id FROM users WHERE id = ?', [mahasiswaId]);
    const program = await get('SELECT nama_prodi FROM programs WHERE id = ?', [user.program_id]);
    
    res.json({ ...data, student: { ...user, prodi: program?.nama_prodi || '-' } });
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching transcript: ' + err.message });
  }
});

module.exports = router;
