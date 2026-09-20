# Code signing (R-1.2). Wraps signtool (Windows SDK) with Authenticode,
# SHA256 digest and RFC3161 timestamping. In CI the certificate comes from
# secrets (CERTIFICATE_BASE64 -> PFX). Locally pass -CertificatePath.
param(
  [Parameter(Mandatory = $true)][string]$Binary,
  [string]$CertificatePath = $env:CERTIFICATE_PATH,
  [string]$CertificatePassword = $env:CERTIFICATE_PASSWORD,
  [string]$TimestampUrl = "http://timestamp.digicert.com"
)
$ErrorActionPreference = "Stop"

if (-not (Test-Path $Binary)) { throw "binary not found: $Binary" }
$signtool = Get-Command signtool -ErrorAction SilentlyContinue
if (-not $signtool) { throw "signtool not found - install Windows SDK (signtool.exe) and add to PATH" }

$pfx = $CertificatePath
if (-not $pfx -and $env:CERTIFICATE_BASE64) {
  $tmp = Join-Path $env:TEMP "stratus-signing.pfx"
  [IO.File]::WriteAllBytes($tmp, [Convert]::FromBase64String($env:CERTIFICATE_BASE64))
  $pfx = $tmp
}
if (-not $pfx) { throw "no certificate - set CERTIFICATE_PATH or CERTIFICATE_BASE64 + CERTIFICATE_PASSWORD" }

$argv = @("sign", "/fd", "SHA256", "/tr", $TimestampUrl, "/td", "SHA256", "/f", $pfx)
if ($CertificatePassword) { $argv += @("/p", $CertificatePassword) }
$argv += $Binary
& $signtool.Source @argv
if ($LASTEXITCODE -ne 0) { throw "signtool sign failed (exit $LASTEXITCODE)" }
Write-Host "[signing] signed: $Binary"
