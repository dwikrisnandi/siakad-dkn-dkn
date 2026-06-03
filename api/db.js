const { Pool } = require('pg');

const pool = new Pool({
  // Gunakan DATABASE_URL dari .env jika ada, atau fallback lokal standar
  connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:8256/siakad',
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Helper to convert SQLite `?` to PostgreSQL `$1, $2`
const convertSql = (sql) => {
  let i = 1;
  return sql.replace(/\?/g, () => '$' + (i++));
};

const run = async (sql, params = []) => {
  let pgSql = convertSql(sql);
  
  // PostgreSQL needs RETURNING id to get the inserted id
  const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT INTO');
  if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
    pgSql += ' RETURNING id';
  }

  // SQLite INTEGER PRIMARY KEY AUTOINCREMENT syntax to PostgreSQL SERIAL PRIMARY KEY
  pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
  // SQLite datetime fallback
  pgSql = pgSql.replace(/datetime\('now', 'localtime'\)/g, "CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta'");

  try {
    const res = await pool.query(pgSql, params);
    return { id: res.rows[0]?.id || 0, changes: res.rowCount };
  } catch (err) {
    if (err.code !== '42701') { // Ignore "column already exists" error during migrations
      console.log('Error running sql ' + pgSql);
      console.log(err.message);
    }
    throw err;
  }
};

const get = async (sql, params = []) => {
  const pgSql = convertSql(sql);
  try {
    const res = await pool.query(pgSql, params);
    return res.rows[0];
  } catch (err) {
    console.log('Error running sql: ' + pgSql);
    console.log(err.message);
    throw err;
  }
};

const query = async (sql, params = []) => {
  const pgSql = convertSql(sql);
  try {
    const res = await pool.query(pgSql, params);
    return [res.rows];
  } catch (err) {
    console.log('Error running sql: ' + pgSql);
    console.log(err.message);
    throw err;
  }
};

module.exports = { db: pool, run, get, query };
