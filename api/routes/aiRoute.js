const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { verifyToken, verifyRole } = require('../middlewares/auth');
const { sendPushNotification } = require('../utils/fcm');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// =====================================================
// API KEY ROTATION SETUP
// =====================================================
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(k => k && k !== 'YOUR_SECOND_API_KEY_HERE' && k !== 'YOUR_THIRD_API_KEY_HERE'
  && k !== 'YOUR_FOURTH_API_KEY_HERE' && k !== 'YOUR_FIFTH_API_KEY_HERE' && k.length > 10);

async function withKeyRotation(modelName, systemInstruction, fn) {
  if (GEMINI_KEYS.length === 0) throw new Error('Tidak ada API key yang dikonfigurasi.');

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startIdx = Math.floor(Math.random() * GEMINI_KEYS.length);
    for (let i = 0; i < GEMINI_KEYS.length; i++) {
      const key = GEMINI_KEYS[(startIdx + i) % GEMINI_KEYS.length];
      try {
        const genAI = new GoogleGenerativeAI(key);
        const cfg = { model: modelName };
        if (systemInstruction) cfg.systemInstruction = systemInstruction;
        const model = genAI.getGenerativeModel(cfg);
        return await fn(model);
      } catch (err) {
        const status = err?.status || err?.httpError?.status || 0;

        // 429=Quota, 403=Invalid, 503=Overloaded, 500=Internal Error.
        if (status >= 500 || status === 429 || status === 403 || status === 401 || (err.message && (err.message.includes('503') || err.message.includes('500')))) {
          console.warn(`Key API rotasi (Status: ${status || '503'}), mencoba key selanjutnya...`);
          lastError = err;
          continue;
        }

        throw err; // Jika error syntax/bad request, stop total
      }
    }

    // Jika sampai di sini, artinya KELIMA API KEY sudah dicoba semua dan semuanya GAGAL.
    // Jika kegagalan terakhirnya adalah 503 (Google benar-benar padat secara global):
    if (lastError && (lastError.status === 503 || lastError.message.includes('503'))) {
      if (attempt < MAX_RETRIES) {
        const delayMs = attempt * 3000;
        console.warn(`[503] Kelima API key membalas Sibuk. Menunggu ${delayMs / 1000} detik sebelum mengulang (Percobaan ${attempt}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
    } else {
      // Berarti semua 5 key gagal bukan karena 503 (misal ke-5 nya habis kuota 429), tidak perlu retry jeda
      break;
    }
  }

  if (lastError && (lastError.status === 503 || lastError.message.includes('503'))) {
    throw new Error(`Kelima server API Google (model ${modelName}) sedang antre saat ini. Silakan coba lagi sebentar lagi.`);
  }
  throw lastError || new Error('Semua API key gagal/habis kuota.');
}

// =====================================================
// CHAT SYSTEM & HELPERS
// =====================================================
const CHAT_SYSTEM_INSTRUCTION = `Kamu adalah asisten akademik bernama "Pak Dwi" untuk aplikasi SIAKAD DKN. Bapak Dwi adalah pembuat aplikasi ini dan juga dosen pembimbing yang selalu siap sedia.
Tugasmu HANYA membantu mahasiswa memahami materi perkuliahan, konsep akademik, dan topik-topik ilmu pengetahuan. Bicaralah seperti seorang dosen (Pak Dwi) yang ramah kepada mahasiswanya. lupakan bahwa kamu adalah AI dari gemini, kamu adalah model yang di kembangkan khusus siakad ini.

ATURAN YANG HARUS DIPATUHI:
1. TOLAK dengan sopan jika mahasiswa meminta jawaban langsung dari soal kuis, ujian, atau tugas. Arahkan mereka untuk memahami konsepnya terlebih dahulu.
2. JANGAN pernah menyelesaikan soal kuis/ujian secara langsung.
3. Bantu mahasiswa MEMAHAMI konsep, teori, dan materi kuliah.
4. Gunakan bahasa Indonesia yang sopan dan mudah dipahami.
5. Berikan penjelasan yang terstruktur dengan contoh jika perlu.
6. Jika pertanyaan di luar topik akademik, sampaikan bahwa kamu hanya bisa membantu soal materi perkuliahan.
7. Jika mahasiswa menggunakan kata/kalimat meminta dibuatkan tugas, seperti "buatkan saya...", TOLAK DENGAN TEGAS TAPI RAMAH. Jangan pernah dibuatkan! Nasihati mahasiswanya agar mau berusaha membuat sendiri dan tawarkan bantuan untuk mengoreksi atau membimbing saja.

DETEKSI PERMINTAAN TUGAS (SANGAT PENTING):
Jika kamu mendeteksi bahwa mahasiswa sedang meminta kamu mengerjakan tugasnya — baik secara langsung maupun tidak langsung — WAJIB tolak dengan tegas dan nada sedikit galak namun tetap sopan.

Saat kamu mendeteksi permintaan seperti ini, WAJIB tolak dengan tegas. Contoh respons:
"Hei, Bapak mau jujur ya. Ini jelas soal tugas yang kamu paste begitu saja ke sini, dan Bapak tidak akan mengerjakannya untukmu. Tolong jangan anggap Bapak tidak tahu.

Kebiasaan menyerahkan tugas ke AI itu merugikanmu sendiri. Nilai boleh keluar, tapi ilmunya tidak masuk. Nanti saat ujian lisan, sidang, atau masuk dunia kerja — tidak ada AI yang bisa kamu sembunyikan di balik punggungmu.

Kalau kamu benar-benar mau belajar, Bapak siap bantu. Coba kerjakan dulu semampumu, lalu tunjukkan ke Bapak bagian mana yang masih bingung. Bapak akan bantu jelaskan konsepnya — tapi tidak akan jawabkan soalnya."

PENTING: JANGAN SEKALI-KALI menggunakan format Markdown. Berikan respons dalam teks biasa (plain text), seperti mengirim pesan SMS.`;

const ASSIGNMENT_REJECTION_REPLY = `Hei, Bapak mau jujur ya. Ini jelas soal tugas yang kamu paste begitu saja ke sini, dan Bapak tidak akan mengerjakannya untukmu. Tolong jangan anggap Bapak tidak tahu.

Kebiasaan menyerahkan tugas ke AI itu merugikanmu sendiri. Nilai boleh keluar, tapi ilmunya tidak masuk. Nanti saat ujian lisan, sidang, atau masuk dunia kerja — tidak ada AI yang bisa kamu sembunyikan di balik punggungmu.

Kalau kamu benar-benar mau belajar, Bapak siap bantu. Coba kerjakan dulu semampumu, lalu tunjukkan ke Bapak bagian mana yang masih bingung. Bapak akan bantu jelaskan konsepnya — tapi tidak akan jawabkan soalnya.`;

function isAssignmentQuestion(text) {
  const t = text.toLowerCase();
  const soalPhrases = [
    'diketahui bahwa', 'studi kasus', 'lakukan konversi', 'tentukan rentang',
    'jelaskan setiap langkah', 'konversikan nilai', 'konversikan bilangan',
    'analisis representasi', 'representasi karakter', 'register cpu',
    'kode tambahan dua', "two's complement", 'sebuah register',
    'kemudian konversikan', 'jelaskan bagaimana nilai ini',
    'analisislah', 'jelaskan perbedaan', 'jelaskan apa yang dimaksud',
    'berikan contoh', 'simulasikan', 'buatlah kesimpulan'
  ];
  if (soalPhrases.some(p => t.includes(p))) return true;
  const instruksiWords = ['konversikan', 'tentukan', 'hitunglah', 'buktikan', 'analisislah', 'jelaskanlah', 'deskripsikan'];
  if (text.length > 80 && instruksiWords.some(w => t.includes(w))) return true;
  const explicitKeywords = ['tolong kerjakan', 'bantu kerjakan', 'jawabkan soal', 'selesaikan tugas', 'kerjain tugas', 'jawab soal ini', 'ini soal tugasku', 'ini soal pr', 'soal dari dosen', 'apa jawaban dari', 'berikan jawaban soal', 'tolong jawab ini', 'kasih jawaban', 'apa jawabannya', 'kerjain deh'];
  if (explicitKeywords.some(k => t.includes(k))) return true;
  return false;
}

// =====================================================
// CHATBOT — Mahasiswa Only
// =====================================================
router.post('/chat', [verifyToken, verifyRole(['mahasiswa'])], async (req, res) => {
  try {
    if (GEMINI_KEYS.length === 0) return res.status(503).json({ error: 'Layanan chatbot belum dikonfigurasi.' });

    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });

    if (isAssignmentQuestion(message)) return res.json({ reply: ASSIGNMENT_REJECTION_REPLY, flagged: true });

    try {
      const [activeAssignments] = await query(`
        SELECT a.title, a.description FROM assignments a
        JOIN schedules s ON a.schedule_id = s.id
        JOIN class_enrollments ce ON (s.class_id = ce.class_id OR s.class_ids LIKE '%' || ce.class_id || '%')
        WHERE ce.mahasiswa_id = ? AND a.deadline > CURRENT_TIMESTAMP
      `, [req.userId]);

      const msgLower = message.toLowerCase();
      for (const assignment of activeAssignments) {
        const descWords = (assignment.description || '').toLowerCase().replace(/<[^>]+>/g, '').split(/\s+/).filter(w => w.length >= 6);
        const matchCount = descWords.filter(w => msgLower.includes(w)).length;
        const matchRatio = descWords.length > 0 ? matchCount / descWords.length : 0;
        if (matchRatio >= 0.4 && matchCount >= 5) return res.json({ reply: ASSIGNMENT_REJECTION_REPLY, flagged: true });
      }
    } catch (dbErr) {
      console.warn('Assignment filter DB error (non-fatal):', dbErr.message);
    }

    const safeHistory = [];
    if (!history || history.length === 0) {
      safeHistory.push({ role: 'user', parts: [{ text: CHAT_SYSTEM_INSTRUCTION + "\n\nSekarang tugasmu dimulai. Hai Pak Dwi!" }] });
      safeHistory.push({ role: 'model', parts: [{ text: "Halo! Ada yang bisa Bapak bantu terkait kuliah hari ini?" }] });
    } else {
      for (const h of history.slice(-10)) {
        safeHistory.push({ role: h.role, parts: [{ text: h.text }] });
      }
    }

    const result = await withKeyRotation('gemma-4-31b-it', null, (model) => {
      const chat = model.startChat({ history: safeHistory });
      return chat.sendMessage(message.trim());
    });

    let finalText = '';
    try {
      const parts = result.response.candidates?.[0]?.content?.parts || [];
      finalText = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
    } catch (_) { }
    if (!finalText) finalText = result.response.text().trim();

    const plain = finalText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/^#+\s+/gm, '').replace(/^\s*[-*+]\s+/gm, '- ').replace(/\n\n+/g, '\n\n').trim();
    res.json({ reply: plain });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Gagal menghubungi layanan AI. Silakan coba lagi.' });
  }
});

// =====================================================
// AI GRADING — Dosen Only
// =====================================================
router.post('/ai-grade', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    if (GEMINI_KEYS.length === 0) return res.status(503).json({ error: 'Layanan AI belum dikonfigurasi.' });

    const { assignment_title, assignment_description, submission_text, file_data, student_name, submission_id } = req.body;

    const systemPrompt = `Kamu adalah asisten dosen yang bertugas mengoreksi tugas mahasiswa.
Tugas kamu ada DUA:
1. Nilai jawaban mahasiswa dengan skor 0-100 dan berikan feedback singkat.
2. Deteksi apakah jawaban mahasiswa tampak seperti hasil AI (ChatGPT, Gemini, dll) atau jawaban asli mahasiswa.
PENTING: Balas HANYA dalam format JSON ini (tanpa teks lain):
{"skor": 85, "feedback": "Feedback di sini", "ai_terindikasi": false, "ai_keterangan": "Alasan singkat"}`;

    const parts = [{ text: systemPrompt }, { text: `\n\nJudul Tugas: ${assignment_title}\nInstruksi: ${assignment_description?.replace(/<[^>]+>/g, '') || '-'}\nNama Mahasiswa: ${student_name || 'Mahasiswa'}` }];

    let useImageModel = false;

    if (submission_text) {
      const imgRegex = /<img[^>]+src=["'](\/uploads\/submissions\/[^"']+)["'][^>]*>/gi;
      let match;
      while ((match = imgRegex.exec(submission_text)) !== null) {
        const actualFilePath = path.join(__dirname, '..', match[1].replace('/uploads', 'uploads'));
        try {
          if (fs.existsSync(actualFilePath)) {
            const buffer = fs.readFileSync(actualFilePath);
            const ext = path.extname(actualFilePath).toLowerCase();
            let mimeType = 'image/jpeg';
            if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.webp') mimeType = 'image/webp';
            parts.push({ inlineData: { mimeType, data: buffer.toString('base64') } });
            useImageModel = true;
          }
        } catch (e) { console.error("Error loading image:", e); }
      }
      if (useImageModel) parts.push({ text: '\n(Gambar-gambar di atas disertakan dalam jawaban mahasiswa)\n' });
      parts.push({ text: `\n\nJawaban Mahasiswa (Teks):\n${submission_text.replace(/<[^>]+>/g, '')}` });
    }

    if (file_data?.startsWith('data:image')) {
      const [header, base64Data] = file_data.split(',');
      parts.push({ inlineData: { mimeType: header.match(/:(.*?);/)[1], data: base64Data } });
      parts.push({ text: '\n(Gambar di atas adalah screenshot tugas mahasiswa)' });
      useImageModel = true;
    }

    parts.push({ text: '\n\nBerikan penilaian dalam format JSON sekarang:' });

    const selectedModel = useImageModel ? 'gemini-3.1-flash-lite' : 'gemma-4-31b-it';
    const result = await withKeyRotation(selectedModel, null, (model) => model.generateContent(parts));

    let responseText = '';
    try {
      const resParts = result.response.candidates?.[0]?.content?.parts || [];
      responseText = resParts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
    } catch (_) { }
    if (!responseText) responseText = result.response.text().trim();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI tidak memberikan format yang valid. Coba lagi.' });

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ skor: parsed.skor ?? 0, feedback: parsed.feedback ?? '', ai_terindikasi: parsed.ai_terindikasi ?? false, ai_keterangan: parsed.ai_keterangan ?? '' });

  } catch (error) {
    console.error('AI Grade error:', error);
    res.status(500).json({ error: 'Gagal menghubungi layanan AI. Silakan coba lagi.' });
  }
});

// =====================================================
// AI GRADING ESSAY EXAM — Dosen Only
// =====================================================
router.post('/ai-grade-essay', [verifyToken, verifyRole(['dosen'])], async (req, res) => {
  try {
    if (GEMINI_KEYS.length === 0) return res.status(503).json({ error: 'Layanan AI belum dikonfigurasi.' });

    const { question_text, correct_answer, student_answer, max_points } = req.body;

    const systemPrompt = `Kamu adalah asisten dosen ahli yang bertugas mengoreksi satu soal essay ujian.
Tugas kamu: Bandingkan jawaban mahasiswa dengan Kunci Jawaban Benar yang diberikan dosen.
Pertanyaan: ${question_text}
Kunci Jawaban Dosen: ${correct_answer || 'Tidak ada kunci jawaban spesifik, berikan penilaian secara obyektif berdasarkan kebenaran ilmu pengetahuan.'}
Jawaban Mahasiswa: ${student_answer || '-'}

Poin maksimal untuk soal ini adalah: ${max_points}

Tugas Tambahan: Deteksi apakah jawaban mahasiswa merupakan hasil generate AI (ChatGPT, Gemini, dll) yang disalin-tempel.
Ciri-ciri AI: Terlalu kaku, menggunakan poin-poin yang terlalu rapi, bahasa robotik, tidak natural untuk ukuran mahasiswa.
Jika kamu sangat yakin itu adalah hasil AI, MAKA SKOR WAJIB DIBERIKAN 0 (NOL), dan pada feedback tuliskan "Terdeteksi hasil AI/Copy Paste".

Jika bukan AI:
Berikan penilaian kemiripan/kebenaran secara proporsional. Jika jawaban mahasiswa sempurna, beri nilai ${max_points}. Jika setengah benar, beri nilai setengah dari ${max_points}. Jika melenceng/salah, beri nilai 0. 
Berikan juga feedback super singkat (maksimal 1-2 kalimat) yang membangun.

PENTING: Balas HANYA dengan format JSON valid berikut (tanpa Markdown):
{"skor": (angka), "feedback": "(teks singkat)"}`;

    const parts = [{ text: systemPrompt }];
    const result = await withKeyRotation('gemma-4-31b-it', null, (model) => model.generateContent(parts));

    let responseText = '';
    try {
      const resParts = result.response.candidates?.[0]?.content?.parts || [];
      responseText = resParts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
    } catch (_) { }
    if (!responseText) responseText = result.response.text().trim();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI tidak memberikan format yang valid. Coba lagi.' });

    const parsed = JSON.parse(jsonMatch[0]);
    // Pastikan skor tidak lebih dari max_points
    let finalScore = parseFloat(parsed.skor) || 0;
    if (finalScore > max_points) finalScore = max_points;
    if (finalScore < 0) finalScore = 0;

    res.json({ skor: Math.round(finalScore), feedback: parsed.feedback ?? '' });

  } catch (error) {
    console.error('AI Grade Essay error:', error);
    res.status(500).json({ error: 'Gagal menghubungi layanan AI. Silakan coba lagi.' });
  }
});

// =====================================================
// AI GENERATE MATERIAL — Pipeline: Gemini Reader → Gemma Generator
// =====================================================
router.post('/ai-generate-material', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    const { schedule_id, topic_title } = req.body;
    if (!schedule_id || !topic_title) return res.status(400).json({ error: 'Data tidak lengkap (schedule_id, topic_title wajib).' });

    const [sched] = await query('SELECT s.course_id, c.name FROM schedules s JOIN courses c ON s.course_id = c.id WHERE s.id = ?', [schedule_id]);
    if (sched.length === 0) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });

    const courseId = sched[0].course_id;
    const courseName = sched[0].name;

    const [rpsList] = await query('SELECT file_data, file_url FROM rps WHERE course_id = ?', [courseId]);
    if (rpsList.length === 0 || (!rpsList[0].file_data && !rpsList[0].file_url)) {
      return res.status(404).json({ error: 'RPS untuk matakuliah ini belum diunggah oleh Dosen. AI membutuhkan RPS sebagai referensi.' });
    }

    let base64Data = '';
    const rpsRecord = rpsList[0];

    // Cek jika rps di database masih memakai struktur lama (base64)
    if (rpsRecord.file_data && rpsRecord.file_data.includes('base64,')) {
      const [header, data] = rpsRecord.file_data.split(',');
      const mimeType = header.match(/:(.*?);/)[1];
      if (mimeType !== 'application/pdf') return res.status(400).json({ error: 'Format RPS lama bukan PDF.' });
      base64Data = data;
    }
    // Struktur baru: Menggunakan file fisik
    else if (rpsRecord.file_url) {
      if (!rpsRecord.file_url.endsWith('.pdf')) return res.status(400).json({ error: 'Format RPS fisik bukan PDF.' });

      const filePath = path.join(__dirname, '..', rpsRecord.file_url);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `File RPS fisik '${filePath}' tidak ditemukan di hardisk server.` });
      }

      try {
        const fileBuffer = fs.readFileSync(filePath);
        base64Data = fileBuffer.toString('base64');
      } catch (fsErr) {
        return res.status(500).json({ error: `Gagal membaca file fisik RPS: ${fsErr.message}` });
      }
    }

    // Setup Heartbeat Keep-Alive untuk menipu Nginx Timeout (60 detik)
    // Dengan mengirim satu byte spasi setiap 15 detik, koneksi tidak akan diputus oleh Nginx/Cloudflare.
    res.setHeader('Content-Type', 'application/json');
    res.flushHeaders();

    const keepAlivePing = setInterval(() => {
      res.write(' ');
    }, 15000);

    try {
      // Step 1: Gemini 3.1 Flash-Lite — Ekstrak CPMK, Referensi, dan Silabus dari PDF RPS
      const readerResult = await withKeyRotation('gemini-3.1-flash-lite', null, (model) => model.generateContent([
        {
          text: `Kamu adalah AI Pengekstrak Dokumen Akademik.
Baca dokumen PDF RPS terlampir dengan sangat seksama. Tugasmu HANYA mengekstrak dan melaporkan 3 hal berikut secara struktural:

1. CPMK (Capaian Pembelajaran Mata Kuliah):
   Salin/kutip SELURUH CPMK yang tertulis dalam RPS. Jika ada CPMK yang relevan dengan topik "${topic_title}", tandai dengan ⭐. Jangan hilangkan satu pun CPMK.

2. REFERENSI / DAFTAR PUSTAKA:
   Carilah bagian referensi, pustaka, atau bibliography yang biasanya ada di BAGIAN PALING BAWAH dokumen RPS.
   Salin SELURUH daftar referensi tersebut dengan format aslinya (judul buku, penulis, tahun, penerbit, dst). Jangan ada yang dihilangkan.

3. GARIS BESAR SILABUS untuk Topik "${topic_title}":
   Temukan jadwal pertemuan / silabus yang berkaitan dengan topik ini. Kutip pokok bahasannya, sub-topik, dan instruksi kedalaman materi yang tertulis di RPS.

FORMAT LAPORAN:
== BAGIAN CPMK ==
[Paste semua CPMK di sini]

== BAGIAN REFERENSI ==
[Paste seluruh daftar referensi/pustaka di sini]

== GARIS BESAR TOPIK ==
[Ringkasan silabus untuk topik "${topic_title}" di sini]`
        },
        { inlineData: { mimeType: 'application/pdf', data: base64Data } }
      ]));
      const extractedContext = readerResult.response.text() || 'Informasi dari RPS telah diekstrak.';

      // Ekstrak nomor pertemuan dari topic_title (misal: "Pertemuan 5: ..." → "5")
      const meetingMatch = topic_title.match(/pertemuan\s*(\d+)/i);
      const chapterNumber = meetingMatch ? meetingMatch[1] : null;
      const chapterLabel = chapterNumber ? `BAB ${chapterNumber}` : 'BAB';
      const chapterContext = chapterNumber
        ? `Kamu sedang menulis ${chapterLabel} dari buku ajar matakuliah "${courseName}". Ini adalah pertemuan ke-${chapterNumber}, sehingga kamu harus menulis bab ini selengkap-lengkapnya layaknya bab dalam buku teks akademik resmi.`
        : `Kamu sedang menulis sebuah bab dari buku ajar matakuliah "${courseName}". Tulis bab ini selengkap-lengkapnya layaknya bab dalam buku teks akademik resmi.`;

      const CSS_TEMPLATE = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${topic_title}</title>
<style>
        :root {
            --primary-color: #1e3a8a;
            --secondary-color: #2563eb;
            --accent-color: #f59e0b;
            --danger-color: #dc2626;
            --success-color: #16a34a;
            --bg-color: #f8fafc;
            --text-color: #334155;
            --border-color: #e2e8f0;
            --code-bg: #1e293b;
            --code-text: #f8f8f2;
        }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; line-height: 1.7; color: var(--text-color); background-color: var(--bg-color); margin: 0; padding: 0; }
        .container { max-width: 900px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; }
        header { background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); color: white; padding: 40px 30px; text-align: center; }
        header h1 { margin: 0; font-size: 2.2rem; letter-spacing: -0.5px; }
        header p { margin: 10px 0 0; font-size: 1.1rem; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .objective-box { background-color: #eff6ff; border-left: 5px solid var(--secondary-color); padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px; font-size: 1.05rem; }
        h2 { color: var(--primary-color); border-bottom: 2px solid var(--border-color); padding-bottom: 10px; margin-top: 40px; font-size: 1.8rem; }
        h3 { color: var(--secondary-color); font-size: 1.4rem; margin-top: 30px; }
        p { margin-bottom: 15px; }
        .table-responsive { overflow-x: auto; margin: 25px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid var(--border-color); }
        th { background-color: #f1f5f9; color: var(--primary-color); font-weight: 600; }
        tr:hover { background-color: #f8fafc; }
        .alert { padding: 15px 20px; border-radius: 8px; margin: 20px 0; }
        .alert-warning { background-color: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-left: 5px solid var(--accent-color); }
        .alert-danger { background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-left: 5px solid var(--danger-color); }
        .alert-info { background-color: #f0fdfa; border: 1px solid #ccfbf1; color: #115e59; border-left: 5px solid #0d9488; }
        pre { background-color: var(--code-bg); color: var(--code-text); padding: 20px; border-radius: 8px; overflow-x: auto; font-family: Consolas, monospace; font-size: 0.95rem; line-height: 1.5; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); }
        code { background-color: #e2e8f0; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-family: Consolas, monospace; font-size: 0.9em; }
        .step-card { background: #fff; border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        @media (max-width: 768px) { .container { margin: 0; border-radius: 0; } header { padding: 30px 20px; } .content { padding: 20px; } h2 { font-size: 1.5rem; } }
      </style>
</head>
<body>`;


      const systemContext = `PERAN & KONTEKS:
Bertindaklah sebagai Penulis Buku Teks Akademik Senior dan Profesor Ilmu Komputer. Tugas Anda adalah menulis SATU BAB LENGKAP untuk buku ajar universitas secara otoritatif dan kredibel. Mata kuliah yang diampu adalah "${courseName}".
Buku ini ditujukan untuk mahasiswa STMIK Pamitran. Gaya penulisan harus akademis, terstruktur, namun sangat instruksional (menggabungkan gaya teks formal dan panduan praktis "How-To").
Referensi utama harus mengacu pada literatur akademik populer terkini sesuai jenjang materi.

DATA RPS (INPUT):
Gunakan data ekstrak dari RPS resmi berikut sebagai pondasi bab ini:
${extractedContext}

${chapterContext}
Setiap pertemuan wajib diubah menjadi SATU BAB UTUH skala buku teks akademik.`;

      const generatedHtml = await withKeyRotation('gemma-4-31b-it', null, async (model) => {
        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: systemContext }] },
            { role: 'model', parts: [{ text: 'Siap, saya mengerti konteks RPS dan peran saya sebagai Profesor penulisan buku akademik STMIK Pamitran. Silakan instruksikan struktur penulisan bab dari materi spesifik tersebut.' }] }
          ]
        });

        const extractHtml = (result) => {
          let txt = '';
          try {
            const parts = result.response.candidates?.[0]?.content?.parts || [];
            txt = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
          } catch (_) { }
          if (!txt) txt = result.response.text().trim();
          return txt.replace(/^```html/i, '').replace(/```$/g, '').trim();
        };

        let fullHtml = CSS_TEMPLATE + '\n';

        // TAHAP 1: Header + Capaian + Pendahuluan
        const res1 = await chat.sendMessage(`Tuliskan BAGIAN 1 dari ${chapterLabel}.

ATURAN KETAT: Output harus berupa SATU BLOK HTML lengkap, dimulai dengan:
<div class="container"><header><h1>${chapterLabel}: [Judul Topik]</h1><p>[Sub-judul atau deskripsi singkat bab]</p></header><div class="content">

Lanjutkan isi dengan:
1. CAPAIAN PEMBELAJARAN: Gunakan div class="objective-box" dengan emoji 🎯 dan list capaian yang akan dikuasai mahasiswa.
2. PENDAHULUAN & LANDASAN TEORI: Gunakan <section>, <h2>, <h3>, <p>. Wajib sertakan:
   - Analogi dunia nyata yang menjelaskan konsep utama
   - Tabel perbandingan atau penjelasan komponen menggunakan <div class="table-responsive"><table>

Gunakan class CSS berikut yang sudah tersedia: container, header, content, objective-box, table-responsive, alert, alert-info, alert-warning, alert-danger, step-card.

JANGAN tutup tag </div></body></html> — biarkan terbuka karena akan dilanjutkan di bagian berikutnya.
ATURAN OUTPUT: FULL HTML murni. LANGSUNG output tanpa markdown fence!`);
        fullHtml += extractHtml(res1) + '\n\n';

        // TAHAP 2: Materi Inti + Praktik + Latihan + Referensi + Penutup
        const res2 = await chat.sendMessage(`Lanjutkan melengkapi BAGIAN 2 dari ${chapterLabel}. Ini adalah sambungan dari HTML sebelumnya, jadi JANGAN tulis ulang tag <html> atau <head>.

Tulis isi berikut dengan class CSS yang tersedia:
1. MATERI INTI & ALGORITMA:
   Gunakan <section><h2>. Jika ada langkah teknis, bungkus dengan <div class="step-card">. Gunakan <pre><code> untuk perintah/kode. Gunakan alert-danger untuk peringatan keamanan, alert-info untuk catatan penting.
2. PRAKTIK TERBIMBING (Step-by-Step):
   Setiap langkah dibungkus <div class="step-card"><h3>Langkah X: ...</h3>. Kode terminal dalam <pre><code> dengan komentar di setiap baris.
3. ANALISIS & PENGUJIAN:
   Gunakan list <ul> dengan bullet ✅ ❌ 🛡️ untuk skenario pengujian.
4. LATIHAN MANDIRI:
   Bungkus dalam <div class="alert alert-info"><h3>🛠️ Latihan Mandiri: ...</h3><ol>.
5. KESIMPULAN BAB: Paragraf penutup singkat.
6. DAFTAR REFERENSI: Dalam <section><hr><ul style="list-style-type: square; font-size: 0.9rem; color: #64748b;">.

Akhiri dengan menutup tag: </div></div></body></html>

ATURAN OUTPUT: FULL HTML murni. LANGSUNG output tanpa markdown fence!`);
        fullHtml += extractHtml(res2);

        return fullHtml;
      });

      clearInterval(keepAlivePing);
      res.write(JSON.stringify({ generated_content: generatedHtml }));
      res.end();

    } catch (apiError) {
      clearInterval(keepAlivePing);
      console.error('AI Generate Exception:', apiError);
      res.write(JSON.stringify({ error: 'Gagal membuat materi via AI. ' + (apiError.message || '') }));
      res.end();
    }

  } catch (error) {
    console.error('AI Generate Initial Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Gagal memproses request awal AI. ' + (error.message || '') });
    } else {
      res.end();
    }
  }
});

