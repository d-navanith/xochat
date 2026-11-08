const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const clientDist = path.join(clientDir, 'dist');
const serverDir = path.join(rootDir, 'server-dotnet');
const serverWwwroot = path.join(serverDir, 'wwwroot');
const outputDir = path.join(rootDir, 'publish-monsterasp');
const zipFile = path.join(rootDir, 'publish-monsterasp.zip');

console.log('\x1b[1m\x1b[36m==============================================================');
console.log('   PACKAGING XOCHAT LIVE CHAT FOR MONSTERASP.NET DEPLOYMENT');
console.log('==============================================================\x1b[0m\n');

// 1. Build Client
console.log('\x1b[33m[1/4] Building React Production SPA (Vite + Tailwind v4)...\x1b[0m');
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

// 2. Copy Client Dist to Server wwwroot
console.log('\n\x1b[33m[2/4] Syncing frontend build into ASP.NET Core wwwroot...\x1b[0m');
if (fs.existsSync(serverWwwroot)) {
  fs.rmSync(serverWwwroot, { recursive: true, force: true });
}
fs.mkdirSync(serverWwwroot, { recursive: true });
fs.cpSync(clientDist, serverWwwroot, { recursive: true });
console.log('  ✓ Successfully copied client/dist to server-dotnet/wwwroot');

// 3. Dotnet Publish
console.log('\n\x1b[33m[3/4] Compiling and publishing ASP.NET Core .NET 10 project...\x1b[0m');
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
execSync(`dotnet publish "${serverDir}" -c Release -o "${outputDir}"`, { stdio: 'inherit' });
console.log('  ✓ Published Release build to ' + outputDir);

// 4. Create ZIP archive for MonsterASP.NET upload
console.log('\n\x1b[33m[4/4] Creating publish-monsterasp.zip for 1-click upload...\x1b[0m');
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

try {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${outputDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
  console.log('\n\x1b[32m==============================================================');
  console.log('   PACKAGING COMPLETE (READY FOR MONSTERASP.NET)!');
  console.log('==============================================================\x1b[0m');
  console.log(`\nYour deployment zip file is ready at:\n  \x1b[1m\x1b[32m${zipFile}\x1b[0m\n`);
  console.log('To deploy to MonsterASP.NET:');
  console.log('  1. Login to https://monsterasp.net control panel');
  console.log('  2. Open "File Manager" -> navigate to your website root');
  console.log('  3. Upload and extract "publish-monsterasp.zip"');
  console.log('  4. Done! Your site and WebSockets will be live!\n');
} catch (err) {
  console.error('Failed to create zip automatically. You can zip the contents of "publish-monsterasp" manually.', err);
}
