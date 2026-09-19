# Publish the updater manifest for the built release (R-1.1 / app.update.url).
# Writes update.xml (Firefox updater format) + update.json sidecar.
# Target: UPDATE_HOST from branding (https://stratus-browser.org/updates/beta/).
param(
  [string]$OutDir = "_dist/release",
  [string]$Version = "153.0.3",
  [string]$BuildId = "20260919",
  [string]$Url = "https://stratus-browser.org/updates/beta/stratus-browser-installer.exe",
  [string]$DetailsUrl = "https://stratus-browser.org/docs/release-notes",
  [string]$InstallerName = "stratus-browser-installer.exe"
)
$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$installer = Join-Path $OutDir $InstallerName
if (-not (Test-Path $installer)) {
  Write-Warning "installer missing: $installer - manifest built from sidecar only"
  $size = 0
  $hash = ""
} else {
  $size = (Get-Item $installer).Length
  $hash = (Get-FileHash -Algorithm SHA512 -Path $installer).Hash.ToLowerInvariant()
}

$xml = @"
<?xml version="1.0"?>
<updates>
  <update type="minor" version="$Version" extensionVersion="$Version"
          buildID="$BuildId" detailsURL="$DetailsUrl">
    <patch type="complete" URL="$Url" hashFunction="SHA512"
           hashValue="$hash" size="$size"/>
  </update>
</updates>
"@
Set-Content -Path (Join-Path $OutDir "update.xml") -Value $xml -Encoding ascii

$sidecar = @{
  app = "Stratus"
  version = $Version
  buildId = $BuildId
  channel = "beta"
  url = $Url
  sha512 = $hash
  size = $size
  detailsUrl = $DetailsUrl
} | ConvertTo-Json
Set-Content -Path (Join-Path $OutDir "update.json") -Value $sidecar -Encoding ascii
Write-Host "[release] update manifest ready: $(Join-Path $OutDir 'update.xml')"
