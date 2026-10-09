// npm run dev: keeps electron attached to this terminal; restarts it when main-process files change, and if it gets killed.
const { spawn } = require('node:child_process'), fs = require('node:fs'), path = require('node:path');
const electron = require('electron'), root = path.join(__dirname, '..');
let child, restarting = false, timer;
const crashes = [];
function start() {
 child = spawn(electron, ['.', '--dev', ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
 child.on('exit', code => {
  if (restarting) { restarting = false; start(); return; }
  if (code === 0) process.exit(0); // you quit the app normally
  // killed or crashed: bring it back, unless it keeps dying right away
  const now = Date.now(); crashes.push(now); while (crashes.length && now - crashes[0] > 60000) crashes.shift();
  if (crashes.length > 5) { console.error('Petio keeps crashing; stopping the dev loop.'); process.exit(code ?? 1); }
  console.log('Petio exited (' + code + '); restarting...'); setTimeout(start, 800);
 });
}
fs.watch(path.join(root, 'src'), (_e, file) => {
 // main-process code (including text that main.cjs reads from characters.js) needs a full restart; everything else reloads in place
 if (!/^(main|preload|brain|awareness|appmood|notifications|overlay-preload)\.cjs$|^characters\.js$/.test(file || '')) return;
 clearTimeout(timer); timer = setTimeout(() => { restarting = true; child.kill(); }, 200);
});
start();
