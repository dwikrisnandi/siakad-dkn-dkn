const express = require('express');
const router = express.Router();
const { get, all } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');

// Complex Query for Cumulative Transcript
// Logic: If retaken, get max final_score
const getTranscriptData = async (mahasiswaId) => {
  const sql = `
    SELECT 
      c.code as course_code, 
      c.name as course_name, 
      s.sks, 
      c.semester,
      MAX(cg.final_score) as final_score
    FROM course_grades cg
    JOIN schedules s ON cg.schedule_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE cg.mahasiswa_id = ? AND cg.final_score IS NOT NULL
    GROUP BY c.id
    ORDER BY c.semester ASC, c.name ASC
  `;
  const records = await all(sql, [mahasiswaId]);

  // Transform scores to letters
  const getLetterGrade = (score) => {
    if (score >= 85) return { letter: 'A', mutu: 4.0 };
    if (score >= 75) return { letter: 'B', mutu: 3.0 };
    if (score >= 65) return { letter: 'C', mutu: 2.0 };
    if (score >= 55) return { letter: 'D', mutu: 1.0 };
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
    const data = await getTranscriptData(req.user.id);
    
    // Get identity
    const user = await get('SELECT nidn_nim, name, program_id FROM users WHERE id = ?', [req.user.id]);
    const program = await get('SELECT nama_prodi FROM programs WHERE id = ?', [user.program_id]);
    
    res.json({ ...data, student: { ...user, prodi: program?.nama_prodi || '-' } });
  } catch (err) {
    res.status(500).json({ error: 'Failed fetching transcript' });
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
    res.status(500).json({ error: 'Failed fetching transcript' });
  }
});

module.exports = router;
