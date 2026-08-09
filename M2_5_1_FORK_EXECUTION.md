# M2.5.1: Fork floorp-runtime & Setup Build Environment

**Status:** In Progress  
**Deliverables:**
1. stratus-runtime fork created and configured
2. Platform-specific build environments documented
3. mozconfig templates prepared
4. Initial clone and branch structure ready

---

## Step 1: Create GitHub Fork

**Command (GitHub CLI):**
```bash
gh repo fork Floorp-Projects/floorp-runtime --clone=false --remote=true
```

**Expected Output:**
```
✓ Created fork {YOUR_USERNAME}/floorp-runtime
✓ Added remote: origin
```

**Verification:**
```bash
gh repo view {YOUR_USERNAME}/floorp-runtime
# Shows: forked from Floorp-Projects/floorp-runtime
```

---

## Step 2: Clone to Local Development Environment

**Directory Structure:**
```
~/.stratus-dev/
├── stratus-runtime/       ← Clone here
├── stratus-browser/       ← Existing (browser-dev)
└── artifacts/
    ├── stratus-runtime-build/
    └── dist/
```

**Clone Command:**
```bash
mkdir -p ~/.stratus-dev
cd ~/.stratus-dev

# Clone forked repository
git clone https://github.com/{YOUR_USERNAME}/floorp-runtime.git stratus-runtime
cd stratus-runtime

# Add upstream for tracking changes
git remote add upstream https://github.com/Floorp-Projects/floorp-runtime.git

# Create development branch
git checkout -b stratus/main
git branch -u upstream/main

# Verify remotes
git remote -v
```

**Expected State:**
```
origin    https://github.com/{USERNAME}/floorp-runtime.git (fetch/push)
upstream  https://github.com/Floorp-Projects/floorp-runtime.git (fetch)

Branches:
* stratus/main
  remotes/upstream/main
```

---

## Step 3: Initialize Build Configuration

**Create Platform Detection:**

**File: `build-setup.sh` (macOS/Linux)**
```bash
#!/bin/bash
# Stratus Runtime Build Setup Script

set -e

# Detect OS
OS=$(uname -s)
case "$OS" in
  Darwin*)  PLATFORM="macos";;
  Linux*)   PLATFORM="linux";;
  *)        echo "Unsupported OS: $OS"; exit 1;;
esac

echo "✓ Detected platform: $PLATFORM"

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  ARCH="x64";;
  arm64)   ARCH="arm64";;
  *)       echo "Unsupported arch: $ARCH"; exit 1;;
esac

echo "✓ Detected architecture: $ARCH"

# Check Python
if ! command -v python3 &> /dev/null; then
  echo "✗ Python 3 not found"
  exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✓ Python: $PYTHON_VERSION"

# Check build tools
for tool in nasm perl; do
  if ! command -v "$tool" &> /dev/null; then
    echo "⚠ Warning: $tool not found. Build may fail."
  else
    echo "✓ Found: $tool"
  fi
done

# Create mozconfig
echo "Creating .mozconfig for $PLATFORM-$ARCH..."
cat > .mozconfig << EOF
# Stratus Runtime Build Configuration
# Platform: $PLATFORM-$ARCH
# Generated: $(date)

ac_add_options --enable-official-branding
ac_add_options --with-branding=browser/branding/stratus
ac_add_options --enable-optimize
ac_add_options --disable-debug
ac_add_options --enable-jemalloc

# Parallel build
mk_add_options MOZ_MAKE_FLAGS="-j$(nproc)"
EOF

echo "✓ .mozconfig created"
echo ""
echo "Next steps:"
echo "  1. Review .mozconfig"
echo "  2. Run: ./mach bootstrap --application=browser"
echo "  3. Run: ./mach build"
```

