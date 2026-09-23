# Apply the Stratus brand to the jarless runtime tree.
# The rebuilt runtime ships with chrome files unpacked on disk, so the
# user-visible brand (window title, about page, icons, wordmarks) can be
# replaced here without recompiling. Internal identifiers (floorp.* prefs,
# resource://floorp, floorp.exe, chrome://floorp) stay untouched because they
# are runtime contracts.
param(
  [string]$RuntimeDir = "_dist/bin/floorp"
)
$ErrorActionPreference = "Stop"

# FTL brand terms (the window title source).
$ftl = Join-Path $RuntimeDir "browser\localization\en-US\branding\brand.ftl"
$c = Get-Content $ftl -Raw
$c = $c -replace '= Floorp', '= Stratus' -replace '= Ablaze Floorp', '= Stratus'
$c = $c -replace '= Ablaze', '= Stratus'
$c = $c -replace 'trademarkInfo = .*', 'trademarkInfo = Stratus and the Stratus logos are trademarks of Stratus.'
Set-Content -Path $ftl -Value $c -Encoding utf8NoBOM

# brand.properties and brand.dtd in every locale.
Get-ChildItem (Join-Path $RuntimeDir "browser\chrome") -Recurse -Filter "brand.properties" | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  $c = $c -replace 'brandShorterName=Floorp', 'brandShorterName=Stratus'
  $c = $c -replace 'brandShortName=Floorp', 'brandShortName=Stratus'
  $c = $c -replace 'brandFullName=Ablaze Floorp', 'brandFullName=Stratus'
  $c = $c -replace 'vendorShortName=Ablaze', 'vendorShortName=Stratus'
  Set-Content -Path $_.FullName -Value $c -Encoding utf8NoBOM
}
Get-ChildItem (Join-Path $RuntimeDir "browser\chrome") -Recurse -Filter "brand.dtd" | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  $c = $c -replace 'brandShortName        "Floorp"', 'brandShortName        "Stratus"'
  Set-Content -Path $_.FullName -Value $c -Encoding utf8NoBOM
}

# Logo, wordmark and icon assets.
$assets = Join-Path $PSScriptRoot "stratus-brand-assets.py"
if (Test-Path $assets) {
  python $assets -RuntimeDir $RuntimeDir
} else {
  Write-Warning "stratus-brand-assets.py not found next to apply-brand.ps1 - assets not regenerated"
}

Write-Host "[release] Stratus brand applied to $RuntimeDir"
