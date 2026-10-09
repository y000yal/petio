const { app } = require('electron');
app.whenReady().then(() => {
 const { start } = require('../src/awareness.cjs');
 let n = 0; const h = start(info => {
  console.log(JSON.stringify({ windows: info.windows.length, fg: info.fg && { n: info.fg.name, full: info.fg.fullscreen }, title: info.fg && info.fg.title, first: info.windows.slice(0, 1).map(w => [w.id, w.l, w.t, w.r, w.b, w.cls]) }));
  if (++n >= 3) { h.stop(); app.quit(); }
 });
 setTimeout(() => { console.log('timeout'); h.stop(); app.quit(); }, 15000);
});
