# M2.5: Stratus Runtime Fork & Build Environment

**Phase:** Infrastructure & Runtime  
**Objective:** Fork floorp-runtime, establish custom Gecko build environment, rebrand to Stratus  
**Timeline:** 3 weeks  
**Status:** Planning  

---

## Executive Summary

M2.5 decouples Stratus from upstream Floorp runtime by:
1. Forking `floorp-runtime` repository
2. Establishing independent Gecko ESR 153 build environment
3. Updating `moz.configure` for Stratus-specific branding
4. Building custom runtime artifact
5. Updating `floorp-runtime.lock.json` pinning

This enables:
- **Independent versioning** (Stratus runtime ≠ Floorp runtime)
- **Custom branding** (Stratus in about:, window titles, preferences)
- **Build CI/CD** (automated nightly builds)
- **Distribution isolation** (separate update channels)

---

## M2.5.1: Fork Repository & Environment Setup

### Task 1.1: Clone floorp-runtime Fork

**Inputs:**
- GitHub account with push access
- floorp-runtime source (github.com/Floorp-Projects/floorp-runtime)

**Steps:**

```bash
# Create fork on GitHub UI (or use GitHub CLI)
gh repo fork Floorp-Projects/floorp-runtime --clone=false

# Clone to local workspace
mkdir -p ~/.stratus-dev
cd ~/.stratus-dev
git clone https://github.com/{YOUR_USERNAME}/floorp-runtime.git stratus-runtime
cd stratus-runtime

# Add upstream remote for tracking
git remote add upstream https://github.com/Floorp-Projects/floorp-runtime.git

# Create development branch
git checkout -b stratus/main
```

**Expected Output:**
- Local repo: `~/.stratus-dev/stratus-runtime/`
- Branch: `stratus/main` tracking upstream
- Ready for build environment setup

**Verification:**
```bash
git remote -v
# origin    https://github.com/{YOUR_USERNAME}/floorp-runtime.git (fetch/push)
# upstream  https://github.com/Floorp-Projects/floorp-runtime.git (fetch)

git branch -a
# * stratus/main
#   remotes/upstream/main
```

---

### Task 1.2: Document Build Environment Setup

**Platform-Specific Instructions:**

#### Windows 11 Build Environment

**Prerequisites:**
- Visual Studio 2022 (Community+) with C++/Windows SDK
- Python 3.11+
- Perl (msys2 or ActivePerl)
- NASM (Netwide Assembler)
- Mercurial (hg) or Git
- 30GB+ free disk space (build artifacts)

**Setup Script:**

```powershell
# Install Chocolatey if not present
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install build dependencies
choco install -y python --version=3.11.9
choco install -y nasm
choco install -y perl
choco install -y nodejs

# Verify Python
python --version  # Should be 3.11+

# Setup MSVC environment (VS 2022)
# This is typically automatic, but can be triggered:
$vsPath = "C:\Program Files\Microsoft Visual Studio\2022\Community"
& "$vsPath\VC\Auxiliary\Build\vcvars64.bat"

# Clone and setup mozconfig
cd $env:USERPROFILE\.stratus-dev\stratus-runtime
cp .mozconfig.example .mozconfig
```

**Expected Environment:**
- Python 3.11+
- MSVC 193+ (C++ compiler)
- Perl available on PATH
- NASM on PATH
- Node 18+ for build tools

#### macOS Build Environment

**Prerequisites (Intel):**
- Xcode 14+ with Command Line Tools
- Python 3.11+
- Homebrew
- 30GB+ free disk

**Setup:**

```bash
# Install Xcode CLT
xcode-select --install

# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python@3.11 nasm autoconf@2.13 yasm

# Setup Python symlink
ln -sf /usr/local/opt/python@3.11/bin/python3.11 /usr/local/bin/python3

# Clone and setup
cd ~/.stratus-dev/stratus-runtime
cp .mozconfig.example .mozconfig

# Configure for local build
cat >> .mozconfig << 'EOF'
ac_add_options --with-branding=browser/branding/stratus
ac_add_options --enable-official-branding
EOF
```

**Expected Output:**
- Xcode CLT installed
- Python 3.11 available
- `.mozconfig` configured

#### Linux (Ubuntu 22.04) Build Environment

