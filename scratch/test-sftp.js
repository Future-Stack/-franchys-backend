const net = require('net');
const fs = require('fs');
const path = require('path');

// Read .env file directly to get credentials
const envPath = path.join(process.cwd(), '.env');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.log('Error reading .env:', e.message);
}

function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

const host = 'ftp.sanmar.com';
const port = 2200;
const username = getEnv('SANMAR_USERNAME');
const password = getEnv('SANMAR_PASSWORD');

console.log('----------------------------------------------------');
console.log('🔍 [SFTP TEST] Target:', `${host}:${port}`);
console.log('🔍 [SFTP TEST] Username:', username ? username : 'NOT FOUND');
console.log('----------------------------------------------------');

const socket = net.createConnection(port, host, () => {
  console.log('✅ TCP connection established with ftp.sanmar.com:2200');
});

socket.on('data', (data) => {
  console.log('📩 Banner from SanMar SFTP server:', data.toString().trim());
  socket.end();
});

socket.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});