**File: `build-setup.ps1` (Windows)**
```powershell
# Stratus Runtime Build Setup Script (Windows)

$ErrorActionPreference = "Stop"

Write-Host "Stratus Runtime Build Setup" -ForegroundColor Green

# Check Python
try {
  $pythonVersion = python --version 2>&1
  Write-Host "✓ Python: $pythonVersion"
} catch {
  Write-Host "✗ Python not found. Install from python.org" -ForegroundColor Red
  exit 1
}

# Check Visual Studio
$vsPath = "C:\Program Files\Microsoft Visual Studio\2022\Community"
if (Test-Path $vsPath) {
  Write-Host "✓ Visual Studio 2022 found"
} else {
  Write-Host "⚠ Visual Studio 2022 not found at $vsPath" -ForegroundColor Yellow
}

# Check NASM
try {
  $nasmVersion = nasm -version 2>&1 | Select-Object -First 1
  Write-Host "✓ NASM: $nasmVersion"
} catch {
  Write-Host "⚠ NASM not found" -ForegroundColor Yellow
}

# Check Perl
try {
  $perlVersion = perl -v 2>&1 | Select-String "version" | Select-Object -First 1
  Write-Host "✓ Perl: $perlVersion"
} catch {
  Write-Host "⚠ Perl not found" -ForegroundColor Yellow
}

# Create mozconfig
Write-Host "Creating .mozconfig..." -ForegroundColor Green
$mozconfig = @"
# Stratus Runtime Build Configuration (Windows)
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

ac_add_options --enable-official-branding
ac_add_options --with-branding=browser/branding/stratus
ac_add_options --enable-optimize
ac_add_options --disable-debug
ac_add_options --enable-jemalloc

ac_add_options --target=x86_64-pc-mingw32

# Parallel build (adjust based on CPU cores)
mk_add_options MOZ_MAKE_FLAGS="-j4"
"@

$mozconfig | Out-File -FilePath ".mozconfig" -Encoding ASCII
Write-Host "✓ .mozconfig created" -ForegroundColor Green

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review .mozconfig"
Write-Host "  2. Run: .\mach bootstrap --application=browser"
Write-Host "  3. Run: .\mach build"
```

---

## Step 4: Prepare Branding Directory Structure

**Create Stratus Branding Directory:**

```bash
mkdir -p browser/branding/stratus
cd browser/branding/stratus
```

**File: `brand.properties`**
```properties
brandShortName=Stratus
brandFullName=Stratus Browser
brandCompanyName=Stratus Project
brandMozillaNotice=Based on Firefox and Floorp
brandProductNotice=Stratus Browser is a privacy-focused browser
brandUpdateURL=https://updates.stratus-browser.org/
brandTelemetryURL=https://telemetry.stratus-browser.org/
brandSupportURL=https://support.stratus-browser.org/
brandHelpURL=https://help.stratus-browser.org/
brandPrivacyURL=https://stratus-browser.org/privacy
termsURL=https://stratus-browser.org/terms
```

**File: `brand.dtd`**
```dtd
<!ENTITY brandShortName "Stratus">
<!ENTITY brandFullName "Stratus Browser">
<!ENTITY brandProductName "Stratus">
<!ENTITY brandCompanyName "Stratus Project">
```

**File: `locales/en-US/brand.properties` (if needed)**
```properties
# English localization fallback
brandShortName=Stratus
brandFullName=Stratus Browser
```

---

## Step 5: Create Initial mozconfig Template

**File: `.mozconfig.stratus`**

```bash
# ============================================================================
# STRATUS RUNTIME BUILD CONFIGURATION
# ============================================================================
# Base: Floorp/Firefox ESR 153
# Customizations: Stratus branding, privacy defaults

# ============================================================================
# OFFICIAL BUILD
# ============================================================================

ac_add_options --enable-official-branding
ac_add_options --with-branding=browser/branding/stratus

# ============================================================================
# OPTIMIZATION
# ============================================================================

ac_add_options --enable-optimize
ac_add_options --disable-debug
ac_add_options --enable-jemalloc

# ============================================================================
# FEATURES
# ============================================================================

# WebRTC (required for modern web apps)
ac_add_options --enable-webrtc

# OpenH264 codec support
ac_add_options --enable-openh264

# Sandbox security
ac_add_options --enable-sandbox

# ============================================================================
# PLATFORM-SPECIFIC
# ============================================================================

# Detect platform and set target
if [[ -z "$STRATUS_TARGET" ]]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if [[ "$(uname -m)" == "arm64" ]]; then
      STRATUS_TARGET="aarch64-apple-darwin"
    else
      STRATUS_TARGET="x86_64-apple-darwin"
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    STRATUS_TARGET="x86_64-unknown-linux-gnu"
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    STRATUS_TARGET="x86_64-pc-mingw32"
  fi
fi

if [[ -n "$STRATUS_TARGET" ]]; then
  ac_add_options --target="$STRATUS_TARGET"
fi

# macOS specific
if [[ "$OSTYPE" == "darwin"* ]]; then
  ac_add_options --enable-macos-official-release
fi

# Linux specific
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  ac_add_options --enable-alsa
  ac_add_options --enable-libpulse
fi

# ============================================================================
# BUILD SYSTEM
# ============================================================================

# Parallel compilation (adjust for your CPU)
JOBS=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
mk_add_options MOZ_MAKE_FLAGS="-j$JOBS"

# Optional: Use ccache for faster rebuilds
# ac_add_options --with-ccache

# ============================================================================
# STRATUS CUSTOMIZATION
# ============================================================================

# Custom update URL
ac_add_options --with-update-url="https://updates.stratus-browser.org/%VERSION%/%BUILD_ID%/%OS%/%ARCH%/update.xml"

# Disable Mozilla telemetry
ac_add_options --disable-telemetry-experiments
```

