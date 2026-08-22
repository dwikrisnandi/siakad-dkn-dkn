const path = require('path');
const mysql = require(path.join(__dirname, '..', 'api', 'node_modules', 'mysql2', 'promise'));
(async () => {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'aku',database:'siakad_dkn'});
  try {
    await c.execute('ALTER TABLE course_grades ADD COLUMN tugas_override INT DEFAULT NULL');
    console.log('Column tugas_override added successfully!');
  } catch(e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column tugas_override already exists, skipping.');
    } else {
      throw e;
    }
  }
  await c.end();
})();
