# Verify Authenticode signature on a release binary (R-1.2).
param([Parameter(Mandatory = $true)][string]$Binary)
$ErrorActionPreference = "Stop"
$signtool = Get-Command signtool -ErrorAction SilentlyContinue
if (-not $signtool) { throw "signtool not found" }
& $signtool.Source verify /pa /v $Binary
Write-Host "[signing] verified: $Binary"
