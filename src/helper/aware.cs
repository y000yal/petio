// Tiny Windows helper for Petio: prints visible window rectangles and the foreground app (name only) about every 700 ms.
// Output blocks end with "END"; see awareness.cjs for the format. Compiled with the .NET Framework compiler that ships with Windows.
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

static class Aware {
    [StructLayout(LayoutKind.Sequential)] struct RC { public int L, T, Rt, Bt; }
    delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
    [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder sb, int n);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder sb, int n);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out RC r, int s);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int s);
    [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);

    static string Title(IntPtr h) {
        var t = new StringBuilder(200); GetWindowText(h, t, 200);
        return t.ToString().Replace("|", " ").Replace("\r", " ").Replace("\n", " ");
    }

    static string Dump() {
        var sb = new StringBuilder(); IntPtr fg = GetForegroundWindow(); int fgPid = 0;
        EnumWindows(delegate(IntPtr h, IntPtr l) {
            if (!IsWindowVisible(h) || IsIconic(h)) return true;
            int cloaked; DwmGetWindowAttribute(h, 14, out cloaked, 4); if (cloaked != 0) return true;
            if ((GetWindowLong(h, -20) & 0x80) != 0 && h != fg) return true;
            var cls = new StringBuilder(64); GetClassName(h, cls, 64); string c = cls.ToString();
            if (c == "Progman" || c == "WorkerW" || c == "Shell_TrayWnd" || c == "Shell_SecondaryTrayWnd" || c == "Windows.UI.Core.CoreWindow") { if (h != fg) return true; }
            RC r; if (DwmGetWindowAttribute(h, 9, out r, 16) != 0) return true;
            if (r.Rt - r.L < 120 || r.Bt - r.T < 60) return true;
            int pid; GetWindowThreadProcessId(h, out pid);
            if (h == fg) fgPid = pid;
            sb.Append(h == fg ? "F|" : "W|").Append(h.ToInt64()).Append('|').Append(pid).Append('|').Append(r.L).Append('|').Append(r.T).Append('|').Append(r.Rt).Append('|').Append(r.Bt).Append('|').Append(c).Append('|').Append(h == fg ? Title(h) : "").Append('\n');
            return true;
        }, IntPtr.Zero);
        if (fgPid != 0) { try { sb.Append("N|").Append(Process.GetProcessById(fgPid).ProcessName).Append('\n'); } catch (Exception) { } }
        int q; SHQueryUserNotificationState(out q); sb.Append("Q|").Append(q).Append('\n');
        return sb.ToString();
    }

    static void Main() {
        SetProcessDPIAware();
        var stdout = Console.Out; int n = 0;
        while (true) {
            try { stdout.Write(Dump() + "END\n"); stdout.Flush(); } catch (Exception) { return; } // parent closed the pipe
            if (++n % 60 == 0) GC.Collect();
            Thread.Sleep(700);
        }
    }
}
