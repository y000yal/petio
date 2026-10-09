// Windows-only: reports visible window rectangles and the foreground app (process name only, never titles or pixels).
// A single long-lived PowerShell process prints one block every ~700 ms; the main process turns it into DIP-space rectangles.
const { spawn } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const { screen } = require('electron');

const script = `
$ErrorActionPreference='SilentlyContinue'
Add-Type -TypeDefinition @"
using System; using System.Text; using System.Runtime.InteropServices;
public class PW {
 [StructLayout(LayoutKind.Sequential)] public struct RC { public int L,T,Rt,Bt; }
 delegate bool EnumProc(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder sb, int n);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder sb, int n);
 [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out RC r, int s);
 [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int s);
 [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);
 static string Title(IntPtr h){ var t = new StringBuilder(200); GetWindowText(h, t, 200); return t.ToString().Replace("|", " ").Replace("\\r", " ").Replace("\\n", " "); }
 public static void Init(){ SetProcessDPIAware(); }
 public static string Dump(){
  var sb = new StringBuilder(); IntPtr fg = GetForegroundWindow();
  EnumWindows(delegate(IntPtr h, IntPtr l){
   if(!IsWindowVisible(h) || IsIconic(h)) return true;
   int cloaked; DwmGetWindowAttribute(h, 14, out cloaked, 4); if(cloaked != 0) return true;
   if((GetWindowLong(h, -20) & 0x80) != 0 && h != fg) return true;
   var cls = new StringBuilder(64); GetClassName(h, cls, 64); string c = cls.ToString();
   if(c == "Progman" || c == "WorkerW" || c == "Shell_TrayWnd" || c == "Shell_SecondaryTrayWnd" || c == "Windows.UI.Core.CoreWindow") { if(h != fg) return true; }
   RC r; if(DwmGetWindowAttribute(h, 9, out r, 16) != 0) return true;
   if(r.Rt - r.L < 120 || r.Bt - r.T < 60) return true;
   int pid; GetWindowThreadProcessId(h, out pid);
   sb.Append(h == fg ? "F|" : "W|").Append(h.ToInt64()).Append('|').Append(pid).Append('|').Append(r.L).Append('|').Append(r.T).Append('|').Append(r.Rt).Append('|').Append(r.Bt).Append('|').Append(c).Append('|').Append(h == fg ? Title(h) : "").Append('\\n');
   return true;
  }, IntPtr.Zero);
  int q; SHQueryUserNotificationState(out q); sb.Append("Q|").Append(q).Append('\\n');
  return sb.ToString();
 }
}
"@
[PW]::Init()
while($true){
 $o = [PW]::Dump()
 $fgLine = ($o -split "\`n" | Where-Object { $_ -like 'F|*' } | Select-Object -First 1)
 if($fgLine){ $pidv = [int]($fgLine.Split('|')[2]); $name = (Get-Process -Id $pidv).ProcessName; $o += "N|$name\`n" }
 [Console]::Out.Write($o + "END\`n"); [Console]::Out.Flush()
 Start-Sleep -Milliseconds 700
}
`;

function start(onUpdate) {
  if (process.platform !== 'win32') return { stop() {} };
  let child, buffer = '', block = [], stopped = false;
  // Prefer the tiny compiled helper (about 15 MB); fall back to PowerShell (about 85 MB) if it was not built.
  const exe = ['app.asar.unpacked', ''].map(x => path.join(__dirname, 'helper', 'aware.exe').replace('app.asar', x ? x : 'app.asar')).find(p => fs.existsSync(p));
  const spawnHelper = () => {
    child = exe
      ? spawn(exe, [], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
      : spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i).replace(/\r$/, ''); buffer = buffer.slice(i + 1);
        if (line === 'END') { try { onUpdate(parse(block)); } catch (e) { /* ignore a bad block */ } block = []; } else if (line) block.push(line);
      }
    });
    child.on('exit', () => { if (!stopped) setTimeout(spawnHelper, 5000); });
  };
  spawnHelper();
  return { stop() { stopped = true; try { child.kill(); } catch (e) { /* already gone */ } } };
}

function toDip(l, t, r, b) {
  const a = screen.screenToDipPoint({ x: l, y: t }), z = screen.screenToDipPoint({ x: r, y: b });
  return { l: a.x, t: a.y, r: z.x, b: z.y };
}

// fullscreen = Windows reports a full-screen app (SHQueryUserNotificationState busy/D3D/presentation) AND it covers the display; a merely maximized window never counts.
// Returns { windows: [{id,pid,l,t,r,b}] in z-order (top first, DIP), fg: {name,pid,fullscreen,class} | null }.
function parse(lines) {
  const windows = []; let fg = null, name = '', quns = 0;
  for (const line of lines) {
    const p = line.split('|');
    if (p[0] === 'N') { name = p[1] || ''; continue; }
    if (p[0] === 'Q') { quns = +p[1]; continue; }
    if (p[0] !== 'W' && p[0] !== 'F') continue;
    const rect = toDip(+p[3], +p[4], +p[5], +p[6]), entry = { id: p[1], pid: +p[2], ...rect, cls: p[7] || '', title: p.slice(8).join(' ').toLowerCase().slice(0, 200), fg: p[0] === 'F' };
    windows.push(entry); if (entry.fg) fg = entry;
  }
  let info = null;
  if (fg) {
    const d = screen.getDisplayMatching({ x: Math.round(fg.l), y: Math.round(fg.t), width: Math.round(fg.r - fg.l), height: Math.round(fg.b - fg.t) }).bounds;
    info = { name: name.toLowerCase(), title: fg.title, pid: fg.pid, cls: fg.cls, fullscreen: (quns === 2 || quns === 3 || quns === 4) && fg.l <= d.x + 1 && fg.t <= d.y + 1 && fg.r >= d.x + d.width - 1 && fg.b >= d.y + d.height - 1 };
  }
  return { windows, fg: info };
}

module.exports = { start, parse };