**Prerequisites:**
- Ubuntu 22.04 LTS
- Build essentials + dev packages
- Python 3.11
- 30GB+ disk

**Setup:**

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y \
  python3.11 python3-pip \
  build-essential \
  autoconf2.13 \
  nasm yasm \
  libx11-dev libxt-dev libxext-dev \
  libgtk-3-dev \
  libssl-dev \
  libevent-dev \
  libpulse-dev

# Make python3.11 default
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Clone and configure
cd ~/.stratus-dev/stratus-runtime
cp .mozconfig.example .mozconfig
```

**Expected Output:**
- All build tools available
- Python 3.11 as default
- Ready for `./mach` bootstrap

---

### Task 1.3: Setup mozconfig for Stratus

**File: `.mozconfig`**

```bash
# Stratus Custom Build Configuration
# Based on Floorp ESR 153 + Stratus branding

# ============================================================================
# BASIC BUILD OPTIONS
# ============================================================================

# Official Stratus build (enables hardening, signing keys)
ac_add_options --enable-official-branding
ac_add_options --with-branding=browser/branding/stratus

# Build type
ac_add_options --enable-optimize
ac_add_options --disable-debug

# JavaScript engine (SpiderMonkey)
ac_add_options --enable-jemalloc

# ============================================================================
# FEATURE CONFIGURATION
# ============================================================================

# WebRTC support
ac_add_options --enable-webrtc

# OpenH264 video codec
ac_add_options --enable-openh264

# Sandbox security
ac_add_options --enable-sandbox

# Binary transparency
ac_add_options --with-google-safebrowsing-api-key={API_KEY}
ac_add_options --with-google-location-service-api-key={API_KEY}

# ============================================================================
# PLATFORM-SPECIFIC
# ============================================================================

# macOS specific
if [[ "$OSTYPE" == "darwin"* ]]; then
  ac_add_options --target=x86_64-apple-darwin
  # For Apple Silicon:
  # ac_add_options --target=aarch64-apple-darwin
fi

# Windows specific
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
  ac_add_options --target=x86_64-pc-mingw32
fi

# Linux specific
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  ac_add_options --target=x86_64-unknown-linux-gnu
  ac_add_options --enable-alsa
  ac_add_options --enable-libpulse
fi

# ============================================================================
# BUILD SYSTEM
# ============================================================================

# Parallel compilation
mk_add_options MOZ_MAKE_FLAGS="-j$(nproc)"

# Use ccache for faster rebuilds (optional)
# ac_add_options --with-ccache

# ============================================================================
# DISTRIBUTION / RELEASE
# ============================================================================

# Custom update URL for Stratus
ac_add_options --with-update-url="https://updates.stratus-browser.org/%VERSION%/%BUILD_ID%/%OS%/%ARCH%/update.xml"

# Telemetry (optional)
ac_add_options --disable-telemetry-experiments

# ============================================================================
# STRATUS CUSTOMIZATION
# ============================================================================

# Noraneko overlay (Stratus uses custom overlay path)
# Handled via browser-features/chrome/common at runtime

