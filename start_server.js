const cp = require('child_process');
try {
  const p = cp.spawn('cmd.exe', ['/c', 'node index.js > server.log 2>&1'], {
    cwd: 'C:/Program Files/SIAKAD/api',
    detached: true,
    stdio: 'ignore'
  });
  p.unref();
  console.log('Server started.');
} catch (e) {
  console.error('Error starting server:', e.message);
}