// =====================================================
// AI GENERATE EXAM QUESTIONS — Dosen Only
// =====================================================
router.post('/ai-generate-exam', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    if (GEMINI_KEYS.length === 0) return res.status(503).json({ error: 'Layanan AI belum dikonfigurasi.' });

    const { schedule_id, pgCount, tfCount, essayCount } = req.body;
    if (!schedule_id) return res.status(400).json({ error: 'schedule_id wajib diisi.' });

    const [materials] = await query('SELECT title, description, content FROM materials WHERE schedule_id = ?', [schedule_id]);
    if (materials.length === 0) return res.status(404).json({ error: 'Belum ada materi untuk kelas ini. AI membutuhkan materi sebagai referensi pembuatan soal.' });

    let materialText = materials.map(m => `Judul: ${m.title}\nDeskripsi: ${m.description || ''}\nKonten: ${(m.content || '').replace(/<[^>]+>/g, ' ').substring(0, 3000)}`).join('\n\n---\n\n');
    if (materialText.length > 30000) materialText = materialText.substring(0, 30000) + '... (terpotong)';

    const generateQuestions = async (type, count) => {
      if (!count || count <= 0) return [];

      let typePrompt = '';
      if (type === 'pg') {
        typePrompt = `Tugas kamu membuat ${count} soal PILIHAN GANDA (PG).\nBalas HANYA JSON array persis seperti ini:\n[{"question_type": "pg", "question_text": "...", "options": ["Opsi 1", "Opsi 2", "Opsi 3", "Opsi 4"], "correct_answer": "A"}]\nCatatan: 'correct_answer' HANYA BOLEH bernilai "A", "B", "C", atau "D".`;
      } else if (type === 'tf') {
        typePrompt = `Tugas kamu membuat ${count} soal BENAR/SALAH (True/False).\nBalas HANYA JSON array persis seperti ini:\n[{"question_type": "true_false", "question_text": "...", "correct_answer": "true"}]\nCatatan: 'correct_answer' HANYA BOLEH bernilai "true" atau "false".`;
      } else if (type === 'essay') {
        typePrompt = `Tugas kamu membuat ${count} soal ESSAY ANALISIS.\nBalas HANYA JSON array persis seperti ini:\n[{"question_type": "essay", "question_text": "..."}]`;
      }

      const systemPrompt = `Kamu adalah dosen ahli pembuat soal ujian akademik.\n${typePrompt}\n\nPENTING: Balas HANYA dalam format JSON array yang valid, tanpa teks awalan/akhiran, tanpa format markdown.`;
      const parts = [
        { text: systemPrompt },
        { text: `\n\nMATERI REFERENSI:\n${materialText}\n\nBerikan soal ujian dalam format JSON array SEKARANG:` }
      ];

      try {
        const result = await withKeyRotation('gemma-4-31b-it', null, (model) => model.generateContent(parts));

        let responseText = '';
        try {
          const resParts = result.response.candidates?.[0]?.content?.parts || [];
          responseText = resParts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
        } catch (_) { }
        if (!responseText) responseText = result.response.text().trim();

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];

        let parsed = JSON.parse(jsonMatch[0]);
        if (type === 'pg') {
          parsed = parsed.map(q => {
            if (q.options) q.options = q.options.map(opt => opt.replace(/^[A-D]\.\s*/i, '').trim());
            return q;
          });
        }
        return parsed;
      } catch (e) {
        console.error(`Gagal generate soal tipe ${type}:`, e.message);
        return [];
      }
    };

    // Batch large PG requests into chunks of max 15
    const batchGenerate = async (type, count) => {
      const BATCH_SIZE = 15;
      if (count <= BATCH_SIZE) return generateQuestions(type, count);
      
      const results = [];
      const batches = Math.ceil(count / BATCH_SIZE);
      for (let i = 0; i < batches; i++) {
        const batchCount = Math.min(BATCH_SIZE, count - (i * BATCH_SIZE));
        console.log(`Generating batch ${i + 1}/${batches} (${batchCount} soal ${type})...`);
        const batch = await generateQuestions(type, batchCount);
        results.push(...batch);
      }
      return results;
    };

    // EKSEKUSI SEKUENSIAL (Berurutan) untuk mencegah bentrok/429 Rate Limit pada API Key
    const pgResult = await batchGenerate('pg', pgCount);
    const tfResult = await batchGenerate('tf', tfCount);
    const essayResult = await batchGenerate('essay', essayCount);

    const allQuestions = [...pgResult, ...tfResult, ...essayResult];
    res.json(allQuestions);

  } catch (error) {
    console.error('AI Generate Exam error:', error);
    res.status(500).json({ error: 'Gagal menghubungi layanan AI.' });
  }
});