# Preference customizations
# Handled via stratus-defaults.js
```

**Directory Structure After Setup:**

```
~/.stratus-dev/stratus-runtime/
├── browser/
│   ├── branding/
│   │   ├── official/          # Official Firefox
│   │   └── stratus/           # ← NEW: Stratus branding
│   │       ├── aboutIcon.png
│   │       ├── branding.nsi
│   │       ├── brand.dtd
│   │       ├── brand.properties
│   │       └── favicon.ico
│   ├── extensions/
│   └── ...
├── .mozconfig                 # Custom build config
├── .mozconfig.example
├── mach                       # Build system entry point
├── configure
└── ...
```

---

## M2.5.2: Customize Runtime for Stratus

### Task 2.1: Update moz.configure

**File: `browser/branding/stratus/moz.configure` (new)**

```python
# -*- Mode: python; indent-tabs-mode: nil; tab-width: 40 -*-
# vim: set filetype=python:

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Stratus-specific build configuration
Customizations for Stratus Browser (Floorp-based, independent runtime)
"""

# ============================================================================
# BRANDING CONFIGURATION
# ============================================================================

option(
    '--with-stratus-branding',
    help='Build Stratus Browser with custom branding',
    default=True
)

@depends('--with-stratus-branding')
def stratus_branding(value):
    if value:
        return namespace(
            name='Stratus',
            channel='release',
            update_url='https://updates.stratus-browser.org',
            telemetry_url='https://telemetry.stratus-browser.org',
        )
    return None

set_config('STRATUS_BRANDING', stratus_branding)

# ============================================================================
# FEATURE CONFIGURATION
# ============================================================================

# Stratus-specific features
option(
    '--enable-stratus-features',
    help='Enable Stratus-specific features (Noraneko overlay, vertical tabs)',
    default=True
)

@depends('--enable-stratus-features')
def stratus_features(value):
    if value:
        return {
            'noraneko_overlay': True,
            'vertical_tabs': True,
            'workspaces': True,
            'split_view': True,
            'design_system': True,
        }
    return {}

set_config('STRATUS_FEATURES', stratus_features)

# ============================================================================
# VERSION AND BUILD INFO
# ============================================================================

# Stratus version (e.g., 1.0.0-beta.1)
option(
    '--with-stratus-version',
    nargs=1,
    help='Stratus version string'
)

@depends('--with-stratus-version')
def stratus_version(value):
    if value:
        return value[0]
    return '1.0.0-dev'

set_config('STRATUS_VERSION', stratus_version)

# ============================================================================
# DISTRIBUTION CHANNEL
# ============================================================================

# Update channel (release, beta, nightly)
option(
    '--with-stratus-channel',
    default='release',
    choices=['release', 'beta', 'nightly'],
    help='Stratus update channel'
)

set_config('STRATUS_CHANNEL', option.with_stratus_channel)

# ============================================================================
# CUSTOMIZATION
# ============================================================================

# Default homepage
option(
    '--with-stratus-homepage',
    default='https://stratus-browser.org',
    help='Stratus homepage URL'
)

set_config('STRATUS_HOMEPAGE', option.with_stratus_homepage)

# Preferences customization file
option(
    '--with-stratus-prefs',
    default='browser/branding/stratus/stratus-defaults.js',
    help='Path to Stratus default preferences'
)

set_config('STRATUS_PREFS', option.with_stratus_prefs)
```

### Task 2.2: Rebrand Application Resources

**File: `browser/branding/stratus/brand.properties`**

```properties
# Stratus Browser Branding
# Used for window titles, menus, about page

# Product Name
brandShortName=Stratus
brandFullName=Stratus Browser
brandCompanyName=Stratus Project

# Descriptions
brandMozillaNotice=Based on Firefox and Floorp
brandProductNotice=Stratus Browser is a privacy-focused browser built on Gecko

# Update
brandUpdateURL=https://updates.stratus-browser.org/

# Telemetry
brandTelemetryURL=https://telemetry.stratus-browser.org/

# Support
brandSupportURL=https://support.stratus-browser.org/
brandHelpURL=https://help.stratus-browser.org/

# Privacy
brandPrivacyURL=https://stratus-browser.org/privacy
termsURL=https://stratus-browser.org/terms

# Community
communityURL=https://github.com/Stratus-Browser/
```

**File: `browser/branding/stratus/brand.dtd`**

```dtd
<!ENTITY brandShortName "Stratus">
<!ENTITY brandFullName "Stratus Browser">
<!ENTITY brandProductName "Stratus">
<!ENTITY brandCompanyName "Stratus Project">

<!-- About page -->
<!ENTITY aboutBrand "About &brandShortName;">
<!ENTITY aboutVersion "Version">
<!ENTITY userAgent "User Agent">

<!-- Menu items -->
<!ENTITY brandMenuName "&brandShortName;">
<!ENTITY genericName "Browser">

<!-- Window title template -->
<!ENTITY titleWindowsTitlebar "&brandFullName;">

<!-- Shortcuts -->
<!ENTITY brandShortNameUppercase "STRATUS">
```

**File: `browser/branding/stratus/stratus-defaults.js`**

```javascript
// Stratus Browser Default Preferences
// These set sensible defaults for privacy, UI, and features

// ============================================================================
// BRANDING & IDENTIFICATION
// ============================================================================

// About page details
pref("startup.homepage_welcome_url", "https://stratus-browser.org/welcome");
pref("startup.homepage_override_url", "https://stratus-browser.org/");

// ============================================================================
// PRIVACY & SECURITY
// ============================================================================

// Enhanced tracking protection (default: strict)
pref("privacy.trackingprotection.enabled", true);
pref("privacy.trackingprotection.socialtracking.enabled", true);
pref("privacy.trackingprotection.cryptomining.enabled", true);
pref("privacy.trackingprotection.fingerprinting.enabled", true);

// Cookie restrictions
pref("network.cookie.cookieBehavior", 4); // Reject trackers

// Do Not Track
pref("privacy.donottrackheader.enabled", true);

// HTTPS-only mode
pref("dom.security.https_only_mode", true);
pref("dom.security.https_only_mode_ever_enabled", true);

// DNS over HTTPS
pref("network.trr.mode", 2); // Preferred

// ============================================================================
// UI & CUSTOMIZATION
// ============================================================================

// Noraneko overlay enabled
pref("floorp.browser.nora.enabled", true);

// Vertical tabs support
pref("floorp.tabbar.style.current", "horizontal");

// Design system (Stratus)
pref("floorp.design.configs.useSystemAccent", false);
pref("floorp.design.configs.accent", "#6c5ce7");  // Stratus purple

// Workspaces enabled
pref("floorp.workspace.enabled", true);

// Split-view enabled
pref("floorp.split-view.enabled", true);

// ============================================================================
// DEVELOPER EXPERIENCE
// ============================================================================

// Developer tools enabled by default (dev/nightly builds)
pref("devtools.enabled", true);

// Web console enabled
pref("devtools.webconsole.enabled", true);

// ============================================================================
// PERFORMANCE
// ============================================================================

// Preload enabled
pref("network.preload", true);

// Speculative connections
pref("network.speculativeconnect.enabled", true);

// ============================================================================
// TELEMETRY
// ============================================================================

// Telemetry opt-out (Stratus is privacy-first)
pref("datareporting.policy.dataSubmissionPolicyAcceptedVersion", 2);
pref("datareporting.policy.dataSubmissionPolicyNotifiedTime", "1");

// Disable telemetry
pref("toolkit.telemetry.enabled", false);
pref("toolkit.telemetry.archive.enabled", false);
pref("datareporting.healthreport.uploadEnabled", false);

// ============================================================================
// POCKET & SPONSORED CONTENT
// ============================================================================

// Disable Pocket integration
pref("extensions.pocket.enabled", false);

// Disable sponsored shortcuts
pref("browser.newtabpage.activity-stream.showSponsored", false);
pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
```

**Image Assets: `browser/branding/stratus/`**

```
icons/
├── aboutIcon.png (256x256, Stratus logo)
├── aboutIcon@2x.png (512x512, HiDPI)
├── favicon.ico (16x16, 32x32, 48x48)
├── default16.png (16x16 application icon)
├── default32.png (32x32 application icon)
├── default48.png (48x48 application icon)
└── default256.png (256x256 application icon)

branding.nsi (Windows installer branding)
├── InstallHeaderImage.bmp (150x57)
├── InstallWizardImage.bmp (164x314)
└── UninstallHeaderImage.bmp (150x57)
```

---

## M2.5.3: Build & Validate Runtime

### Task 3.1: Bootstrap Build Environment

**Command:**

```bash
cd ~/.stratus-dev/stratus-runtime

# Bootstrap (downloads dependencies, validates environment)
./mach bootstrap --application=browser

# Expected: Prompts for platform, installs required packages
```

**Expected Output:**
```
Python version: 3.11.9 ✓
Visual Studio 2022 ✓
NASM ✓
Perl ✓

Bootstrapping complete. Ready to build.
```

### Task 3.2: Build Stratus Runtime

**Command:**

```bash
./mach build --jobs=4  # Parallel compilation, 4 threads
# (adjust --jobs based on CPU cores)
```

**Timeline:**
- Clean build: 45-90 minutes (first time)
- Incremental: 5-15 minutes
- Final artifact: `obj-x86_64-pc-linux-gnu/dist/` (or platform equivalent)

**Expected Output:**
```
Compiling browser...
Linking...
Build complete. Output: /path/to/obj-x86_64-pc-linux-gnu/dist/

Artifact size: ~80MB (Linux), ~120MB (Windows), ~100MB (macOS)
```

### Task 3.3: Package & Test Build

**Command:**

```bash
# Create installation package
./mach package

# Output: stratus-*.tar.bz2 (Linux), stratus-*.msi (Windows), stratus-*.dmg (macOS)

# Run basic smoke tests
./mach test-package

# Verify branding
./mach help | grep -i stratus
```

**Verification Checklist:**
- [ ] Binary exists at expected path
- [ ] Window title shows "Stratus Browser"
- [ ] About page shows Stratus branding
- [ ] Preferences file loads without errors
- [ ] Noraneko overlay not yet injected (runtime doesn't include chrome layer)
- [ ] No build warnings/errors

### Task 3.4: Update floorp-runtime.lock.json

**Current:**
```json
{
  "runtime": {
    "name": "floorp-runtime",
    "version": "153.0.3.3",
    "commit": "2d38da4d11be1e0e615f4ddd785ad5e77c95e18d",
    "source": "https://github.com/Floorp-Projects/floorp-runtime"
  }
}
```

**Updated:**
```json
{
  "runtime": {
    "name": "stratus-runtime",
    "version": "1.0.0-dev",
    "commit": "{NEW_COMMIT_SHA}",
    "source": "https://github.com/{USERNAME}/stratus-runtime",
    "upstream": {
      "name": "floorp-runtime",
      "version": "153.0.3.3",
      "commit": "2d38da4d11be1e0e615f4ddd785ad5e77c95e18d",
      "source": "https://github.com/Floorp-Projects/floorp-runtime"
    },
    "build": {
      "platform": "windows-x64",
      "timestamp": "2026-08-09T03:35:07Z",
      "artifacts": {
        "binary": "stratus-runtime-1.0.0-dev.exe",
        "sha256": "{COMPUTED_HASH}"
      }
    }
  }
}
```

**File Location:** `floorp/floorp-runtime.lock.json`

**Update Script:**

```bash
# After successful build:
COMMIT=$(git rev-parse HEAD)
PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
BINARY_PATH="obj-*-*-linux-gnu/dist/stratus"
HASH=$(sha256sum "$BINARY_PATH" | cut -d' ' -f1)

# Update lock file
jq ".runtime.commit = \"$COMMIT\" | .build.platform = \"$PLATFORM\" | .build.artifacts.sha256 = \"$HASH\"" floorp-runtime.lock.json > floorp-runtime.lock.json.new
mv floorp-runtime.lock.json.new floorp-runtime.lock.json

# Commit
git add floorp-runtime.lock.json
git commit -m "build: M2.5.3 — update runtime lock for Stratus v1.0.0-dev"
```

---

## Dependencies & Blockers

### External Dependencies:
- GitHub access for fork/push
- Upstream floorp-runtime stability
- Build tool availability (VS 2022, LLVM, etc.)

### Internal Dependencies:
- M4 Phase 2 complete (done ✓)
- Noraneko overlay finalized (required before runtime integration)

### Potential Blockers:
1. **Build environment issues** → Mitigation: Comprehensive platform docs above
2. **Upstream changes breaking** → Mitigation: Pin specific commit, test against upstream regularly
3. **Storage constraints** → Mitigation: Clean build artifacts after packaging
4. **Signing keys missing** → Mitigation: Generate self-signed for dev, obtain official keys for release

---

## Success Criteria

- [ ] Fork created and pushed
- [ ] `.mozconfig` working on all platforms (Windows, macOS, Linux)
- [ ] Build completes without errors
- [ ] Branding appears in about:, window titles
- [ ] Runtime binary packaged successfully
- [ ] floorp-runtime.lock.json updated with new commit
- [ ] Git history clean and documented

---

## Next Steps (After M2.5.3)

1. **Integrate runtime into browser-dev build**
   - Update feles-build to use stratus-runtime
   - Test full build pipeline
   
2. **CI/CD for runtime** (Release phase)
   - Nightly builds
   - Automated testing
   - Release packaging

3. **Distribution** (Release phase)
   - Update channels setup
   - Code signing
   - User update flow

---

## References

- Floorp Runtime: https://github.com/Floorp-Projects/floorp-runtime
- Mozilla Build Docs: https://firefox-source-docs.mozilla.org/build/index.html
- Gecko ESR 153: https://wiki.mozilla.org/Firefox/Releases/153
- Stratus Architecture: `floorp/ARCHITECTURE.md`