---

## Step 6: Document Environment Setup

**File: `STRATUS_BUILD_SETUP.md`** (in fork root)

See full documentation in M2_5_RUNTIME_FORK_PLAN.md

---

## Step 7: Verify Fork Structure

**Checklist:**

```bash
# In ~/.stratus-dev/stratus-runtime/

# 1. Verify remotes
git remote -v
# ✓ origin and upstream configured

# 2. Check branch
git branch
# ✓ On stratus/main

# 3. Verify branding directory
test -d browser/branding/stratus
# ✓ Directory exists

# 4. Verify branding files
test -f browser/branding/stratus/brand.properties
test -f browser/branding/stratus/brand.dtd
# ✓ Files exist

# 5. Check mozconfig
test -f .mozconfig.stratus
# ✓ Template exists
```

---

## Implementation Commands

**Execute in sequence:**

```bash
# 1. Create fork and clone
gh repo fork Floorp-Projects/floorp-runtime --clone=false
mkdir -p ~/.stratus-dev
cd ~/.stratus-dev
git clone https://github.com/{YOUR_USERNAME}/floorp-runtime.git stratus-runtime
cd stratus-runtime

# 2. Setup remotes and branch
git remote add upstream https://github.com/Floorp-Projects/floorp-runtime.git
git checkout -b stratus/main
git branch -u upstream/main

# 3. Create branding directory
mkdir -p browser/branding/stratus/locales/en-US

# 4. Add branding files (copy from templates above)
cp -r templates/branding/* browser/branding/stratus/

# 5. Create mozconfig
cp .mozconfig.example .mozconfig
cat >> .mozconfig << 'EOF'
ac_add_options --enable-official-branding
ac_add_options --with-branding=browser/branding/stratus
EOF

# 6. Commit initial setup
git add browser/branding/stratus/ .mozconfig
git commit -m "setup: M2.5.1 — Stratus branding and build configuration"

# 7. Verify
git log --oneline -5
git remote -v
```

---

## Output Artifacts

After M2.5.1 completion:

```
~/.stratus-dev/stratus-runtime/
├── .git/                          ← Fork tracking
├── .mozconfig                     ← Build config ready
├── .mozconfig.stratus             ← Template
├── browser/
│   ├── branding/
│   │   ├── official/              ← Unchanged
│   │   └── stratus/               ← NEW
│   │       ├── brand.dtd
│   │       ├── brand.properties
│   │       ├── stratus-defaults.js
│   │       └── locales/
│   │           └── en-US/
│   │               └── brand.properties
│   └── ...
├── build-setup.sh                 ← Setup script
├── build-setup.ps1                ← Windows setup
├── STRATUS_BUILD_SETUP.md         ← Documentation
└── ... (rest of Mozilla source)

Git State:
✓ origin → {YOUR_USERNAME}/floorp-runtime (fork)
✓ upstream → Floorp-Projects/floorp-runtime (official)
✓ Branch: stratus/main
✓ Initial commit with branding
```

---

## Next: M2.5.2 Tasks

Once M2.5.1 complete:
1. **Update moz.configure** for Stratus-specific options
2. **Customize default preferences** in stratus-defaults.js
3. **Prepare build environment** on all platforms
4. **Ready for M2.5.3 build**

---

## Git Commands Reference

```bash
# Check for upstream changes
git fetch upstream
git log --oneline -5 upstream/main

# Sync with upstream (if needed)
git rebase upstream/main

# Push to fork
git push -u origin stratus/main

# View differences from upstream
git diff upstream/main..stratus/main
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Fork not showing | Wait 30s, refresh GitHub |
| SSH key rejected | Use HTTPS or setup SSH: `ssh-keygen` |
| Clone hangs | Try HTTPS instead of SSH |
| Remote tracking error | Re-run: `git branch -u upstream/main` |
| mozconfig syntax | Validate with: `python3 -m py_compile .mozconfig` |

---

## Success Criteria

- ✓ Fork created on GitHub
- ✓ Local clone at `~/.stratus-dev/stratus-runtime`
- ✓ Remotes configured (origin + upstream)
- ✓ Branch `stratus/main` created and tracking upstream
- ✓ Branding directory structure ready
- ✓ mozconfig templates prepared
- ✓ Initial commit pushed to fork
- ✓ Documentation complete