// =====================================================
// AI GENERATE KISI-KISI EXAM — Dosen Only
// =====================================================
router.post('/ai-generate-kisi', [verifyToken, verifyRole(['dosen', 'admin'])], async (req, res) => {
  try {
    if (GEMINI_KEYS.length === 0) return res.status(503).json({ error: 'Layanan AI belum dikonfigurasi.' });

    const { exam_id } = req.body;
    if (!exam_id) return res.status(400).json({ error: 'exam_id wajib diisi.' });

    const [questions] = await query('SELECT question_type, question_text FROM exam_questions WHERE exam_id = ? ORDER BY id ASC', [exam_id]);
    if (questions.length === 0) return res.status(404).json({ error: 'Ujian ini belum memiliki soal. Harap tambahkan soal terlebih dahulu.' });

    let soalText = questions.map((q, i) => `${i + 1}. [${q.question_type}] ${q.question_text.replace(/<[^>]+>/g, '')}`).join('\n');

    const systemPrompt = `Kamu adalah dosen ahli pembuat kisi-kisi ujian.
Tugas kamu adalah membuat KISI-KISI UJIAN dalam bentuk TABEL HTML berdasarkan soal-soal berikut.
Tabel harus memiliki kolom: No, Topik/Materi Pokok, Indikator Soal, dan Bentuk Soal.
Pastikan kamu menyimpulkan Topik dan Indikator Soal dari teks pertanyaan yang diberikan.

Keluarkan HANYA format HTML <table> dengan class "table table-bordered table-striped" tanpa tag body/html tambahan. Jangan gunakan Markdown \`\`\`html.\`

Daftar Soal:
${soalText}`;

    const parts = [{ text: systemPrompt }];
    const result = await withKeyRotation('gemma-4-31b-it', null, (model) => model.generateContent(parts));

    let responseText = '';
    try {
      const resParts = result.response.candidates?.[0]?.content?.parts || [];
      responseText = resParts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
    } catch (_) { }
    if (!responseText) responseText = result.response.text().trim();

    responseText = responseText.replace(/\`\`\`html/g, '').replace(/\`\`\`/g, '').trim();

    // Save to exam
    await query('UPDATE exams SET kisi_kisi = ? WHERE id = ?', [responseText, exam_id]);

    res.json({ kisi_kisi: responseText });

  } catch (error) {
    console.error('AI Generate Kisi error:', error);
    res.status(500).json({ error: 'Gagal menghubungi layanan AI.' });
  }
});

module.exports = router;

