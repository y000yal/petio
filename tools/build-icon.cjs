// Head icon for every Windows size (taskbar, shortcuts, app logo). Full wordmark is saved beside it for large UI.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const assetDir = path.join(root, 'src/assets');
const iconDir = path.join(root, 'build/icons');
const head = path.join(assetDir, 'logo-head.png');
const full = path.join(assetDir, 'logo-full.png');
execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'render-icons.ps1'), head, full, assetDir, iconDir], { stdio: 'inherit' });
if (!fs.existsSync(path.join(iconDir, 'head-256.png')) || !fs.existsSync(path.join(assetDir, 'petio-logo.png'))) throw new Error('Logo render did not write the icon files.');
const sizes = [16, 24, 32, 48, 64, 128, 256];
const frames = sizes.map(size => fs.readFileSync(path.join(iconDir, `head-${size}.png`)));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16, size = sizes[index];
  header[entry] = header[entry + 1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
fs.writeFileSync(path.join(root, 'build/petio.ico'), Buffer.concat([header, ...frames]));
console.log('Built Petio head icon for Windows and the full logo.');
