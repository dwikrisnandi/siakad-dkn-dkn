const cp = require('child_process');
try {
  cp.execSync('xcopy /s /e /y "C:\\Users\\dwi\\upload\\dist\\*" "C:\\Program Files\\SIAKAD\\client\\dist\\"');
  console.log('Frontend deployed successfully.');
} catch (e) {
  console.error('Error deploying frontend:', e.message);
}
