const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres@localhost:8256/siakad' });

async function migrate() {
  try {
    console.log('Creating academic_years table...');
    await pool.query(`CREATE TABLE IF NOT EXISTS academic_years (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('Altering schedules table...');
    try {
      await pool.query(`ALTER TABLE schedules ADD COLUMN academic_year_id INTEGER REFERENCES academic_years(id)`);
      console.log('Added academic_year_id to schedules.');
    } catch (e) {
      if (e.code === '42701') {
        console.log('academic_year_id column already exists.');
      } else {
        throw e;
      }
    }
    
    console.log('Checking for existing academic years...');
    const { rowCount } = await pool.query(`SELECT id FROM academic_years`);
    if (rowCount === 0) {
      console.log('Creating default academic year and updating existing schedules...');
      const res = await pool.query(`INSERT INTO academic_years (name, is_active) VALUES ('2023/2024 Genap', true) RETURNING id`);
      const defaultId = res.rows[0].id;
      await pool.query(`UPDATE schedules SET academic_year_id = $1 WHERE academic_year_id IS NULL`, [defaultId]);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrate();
