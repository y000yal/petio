// Full-screen overlay for drawing the character zone. The rectangle is sent back in this display's own coordinates.
const MIN_W = 260, MIN_H = 220;
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d'), tip = document.getElementById('tip'), hint = document.getElementById('hint');
let start = null, rect = null, dragging = false;
function size() { canvas.width = innerWidth; canvas.height = innerHeight; draw(); }
function norm(a, b) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }; }
function ok(r) { return r && r.w >= MIN_W && r.h >= MIN_H; }
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(8,10,18,.58)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!rect) return;
  ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = ok(rect) ? '#9d8cff' : '#ff6b81'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  ctx.setLineDash([]); ctx.fillStyle = ok(rect) ? '#9d8cff' : '#ff6b81'; ctx.font = '600 13px Segoe UI, sans-serif';
  ctx.fillText(Math.round(rect.w) + ' × ' + Math.round(rect.h) + (ok(rect) ? '' : '  (too small, minimum ' + MIN_W + ' × ' + MIN_H + ')'), rect.x + 8, Math.max(16, rect.y - 8));
}
addEventListener('resize', size); size();
addEventListener('mousedown', e => { if (e.button !== 0) return; start = { x: e.clientX, y: e.clientY }; rect = null; dragging = true; draw(); });
addEventListener('mousemove', e => { if (!dragging) return; rect = norm(start, { x: e.clientX, y: e.clientY }); tip.classList.toggle('bad', !ok(rect)); draw(); });
addEventListener('mouseup', () => { dragging = false; hint.textContent = ok(rect) ? 'Enter to confirm · Esc to cancel · drag again to redraw' : 'Too small: drag a bigger area (at least ' + MIN_W + ' × ' + MIN_H + ')'; });
addEventListener('keydown', e => {
  if (e.key === 'Escape') window.zonePicker.done(null);
  else if (e.key === 'Enter' && ok(rect)) window.zonePicker.done({ x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.w), height: Math.round(rect.h) });
});
