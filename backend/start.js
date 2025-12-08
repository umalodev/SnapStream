const { spawn } = require('child_process');
const path = require('path');

console.log('Starting both servers...');

// Start the main server
const mainServer = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start the MediaSoup server
const mediaServer = spawn('node', ['mediasoupServer.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  mainServer.kill();
  mediaServer.kill();
  process.exit(0);
});

// Handle server crashes
mainServer.on('close', (code) => {
  console.log(`Main server exited with code ${code}`);
  mediaServer.kill();
  process.exit(code);
});

mediaServer.on('close', (code) => {
  console.log(`MediaSoup server exited with code ${code}`);
  mainServer.kill();
  process.exit(code);
}); 