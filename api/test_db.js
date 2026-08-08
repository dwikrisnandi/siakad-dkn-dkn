const db = require('./db.js');
db.query('SELECT * FROM course_grades LIMIT 1').then(res => {
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
}).catch(err => {
    console.log("DB ERROR:", err.message);
    process.exit(1);
});
