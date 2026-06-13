const express = require('express');
const router = express.Router();
const { query, run, get } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inisialisasi API Key dari rotasi di aiRoute (atau ambil dari env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY);

// ── 1. GET Program Study Pillars ──
router.get('/pillars', verifyToken, async (req, res) => {
  try {
    const [pillars] = await query(
      'SELECT * FROM program_study_pillars WHERE tenant_id = ?', 
      [req.tenant_id]
    );
    res.json(pillars);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil data pilar.' });
  }
});

// ── 2. SAVE/UPDATE Pillars ──
router.post('/pillars', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { study_program_name, visi, misi } = req.body;
    
    // Cek apakah tenant sudah punya pilar default (kalau single prodi)
    const [existing] = await query('SELECT id FROM program_study_pillars WHERE tenant_id = ? LIMIT 1', [req.tenant_id]);
    
    let pillarId;
    if (existing.length > 0) {
      await run(
        'UPDATE program_study_pillars SET study_program_name = ?, visi = ?, misi = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [study_program_name, visi, misi, existing[0].id]
      );
      pillarId = existing[0].id;
    } else {
      const resInsert = await run(
        'INSERT INTO program_study_pillars (tenant_id, study_program_name, visi, misi) VALUES (?, ?, ?, ?) RETURNING id',
        [req.tenant_id, study_program_name, visi, misi]
      );
      pillarId = resInsert.id;
    }

    res.json({ message: 'Pilar Akademik berhasil disimpan.', pillarId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal menyimpan pilar akademik.' });
  }
});

// ── 3. GET CPL & CPMK by Pillar ──
router.get('/pillars/:pillarId/points', verifyToken, async (req, res) => {
  try {
    const { pillarId } = req.params;
    const [cpl] = await query('SELECT * FROM cpl_points WHERE pillar_id = ?', [pillarId]);
    const [cpmk] = await query('SELECT * FROM cpmk_points WHERE pillar_id = ?', [pillarId]);
    res.json({ cpl, cpmk });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil data CPL/CPMK.' });
  }
});

