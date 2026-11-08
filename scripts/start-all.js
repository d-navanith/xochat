const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const services = [
  { name: 'ASP.NET Core .NET 10 API & SignalR (Port 4000)', cmd: 'dotnet', args: ['run'], cwd: path.join(rootDir, 'server-dotnet'), color: '\x1b[35m' },
  { name: 'Super Admin Portal (Port 5720)', cmd: 'npm', args: ['run', 'dev:super'], cwd: path.join(rootDir, 'client'), color: '\x1b[36m' },
  { name: 'Core Admin Portal (Port 5120)', cmd: 'npm', args: ['run', 'dev:core'], cwd: path.join(rootDir, 'client'), color: '\x1b[32m' },
  { name: 'Team Members Live Chat (Port 5121)', cmd: 'npm', args: ['run', 'dev:team'], cwd: path.join(rootDir, 'client'), color: '\x1b[34m' },
  { name: 'Customer Chat Portal (Port 3002)', cmd: 'npm', args: ['run', 'dev:customer'], cwd: path.join(rootDir, 'client'), color: '\x1b[33m' },
];

console.log('\x1b[1m\x1b[32m===============================================================');
console.log('   LAUNCHING ENTERPRISE LIVE CHAT & MULTI-PORT HELP DESK');
console.log('===============================================================\x1b[0m\n');
console.log('Port Allocations:');
console.log('  • Super Admin Portal:    http://localhost:5720');
console.log('  • Core Admin Portal:     http://localhost:5120');
console.log('  • Team Members Portal:   http://localhost:5121');
console.log('  • Customer Portal:       http://localhost:3002');
console.log('  • Backend Engine:        http://localhost:4000\n');

services.forEach((s) => {
  const isWin = process.platform === 'win32';
  const proc = spawn(isWin ? 'cmd.exe' : s.cmd, isWin ? ['/c', s.cmd, ...s.args] : s.args, {
    cwd: s.cwd,
    stdio: 'pipe',
    shell: false,
  });

  proc.stdout.on('data', (d) => {
    const text = d.toString().trim();
    if (text) {
      console.log(`${s.color}[${s.name}]\x1b[0m ${text}`);
    }
  });

  proc.stderr.on('data', (d) => {
    const text = d.toString().trim();
    if (text) {
      console.error(`${s.color}[${s.name} ERROR]\x1b[0m ${text}`);
    }
  });
});
