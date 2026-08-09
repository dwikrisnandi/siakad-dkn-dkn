const { query } = require('../api/db');

async function test() {
  try {
    const sql = `
      SELECT 
        c.code as course_code, 
        c.name as course_name, 
        c.sks, 
        c.semester,
        MAX(cg.final_score) as final_score
      FROM course_grades cg
      JOIN schedules s ON cg.schedule_id = s.id
      JOIN courses c ON s.course_id = c.id
      WHERE cg.mahasiswa_id = 4 AND cg.final_score IS NOT NULL
      GROUP BY c.id
      ORDER BY c.semester ASC, c.name ASC
    `;
    console.log("Running query...");
    const [records] = await query(sql);
    console.log("Records:", records);
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    process.exit(0);
  }
}
test();
