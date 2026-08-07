const Client = require('ssh2').Client;
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

const conn = new Client();
const username = getEnv('SANMAR_USERNAME');
const password = getEnv('SANMAR_PASSWORD');

console.log('Testing SFTP Authentication with Username:', username);

conn.on('ready', () => {
  console.log('🎉 SUCCESS! SFTP Authentication succeeded with SANMAR_USERNAME & SANMAR_PASSWORD!');
  conn.sftp((err, sftp) => {
    if (err) {
      console.log('Error starting SFTP session:', err.message);
      conn.end();
      return;
    }
    console.log('📂 Listing remote root files...');
    sftp.readdir('SanmarPDD', (err, list) => {
      if (err) {
        console.log('Error reading SanmarPDD folder:', err.message);
      } else {
        console.log('✅ Remote SanmarPDD files found:');
        console.log(list.map(f => f.filename));
      }
      conn.end();
    });
  });
}).on('error', (err) => {
  console.log('❌ SFTP Auth Error:', err.message);
}).connect({
  host: 'ftp.sanmar.com',
  port: 2200,
  username: username,
  password: password,
  algorithms: {
    serverHostKey: ['ssh-rsa', 'ssh-dss']
  }
});
