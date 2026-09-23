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
[System.IO.File]::WriteAllText($ftl, $c, (New-Object System.Text.UTF8Encoding($false)))

# Labs row: the preferences sidebar term resolves through the toolkit
# brandings file (upstream: Firefox Labs). Rebrand to Stratus Labs.
$labs = Join-Path $RuntimeDir "localization\en-US\toolkit\branding\brandings.ftl"
if (Test-Path $labs) {
  $c = Get-Content $labs -Raw
  $c = $c -replace '-firefoxlabs-brand-name = Firefox Labs', '-firefoxlabs-brand-name = Stratus Labs'
  [System.IO.File]::WriteAllText($labs, $c, (New-Object System.Text.UTF8Encoding($false)))
}

# brand.properties and brand.dtd in every locale.
Get-ChildItem (Join-Path $RuntimeDir "browser\chrome") -Recurse -Filter "brand.properties" | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  $c = $c -replace 'brandShorterName=Floorp', 'brandShorterName=Stratus'
  $c = $c -replace 'brandShortName=Floorp', 'brandShortName=Stratus'
  $c = $c -replace 'brandFullName=Ablaze Floorp', 'brandFullName=Stratus'
  $c = $c -replace 'vendorShortName=Ablaze', 'vendorShortName=Stratus'
  [System.IO.File]::WriteAllText($_.FullName, $c, (New-Object System.Text.UTF8Encoding($false)))
}
Get-ChildItem (Join-Path $RuntimeDir "browser\chrome") -Recurse -Filter "brand.dtd" | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  $c = $c -replace 'brandShortName        "Floorp"', 'brandShortName        "Stratus"'
  [System.IO.File]::WriteAllText($_.FullName, $c, (New-Object System.Text.UTF8Encoding($false)))
}

# firefox.js: the shipped defaults bundle is runtime-owned, so patch the
# user-visible leftovers here (feedback URL, the override-injected comment).
$ffjs = Join-Path $RuntimeDir "browser\defaults\preferences\firefox.js"
if (Test-Path $ffjs) {
  $c = Get-Content $ffjs -Raw
  $c = $c -replace 'https://docs\.floorp\.app/', 'https://stratus-browser.org/docs/'
  $c = $c -replace '// Floorp custom preferences \(added by override\.ps1\)', '// Stratus custom preferences (added by override.ps1)'
  [System.IO.File]::WriteAllText($ffjs, $c, (New-Object System.Text.UTF8Encoding($false)))
}

# Legacy floorp-named branding files are deleted below; the CSS must point
# at the renamed stratus-background asset.
$abcss = Join-Path $RuntimeDir "browser\chrome\browser\content\branding\aboutDialog.css"
if (Test-Path $abcss) {
  $c = Get-Content $abcss -Raw
  $c = $c -replace 'floorp-background\.png', 'stratus-background.png'
  [System.IO.File]::WriteAllText($abcss, $c, (New-Object System.Text.UTF8Encoding($false)))
}

# Logo, wordmark and icon assets.
$assets = Join-Path $PSScriptRoot "stratus-brand-assets.py"
if (Test-Path $assets) {
  python $assets -RuntimeDir $RuntimeDir
} else {
  Write-Warning "stratus-brand-assets.py not found next to apply-brand.ps1 - assets not regenerated"
}

# Legacy floorp-named branding files: delete so no Floorp filename ships.
Remove-Item (Join-Path $RuntimeDir "browser\chrome\browser\content\branding\floorp-background.png"), (Join-Path $RuntimeDir "browser\chrome\browser\content\branding\floorp-pb-toolbar-icon.ico") -Force -ErrorAction SilentlyContinue

# PE icon groups: the exe ships blue Floorp bitmaps, so stamp the red
# Stratus S mark into the staged binary (no-op if the browser is running).
$exeIcons = Join-Path $PSScriptRoot "stratus-exe-icons.py"
try {
  python $exeIcons
} catch {
  Write-Warning "stratus-exe-icons.py failed (browser running?) - exe icons not stamped"
}

Write-Host "[release] Stratus brand applied to $RuntimeDir"
