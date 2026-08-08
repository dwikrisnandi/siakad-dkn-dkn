const db = require('./db.js');
db.query("SELECT column_name, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'course_grades'").then(res => {
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
}).catch(err => {
    console.log("DB ERROR:", err.message);
    process.exit(1);
});
