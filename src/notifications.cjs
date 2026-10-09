// Windows only: watches the system notification database for new toasts so the pet can read them out.
// Opt-in. The text is held in memory just long enough to show it; nothing is logged, stored or sent anywhere.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');

const dbDir = () => path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Notifications');
const decode = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// "Microsoft.YourPhone_8wekyb3d8bbwe!YourPhoneNotifications_com.snapchat.android" -> "Snapchat", "Claude_pzs8sxrjxfjjc!Claude" -> "Claude"
function appName(aumid = '') {
  const pretty = s => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\d{6,}.*/, '').trim();
  const pkg = (aumid.split('!')[0] || '').split('_')[0].split('.').pop() || '';
  let s = aumid.split('!').pop() || aumid;
  const phone = s.match(/_com\.(.+)$/);
  if (phone) s = phone[1].split('.').filter(p => !['android', 'ios', 'app', 'mobile', 'com', 'org', 'in', 'co'].includes(p)).pop() || phone[1];
  else {
    s = s.split(/[._]/).filter(Boolean).pop() || s;
    if (/^(app|main|application|notifications?)$/i.test(s) && pkg) s = pkg; // generic entry names: use the package name instead
  }
  s = pretty(s);
  return s ? s[0].toUpperCase() + s.slice(1) : 'Notification';
}

// Pulls the visible text lines out of a toast's XML payload.
function toastText(xml) {
  const lines = [];
  for (const m of xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi)) {
    if (/placement\s*=\s*["']attribution["']/i.test(m[1])) continue;
    const t = decode(m[2].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    if (t) lines.push(t);
  }
  return lines;
}

function start(onNotice) {
  if (process.platform !== 'win32') return { stop() {} };
  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); } catch (e) { return { stop() {} }; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'petio-wpn-'));
  let lastId = null, lastSig = '', timer, stopped = false, failures = 0;
  const poll = () => {
    if (stopped) return;
    let delay = 3000; // the folder watcher gives instant reactions; this slow timer is only a safety net
    try {
      // Skip all work unless Windows actually touched the database since the last look (cheap stat calls only).
      const sig = ['wpndatabase.db', 'wpndatabase.db-wal'].map(f => { try { const s = fs.statSync(path.join(dbDir(), f)); return s.mtimeMs + ':' + s.size; } catch (e) { return '-'; } }).join('|');
      if (sig === lastSig && lastId !== null) { timer = setTimeout(poll, 3000); return; }
      lastSig = sig;
      for (const f of ['wpndatabase.db', 'wpndatabase.db-wal', 'wpndatabase.db-shm']) {
        try { fs.copyFileSync(path.join(dbDir(), f), path.join(tmp, f)); } catch (e) { if (f === 'wpndatabase.db') throw e; }
      }
      const db = new DatabaseSync(path.join(tmp, 'wpndatabase.db'), { readOnly: true });
      try {
        if (lastId === null) lastId = db.prepare('select coalesce(max(Id),0) as m from Notification').get().m; // only notifications that arrive from now on
        const rows = db.prepare("select n.Id as id, h.PrimaryId as app, n.Payload as payload from Notification n left join NotificationHandler h on h.RecordId=n.HandlerId where n.Type='toast' and n.Id>? order by n.Id").all(lastId);
        for (const r of rows) {
          lastId = Math.max(lastId, r.id);
          const lines = toastText(Buffer.from(r.payload).toString('utf8'));
          if (lines.length) onNotice({ app: appName(r.app || ''), aumid: r.app || '', lines });
        }
        const maxId = db.prepare('select coalesce(max(Id),0) as m from Notification').get().m;
        lastId = Math.max(lastId, maxId);
      } finally { db.close(); }
      failures = 0;
    } catch (e) { failures++; delay = Math.min(60000, 3000 * 2 ** Math.min(failures, 4)); lastSig = ''; }
    timer = setTimeout(poll, delay);
  };
  poll();
  // React the moment Windows writes the notification (watch the database folder) instead of waiting for the next timed poll.
  let watcher, kick;
  try {
    watcher = fs.watch(dbDir(), { persistent: false }, (_e, file) => {
      if (stopped || !/wpndatabase/i.test(file || '')) return;
      clearTimeout(kick); kick = setTimeout(() => { clearTimeout(timer); poll(); }, 25);
    });
    watcher.on('error', () => {});
  } catch (e) { /* the timed poll still works */ }
  return { stop() { stopped = true; clearTimeout(timer); clearTimeout(kick); try { watcher && watcher.close(); } catch (e) { /* closed */ } try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* temp copy */ } } };
}

module.exports = { start, appName, toastText };