// ── 4. ADD CPL/CPMK ──
router.post('/pillars/:pillarId/points', [verifyToken, verifyRole(['admin'])], async (req, res) => {
  try {
    const { pillarId } = req.params;
    const { type, code, description } = req.body; // type: 'cpl' atau 'cpmk'
    
    if (type === 'cpl') {
      await run('INSERT INTO cpl_points (pillar_id, code, description) VALUES (?, ?, ?)', [pillarId, code, description]);
    } else {
      await run('INSERT INTO cpmk_points (pillar_id, code, description) VALUES (?, ?, ?)', [pillarId, code, description]);
    }
    
    res.json({ message: `${type.toUpperCase()} berhasil ditambahkan.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal menambah poin.' });
  }
});

// ── 5. AI GENERATE RPS ──
router.post('/generate-ai', [verifyToken, verifyRole(['admin', 'dosen'])], async (req, res) => {
  try {
    const { course_name, course_description, credits, semester, selected_cpl_ids, selected_cpmk_ids } = req.body;

    // 1. Cek Kuota AI (SaaS Limit)
    const [tenantRows] = await query('SELECT ai_points FROM tenants WHERE id = ?', [req.tenant_id]);
    if (tenantRows.length === 0) return res.status(404).json({ error: 'Tenant tidak ditemukan' });
    
    const currentPoints = tenantRows[0].ai_points;
    if (currentPoints <= 0) {
      return res.status(403).json({ error: 'Maaf, Kuota/Poin AI kampus Anda sudah habis. Silakan hubungi admin kampus Anda untuk melakukan Top-Up.' });
    }

    // Ambil tenant pilar (Visi Misi)
    const [pillars] = await query('SELECT * FROM program_study_pillars WHERE tenant_id = ? LIMIT 1', [req.tenant_id]);
    if (pillars.length === 0) {
      return res.status(400).json({ error: 'Admin belum mengatur Visi & Misi Program Studi untuk tenant ini.' });
    }
    const pillar = pillars[0];

    // Ambil string deskripsi dari CPL
    let cplText = '';
    if (selected_cpl_ids && selected_cpl_ids.length > 0) {
      const placeholders = selected_cpl_ids.map(() => '?').join(',');
      const [cplRows] = await query(`SELECT code, description FROM cpl_points WHERE id IN (${placeholders})`, selected_cpl_ids);
      cplText = cplRows.map(r => `- ${r.code}: ${r.description}`).join('\n');
    }

    // Ambil string deskripsi dari CPMK
    let cpmkText = '';
    if (selected_cpmk_ids && selected_cpmk_ids.length > 0) {
      const placeholders = selected_cpmk_ids.map(() => '?').join(',');
      const [cpmkRows] = await query(`SELECT code, description FROM cpmk_points WHERE id IN (${placeholders})`, selected_cpmk_ids);
      cpmkText = cpmkRows.map(r => `- ${r.code}: ${r.description}`).join('\n');
    }

    const prompt = `Anda adalah Asisten Akademik Ahli untuk menyusun Rencana Pembelajaran Semester (RPS).
Tugas Anda adalah membuat draft RPS lengkap (14 pertemuan) berformat HTML yang indah dan rapi untuk mata kuliah berikut.

INFORMASI MATA KULIAH:
- Nama Mata Kuliah: ${course_name}
- Deskripsi Singkat: ${course_description}
- Bobot SKS: ${credits}
- Semester: ${semester}

LANDASAN AKADEMIK (WAJIB TERINTEGRASI):
- Visi Program Studi: ${pillar.visi}
- Misi Program Studi: ${pillar.misi}

CAPAIAN PEMBELAJARAN LULUSAN (CPL) YANG DIBEBANKAN PADA MK INI:
${cplText || '- (Belum ada CPL dipilih)'}

CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK):
${cpmkText || '- (Belum ada CPMK dipilih)'}

INSTRUKSI OUTPUT:
Keluarkan output STRICTLY dalam format HTML yang langsung bisa dirender (tanpa tag \`\`\`html atau markdown). Gunakan tag <h1>, <h2>, <table>, <tr>, <th>, <td>, <ul>, <li>.
Struktur RPS:
1. Identitas Mata Kuliah
2. Deskripsi Singkat Mata Kuliah
3. Integrasi Visi, Misi, CPL, dan CPMK (jelaskan secara singkat bagaimana MK ini mendukung Visi Misi Prodi)
4. Rencana Pembelajaran per Pertemuan (Tabel 14 Pertemuan, berisi: Minggu Ke-, Sub-CPMK, Bahan Kajian/Materi, Metode, Alokasi Waktu, Kriteria Penilaian).
5. Referensi / Daftar Pustaka (Berikan 3-5 referensi buku standar secara logis untuk MK ini).
Pastikan tabelnya memiliki border collapse dan padding yang rapi (berikan inline style sederhana: style="border-collapse: collapse; width: 100%;" dan style="border: 1px solid #ccc; padding: 8px;").
`;

    // Kita gunakan gemini-1.5-flash-latest sebagai standar cepat, karena gemma mungkin belum disupport via SDK yang sama tanpa endpoint khusus.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(prompt);
    let htmlContent = result.response.text();
    
    // Potong 1 poin AI karena sukses
    await run('UPDATE tenants SET ai_points = ai_points - 1 WHERE id = ?', [req.tenant_id]);
    
    // Bersihkan markdown markdown artifacts jika LLM masih nakal membungkus dengan ```html
    htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();

    res.json({ html: htmlContent });
  } catch (error) {
    console.error('AI RPS Gen Error:', error);
    res.status(500).json({ error: 'Gagal membuat RPS dengan AI.' });
  }
});

module.exports = router;
