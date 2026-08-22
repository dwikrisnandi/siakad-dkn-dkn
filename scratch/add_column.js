const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'aku',database:'siakad_dkn'});
  await c.execute('ALTER TABLE course_grades ADD COLUMN tugas_override INT DEFAULT NULL');
  console.log('Column tugas_override added!');
  await c.end();
})();
