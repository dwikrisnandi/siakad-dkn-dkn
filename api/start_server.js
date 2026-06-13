const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function startService() {
  try {
    await ssh.connect({
      host: '192.168.30.4',
      username: 'dwi',
      password: '  ',
      port: 2222
    });
    
    console.log('✅ Terhubung. Mencoba merestart Windows Service SiakadServer...');
    
    // First, let's stop it just in case it's hung
    await ssh.execCommand('net stop SiakadServer');
    
    // Start the service using net start
    const result = await ssh.execCommand('net start SiakadServer');
    console.log('NET START STDOUT:', result.stdout);
    console.log('NET START STDERR:', result.stderr);
    
    // Or via NSSM if net start fails
    if (result.stderr || result.stdout.includes('could not be started')) {
      const result2 = await ssh.execCommand('"C:\\Program Files\\SIAKAD\\nssm.exe" restart SiakadServer');
      console.log('NSSM RESTART STDOUT:', result2.stdout);
      console.log('NSSM RESTART STDERR:', result2.stderr);
    }
    
    // Check if node is running now
    const result3 = await ssh.execCommand('tasklist | findstr node');
    console.log('Node processes:', result3.stdout);
    
    ssh.dispose();
  } catch (error) {
    console.error('❌ Error:', error);
    ssh.dispose();
  }
}

startService();
