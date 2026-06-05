/**
 * SIAKAD DKN - Backend Server Entry Point
 * ========================================
 * Arsitektur modular. Setiap domain fitur dipisahkan ke file-nya sendiri:
 *   api/middlewares/auth.js          -> JWT & Role checker
 *   api/routes/authRoute.js          -> POST /auth/login, GET /auth/me
 *   api/routes/adminRoute.js         -> GET /backup, GET /khs, CRUD /users
 *   api/routes/academicRoute.js      -> CRUD /courses, /classes, /enrollments
 *   api/routes/dosenRoute.js         -> CRUD /schedules, /rps, /materials
 *   api/routes/portalRoute.js        -> /assignments, /submissions, /grades, /attendance, /notifications
 *   api/routes/aiRoute.js            -> POST /chat, /ai-grade, /ai-generate-material
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { run } = require('./db');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// ── COMPRESSION ─────────────────────────────────────────────────────────────
// Mengkompres response HTTP (JSON/Teks) hingga 70% agar hemat bandwidth internet
app.use(compression());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://siakad.arthavirddhisampada.online',
    'http://localhost:5173',
    'http://localhost:7542'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── STATIC FILES ─────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, 'uploads', 'submissions');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── MULTER (Image Upload for Submissions) ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `img_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

const { verifyToken } = require('./middlewares/auth');

app.post('/api/upload-image', verifyToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diupload' });
  res.json({ url: `/uploads/submissions/${req.file.filename}` });
});

// ── DATABASE MIGRATIONS (Safe: ignore if already exists) ─────────────────────
run("ALTER TABLE materials ADD COLUMN content TEXT").catch(() => {});
run("ALTER TABLE materials ADD COLUMN content_type TEXT DEFAULT 'link'").catch(() => {});
run("ALTER TABLE rps ADD COLUMN file_data TEXT").catch(() => {});
run("ALTER TABLE rps ADD COLUMN file_url TEXT").catch(() => {});
run("ALTER TABLE submissions ADD COLUMN file_data TEXT").catch(() => {});
run(`CREATE TABLE IF NOT EXISTS rps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL, title TEXT NOT NULL,
  file_url TEXT, file_data TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).catch(() => {});
run(`CREATE TABLE IF NOT EXISTS course_grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER, mahasiswa_id INTEGER,
  nilai_uts INTEGER DEFAULT 0, nilai_uas INTEGER DEFAULT 0,
  UNIQUE(schedule_id, mahasiswa_id)
)`).catch(() => {});
run(`CREATE TABLE IF NOT EXISTS attendance_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL, meeting_number INTEGER NOT NULL,
  note TEXT, UNIQUE(schedule_id, meeting_number)
)`).catch(() => {});

run("ALTER TABLE attendance_notes ADD COLUMN catatan TEXT").catch(() => {});
run("ALTER TABLE users ADD COLUMN fcm_token TEXT").catch(() => {});
run(`CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  last_used_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta'),
  UNIQUE(user_id, token)
)`).catch(() => {});

// -- PHASE 1: MASTER DATA & KEUANGAN --
run("ALTER TABLE users ADD COLUMN program_id INTEGER").catch(() => {});
run("ALTER TABLE courses ADD COLUMN curriculum_id INTEGER").catch(() => {});

run(`CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_prodi TEXT NOT NULL,
  fakultas TEXT NOT NULL,
  kode_prodi TEXT NOT NULL
)`).catch(() => {});

run(`CREATE TABLE IF NOT EXISTS curriculums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  tahun_berlaku TEXT NOT NULL,
  status_aktif BOOLEAN DEFAULT true
)`).catch(() => {});

run(`CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mahasiswa_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  nominal INTEGER NOT NULL,
  status_lunas BOOLEAN DEFAULT false,
  tanggal_bayar TIMESTAMP
)`).catch(() => {});

// -- PHASE 2: KRS & DPA --
run("ALTER TABLE users ADD COLUMN dpa_id INTEGER").catch(() => {});

run(`CREATE TABLE IF NOT EXISTS krs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mahasiswa_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  status_approval TEXT DEFAULT 'Pending' -- 'Pending', 'Approved', 'Rejected'
)`).catch(() => {});

run(`CREATE TABLE IF NOT EXISTS krs_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  krs_id INTEGER NOT NULL,
  schedule_id INTEGER NOT NULL
)`).catch(() => {});

// ── PHASE 3: PERFORMANCE INDEXING ──
run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)').catch(()=>{});
run('CREATE INDEX IF NOT EXISTS idx_users_program ON users(program_id)').catch(()=>{});
run('CREATE INDEX IF NOT EXISTS idx_users_dpa ON users(dpa_id)').catch(()=>{});
run('CREATE INDEX IF NOT EXISTS idx_courses_curr ON courses(curriculum_id)').catch(()=>{});
run('CREATE INDEX IF NOT EXISTS idx_schedules_course ON schedules(course_id)').catch(()=>{});
run('CREATE INDEX IF NOT EXISTS idx_schedules_dosen ON schedules(dosen_id)').catch(()=>{});
run('CREATE INDEX IF NOT EXISTS idx_class_enroll_class ON class_enrollments(class_id)').catch(()=>{});
run('CREATE INDEX IF NOT EXISTS idx_class_enroll_mhs ON class_enrollments(mahasiswa_id)').catch(()=>{});
run('CREATE INDEX IF NOT EXISTS idx_krs_mhs ON krs(mahasiswa_id)').catch(()=>{});

// ── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth',  require('./routes/authRoute'));
app.use('/api',       require('./routes/adminRoute'));
app.use('/api',       require('./routes/masterRoute'));
app.use('/api',       require('./routes/academicRoute'));
app.use('/api',       require('./routes/dosenRoute'));
app.use('/api',       require('./routes/krsRoute'));
app.use('/api',       require('./routes/portalRoute'));
app.use('/api',       require('./routes/aiRoute'));
app.use('/api',       require('./routes/examRoute'));

// ── SERVE REACT FRONTEND (Production) ────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use((req, res, next) => {
  if (path.extname(req.path) !== '') return next();
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// ── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 7542;
app.listen(PORT, () => {
  console.log(`✅ Server SIAKAD DKN berjalan di port ${PORT}.`);
  console.log(`   Arsitektur Modular aktif (7 modul rute).`);
});
