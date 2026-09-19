# Emit SHA256 checksums for every release artifact (R-1.1).
param(
  [string]$OutDir = "_dist/release",
  [string]$StageDir = "_dist/bin/floorp",
  [string]$ChecksumName = "checksums.txt"
)
$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$lines = @()

foreach ($f in Get-ChildItem "$OutDir/*" -File -ErrorAction SilentlyContinue | Sort-Object Name) {
  $h = (Get-FileHash -Algorithm SHA256 -Path $f.FullName).Hash
  $lines += "$h  $($f.Name)  $($f.Length)"
}

if (Test-Path $StageDir) {
  foreach ($f in @("stratus.exe", "floorp.exe", "updater.exe", "default-browser-agent.exe", "application.ini")) {
    $p = Join-Path $StageDir $f
    if (Test-Path $p) {
      $h = (Get-FileHash -Algorithm SHA256 -Path $p).Hash
      $lines += "$h  bundle/$f  $((Get-Item $p).Length)"
    }
  }
}

$lines | Sort-Object | Set-Content -Path (Join-Path $OutDir $ChecksumName) -Encoding ascii
Write-Host "[release] ${ChecksumName}: $(($lines | Measure-Object).Count) entries"
