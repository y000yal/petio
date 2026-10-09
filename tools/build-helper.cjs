// Compiles src/helper/aware.cs into aware.exe with the .NET Framework compiler that ships with Windows.
const { spawnSync } = require('node:child_process'), fs = require('node:fs'), path = require('node:path');
if (process.platform !== 'win32') process.exit(0);
const dir = path.join(__dirname, '..', 'src', 'helper'), win = process.env.WINDIR || 'C:\Windows';
const exe = path.join(dir, 'aware.exe'), src = path.join(dir, 'aware.cs');
if (fs.existsSync(exe) && fs.statSync(exe).mtimeMs >= fs.statSync(src).mtimeMs) process.exit(0); // up to date (also avoids touching an exe that a running copy has locked)
const csc = ['Framework64', 'Framework'].map(f => path.join(win, 'Microsoft.NET', f, 'v4.0.30319', 'csc.exe')).find(p => fs.existsSync(p));
if (!csc) { console.warn('csc.exe not found; the app will fall back to PowerShell for screen awareness'); process.exit(0); }
const r = spawnSync(csc, ['-nologo', '-target:exe', '-optimize+', '-out:aware.exe', 'aware.cs'], { cwd: dir, stdio: 'inherit' });
process.exit(r.status || 0);
