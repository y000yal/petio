param(
  [Parameter(Mandatory = $true)][string]$Head,
  [Parameter(Mandatory = $true)][string]$Full,
  [Parameter(Mandatory = $true)][string]$AssetDir,
  [Parameter(Mandatory = $true)][string]$IconDir
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class PetioLogo {
  public static Bitmap Load(string path, out Rectangle bounds) {
    using (var src = new Bitmap(path)) {
      var bmp = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
      var rect = new Rectangle(0, 0, src.Width, src.Height);
      var data = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var raw = new byte[Math.Abs(data.Stride) * src.Height];
      Marshal.Copy(data.Scan0, raw, 0, raw.Length);
      src.UnlockBits(data);
      int minX = src.Width, minY = src.Height, maxX = -1, maxY = -1;
      for (int y = 0; y < src.Height; y++) {
        int row = y * Math.Abs(data.Stride);
        for (int x = 0; x < src.Width; x++) {
          int i = row + x * 4;
          byte b = raw[i], g = raw[i + 1], r = raw[i + 2], a = raw[i + 3];
          if (a < 16 || (r < 28 && g < 28 && b < 28)) { bmp.SetPixel(x, y, Color.Transparent); continue; }
          bmp.SetPixel(x, y, Color.FromArgb(255, r, g, b));
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) throw new InvalidOperationException("No logo pixels in " + path);
      bounds = Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
      return bmp;
    }
  }
  public static void SaveSquare(Bitmap src, Rectangle bounds, int size, string dest) {
    using (var outBmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
    using (var g = Graphics.FromImage(outBmp)) {
      g.InterpolationMode = InterpolationMode.NearestNeighbor;
      g.PixelOffsetMode = PixelOffsetMode.Half;
      g.SmoothingMode = SmoothingMode.None;
      g.Clear(Color.Transparent);
      int pad = (int)Math.Round(size * 0.04);
      int inner = Math.Max(1, size - pad * 2);
      double scale = Math.Min(inner / (double)bounds.Width, inner / (double)bounds.Height);
      int dw = Math.Max(1, (int)Math.Round(bounds.Width * scale));
      int dh = Math.Max(1, (int)Math.Round(bounds.Height * scale));
      int dx = (size - dw) / 2, dy = (size - dh) / 2;
      g.DrawImage(src, new Rectangle(dx, dy, dw, dh), bounds, GraphicsUnit.Pixel);
      outBmp.Save(dest, ImageFormat.Png);
    }
  }
  public static void SaveWide(Bitmap src, Rectangle bounds, string dest) {
    using (var outBmp = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format32bppArgb))
    using (var g = Graphics.FromImage(outBmp)) {
      g.InterpolationMode = InterpolationMode.NearestNeighbor;
      g.PixelOffsetMode = PixelOffsetMode.Half;
      g.Clear(Color.Transparent);
      g.DrawImage(src, new Rectangle(0, 0, bounds.Width, bounds.Height), bounds, GraphicsUnit.Pixel);
      outBmp.Save(dest, ImageFormat.Png);
    }
  }
}
"@

New-Item -ItemType Directory -Force -Path $AssetDir, $IconDir | Out-Null
$headBounds = New-Object System.Drawing.Rectangle
$headBmp = [PetioLogo]::Load($Head, [ref]$headBounds)
Write-Output ("head " + $headBounds.Width + "x" + $headBounds.Height)
foreach ($size in 16, 24, 32, 48, 64, 128, 256) {
  [PetioLogo]::SaveSquare($headBmp, $headBounds, $size, (Join-Path $IconDir "head-$size.png"))
}
Copy-Item (Join-Path $IconDir 'head-256.png') (Join-Path $AssetDir 'petio.png') -Force
Copy-Item (Join-Path $IconDir 'head-32.png') (Join-Path $AssetDir 'petio-32.png') -Force
$headBmp.Dispose()
$fullBounds = New-Object System.Drawing.Rectangle
$fullBmp = [PetioLogo]::Load($Full, [ref]$fullBounds)
Write-Output ("full " + $fullBounds.Width + "x" + $fullBounds.Height)
[PetioLogo]::SaveWide($fullBmp, $fullBounds, (Join-Path $AssetDir 'petio-logo.png'))
$fullBmp.Dispose()
