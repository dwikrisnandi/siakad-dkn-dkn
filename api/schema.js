const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres@localhost:8256/siakad' });

async function createSchema() {
  try {
    console.log('Creating tables...');
    
    // Tables without foreign keys first
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nidn_nim TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('users OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sks INTEGER NOT NULL,
      semester INTEGER NOT NULL
    )`);
    console.log('courses OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    )`);
    console.log('classes OK');

    // Tables with FK to users/classes/courses
    await pool.query(`CREATE TABLE IF NOT EXISTS class_enrollments (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL,
      mahasiswa_id INTEGER NOT NULL,
      UNIQUE(class_id, mahasiswa_id)
    )`);
    console.log('class_enrollments OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS schedules (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      dosen_id INTEGER NOT NULL,
      day TEXT NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT NOT NULL,
      room TEXT,
      class_ids TEXT
    )`);
    console.log('schedules OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      schedule_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('materials OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      schedule_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      deadline TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('assignments OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER,
      mahasiswa_id INTEGER,
      file_url TEXT,
      grade INTEGER DEFAULT NULL,
      nilai INTEGER DEFAULT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('submissions OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      schedule_id INTEGER,
      mahasiswa_id INTEGER,
      meeting_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      date TEXT NOT NULL
    )`);
    console.log('attendance OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS rps (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_data TEXT,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('rps OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS course_grades (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL,
      mahasiswa_id INTEGER NOT NULL,
      tugas_grade INTEGER,
      uts_grade INTEGER,
      uas_grade INTEGER,
      final_grade INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('course_grades OK');

    await pool.query(`CREATE TABLE IF NOT EXISTS attendance_notes (
      id SERIAL PRIMARY KEY,
      schedule_id INTEGER NOT NULL,
      meeting_number INTEGER NOT NULL,
      catatan TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('attendance_notes OK');

    console.log('\nSemua tabel berhasil dibuat!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createSchema();
