const { run } = require('./db');
(async () => {
  try {
    await run('ALTER TABLE course_grades ADD COLUMN tugas_override INT DEFAULT NULL');
    console.log('Column tugas_override added successfully!');
  } catch(e) {
    if (e.code === '42701') {
      console.log('Column tugas_override already exists, skipping.');
    } else {
      console.error('Error:', e.message);
    }
  }
  process.exit(0);
})();
