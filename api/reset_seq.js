const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres@localhost:8256/siakad' });

async function resetSequences() {
  try {
    const { rows: sequences } = await pool.query(`
      SELECT c.relname as table_name, s.relname as seq_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      JOIN pg_depend dep ON dep.objid = d.oid
      JOIN pg_class s ON s.oid = dep.refobjid
      WHERE n.nspname = 'public' AND s.relkind = 'S';
    `);

    for (const seq of sequences) {
      const res = await pool.query(`SELECT MAX(id) FROM ${seq.table_name}`);
      const maxId = res.rows[0].max;
      if (maxId) {
        console.log(`Resetting ${seq.seq_name} to ${maxId}`);
        await pool.query(`SELECT setval('${seq.seq_name}', ${maxId})`);
      } else {
        console.log(`Resetting ${seq.seq_name} to 1 (table empty)`);
        await pool.query(`SELECT setval('${seq.seq_name}', 1, false)`);
      }
    }
    console.log('All sequences updated.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

resetSequences();
