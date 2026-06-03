const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to server...');
    await ssh.connect({ host: '192.168.30.4', username: 'dwi', port: 2222, password: '  ' });
    console.log('Connected!');

    console.log('Uploading updated API routes...');
    await ssh.putFile(path.join(__dirname, 'api', 'routes', 'adminRoute.js'), 'C:\\Program Files\\SIAKAD\\api\\routes\\adminRoute.js');
    await ssh.putFile(path.join(__dirname, 'api', 'routes', 'dosenRoute.js'), 'C:\\Program Files\\SIAKAD\\api\\routes\\dosenRoute.js');
    await ssh.putFile(path.join(__dirname, 'api', 'migrate_academic_years.js'), 'C:\\Program Files\\SIAKAD\\api\\migrate_academic_years.js');

    console.log('Uploading client/dist directory...');
    await ssh.putDirectory(path.join(__dirname, 'client', 'dist'), 'C:\\Program Files\\SIAKAD\\client\\dist', {
      recursive: true,
      concurrency: 10
    });

    console.log('Uploading update_year.js...');
    await ssh.putFile(path.join(__dirname, 'api', 'update_year.js'), 'C:\\Program Files\\SIAKAD\\api\\update_year.js');

    console.log('Running database updates on server...');
    const migRes = await ssh.execCommand('cd "C:\\Program Files\\SIAKAD\\api" && "C:\\Program Files\\nodejs\\node.exe" migrate_academic_years.js && "C:\\Program Files\\nodejs\\node.exe" update_year.js');
    console.log('Update Output:', migRes.stdout, migRes.stderr);

    console.log('Restarting SiakadServer service...');
    await ssh.execCommand('sc stop SiakadServer');
    await new Promise(r => setTimeout(r, 2000));
    await ssh.execCommand('sc start SiakadServer');
    
    console.log('Deployment successful!');
    process.exit(0);
  } catch (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  }
}

deploy();
