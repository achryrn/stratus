# Release driver: package the built browser into an NSIS installer (R-1.3).
# Requires makensis (NSIS 3.09+): CI installs it, or point PATH at a portable
# copy (e.g. tools/release/nsis-3.10/makensis.exe).
# Without NSIS this script emits setup instructions and still produces
# checksums/manifests.
param(
  [string]$StageDir = "_dist/bin/floorp",
  [string]$OutDir = "_dist/release",
  [string]$IconPath = "",
  [switch]$SkipNsis
)
$ErrorActionPreference = "Stop"

if (-not (Test-Path $StageDir)) { throw "stage directory not found: $StageDir (run feles-build build first)" }
$stage = (Resolve-Path $StageDir).Path
$repo = Join-Path (Split-Path $PSScriptRoot -Parent) ".."
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Get-ChildItem "$OutDir/*.exe" -ErrorAction SilentlyContinue | Remove-Item -Force

if (-not $SkipNsis) {
  $makensis = Get-Command makensis -ErrorAction SilentlyContinue
  if (-not $makensis) { throw "makensis not found - install NSIS 3.09+ (https://nsis.sourceforge.io/Download) and re-run" }
  Push-Location $repo
  try {
    # Installer icon: prefer an explicit icon, else extract from the app binary.
    $icon = $IconPath
    if (-not $icon) {
      $candidate = Join-Path $stage "browser/chrome/icons/default/main-window.ico"
      if (Test-Path $candidate) { $icon = $candidate }
    }
    $iconArg = @()
    if ($icon) {
      $iconArg = @("/DMUI_ICON=$icon", "/DMUI_UNICON=$icon")
    } else {
      # No .ico ships in the overlay dist: draw a brand tile (indigo 'S') as a
      # PNG-blob ICO, which NSIS accepts (Icon-extraction saves are rejected).
      Add-Type -AssemblyName System.Drawing
      $extracted = Join-Path $env:TEMP "stratus-installer.ico"
      $size = 64
      $bmp = New-Object System.Drawing.Bitmap($size, $size)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.SmoothingMode = 'AntiAlias'
      $g.Clear([System.Drawing.Color]::FromArgb(255, 21, 21, 23))
      $g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 138, 148, 166))), 4, 4, $size - 8, $size - 8)
      $g.DrawString('S', (New-Object System.Drawing.Font('Segoe UI', 34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)), (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 8, 2)
      $ms = New-Object System.IO.MemoryStream
      $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
      $png = $ms.ToArray()
      $fs = [System.IO.File]::Create($extracted)
      $bw = New-Object System.IO.BinaryWriter($fs)
      $bw.Write([byte]0); $bw.Write([byte]0)
      $bw.Write([byte]1); $bw.Write([byte]0)
      $bw.Write([uint16]1)
      $bw.Write([byte]$size); $bw.Write([byte]$size)
      $bw.Write([byte]0); $bw.Write([byte]0)
      $bw.Write([uint16]1); $bw.Write([uint16]32)
      $bw.Write([uint32]$png.Length); $bw.Write([uint32]22)
      $bw.Write($png)
      $bw.Close(); $fs.Close()
      $iconArg = @("/DMUI_ICON=$extracted", "/DMUI_UNICON=$extracted")
      Write-Host "[release] generated stratus installer icon"
    }
    & $makensis.Source @iconArg "/DSTAGE_DIR=$stage" "installer/stratus.nsi"
    if ($LASTEXITCODE -ne 0) { throw "makensis failed (exit $LASTEXITCODE)" }
    Copy-Item "installer/stratus-browser-installer.exe" "$OutDir" -Force
    Write-Host "[release] installer built: $OutDir/stratus-browser-installer.exe"
  } finally { Pop-Location }
}

& (Join-Path $PSScriptRoot "make-checksums.ps1") -OutDir $OutDir -StageDir $StageDir
Write-Host "[release] done -> $OutDir"
