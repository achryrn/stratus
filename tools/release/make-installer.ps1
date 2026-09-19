# Release driver: package the built browser into an NSIS installer.
# M8.12 release pipeline (R-1.3). Requires NSIS (makensis) on the PATH;
# CI installs it. Without NSIS this script emits setup instructions and
# still produces checksums/manifests.
param(
  [string]$StageDir = "_dist/bin/floorp",
  [string]$OutDir = "_dist/release",
  [switch]$SkipNsis
)
$ErrorActionPreference = "Stop"

if (-not (Test-Path $StageDir)) { throw "stage directory not found: $StageDir (run feles-build build first)" }
$stage = (Resolve-Path $StageDir).Path
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Get-ChildItem "$OutDir/*.exe" -ErrorAction SilentlyContinue | Remove-Item -Force

if (-not $SkipNsis) {
  $makensis = Get-Command makensis -ErrorAction SilentlyContinue
  if ($makensis) {
    Push-Location (Join-Path (Split-Path $PSScriptRoot -Parent) "..")
    try {
      & $makensis.Source "/DSTAGE_DIR=$stage" "installer/stratus.nsi"
      if ($LASTEXITCODE -ne 0) { throw "makensis failed (exit $LASTEXITCODE)" }
      Copy-Item "stratus-browser-installer.exe" "$OutDir" -Force
      Write-Host "[release] installer built: $OutDir/stratus-browser-installer.exe"
    } finally { Pop-Location }
  } else {
    Write-Host "[release] NSIS (makensis) not found - installer skipped."
    Write-Host "          Install NSIS 3.09+ from https://nsis.sourceforge.io/Download and re-run."
  }
}

& (Join-Path $PSScriptRoot "make-checksums.ps1") -OutDir $OutDir -StageDir $StageDir
Write-Host "[release] done -> $OutDir"
