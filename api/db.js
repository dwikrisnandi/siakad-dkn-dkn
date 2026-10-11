const { Pool } = require('pg');
const { tenantStorage } = require('./tenantContext');

const pool = new Pool({
  // Gunakan DATABASE_URL dari .env jika ada, atau fallback lokal standar
  connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:8256/siakad',
});

const TABLES_WITH_TENANT = new Set([
  'academic_years', 'attendance', 'classes', 'course_grades', 
  'curriculums', 'edom_questions', 'exams', 'exam_questions', 
  'invoices', 'materials', 'program_study_pillars', 'question_bank', 
  'rps', 'schedules', 'skripsi', 'users'
]);

const injectTenantId = (sql, params) => {
  if (typeof sql !== 'string') return { sql, params };
  const match = sql.match(/^\s*INSERT\s+INTO\s+([`"]?[\w]+[`"]?)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)(.*)$/i);
  if (!match) return { sql, params };

  const rawTable = match[1].replace(/[`"]/g, '').toLowerCase();
  if (!TABLES_WITH_TENANT.has(rawTable)) return { sql, params };

  const columns = match[2];
  if (columns.toLowerCase().includes('tenant_id')) return { sql, params };

  const context = tenantStorage.getStore();
  const activeTenantId = context?.tenantId;
  if (!activeTenantId) return { sql, params }; 

  const newColumns = `${columns}, tenant_id`;
  const newValues = `${match[3]}, ?`;
  const trailing = match[4] || '';

  return {
    sql: `INSERT INTO ${match[1]} (${newColumns}) VALUES (${newValues})${trailing}`,
    params: [...params, activeTenantId]
  };
};

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Helper to convert SQLite `?` to PostgreSQL `$1, $2`
const convertSql = (sql) => {
  let i = 1;
  return sql.replace(/\?/g, () => '$' + (i++));
};

const run = async (rawSql, rawParams = []) => {
  const { sql, params } = injectTenantId(rawSql, rawParams);
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

const get = async (rawSql, rawParams = []) => {
  const { sql, params } = injectTenantId(rawSql, rawParams);
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

const query = async (rawSql, rawParams = []) => {
  const { sql, params } = injectTenantId(rawSql, rawParams);
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
