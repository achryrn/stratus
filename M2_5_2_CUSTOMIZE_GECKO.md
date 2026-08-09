# M2.5.2: Update Gecko Configuration & Rebrand Resources

**Status:** Planning  
**Deliverables:**
1. moz.configure updates for Stratus-specific options
2. Branding resources finalized (properties, DTD, images)
3. Default preferences configured (stratus-defaults.js)
4. Resource package validated

---

## Overview

M2.5.2 customizes the Gecko build for Stratus by:
1. Extending `moz.configure` with Stratus feature detection
2. Implementing branded resources (icons, strings, properties)
3. Setting privacy-focused default preferences
4. Validating configuration syntax

This ensures the runtime identifies itself as "Stratus" throughout the UI and respects Stratus defaults.

---

## Task 1: Update moz.configure

**File: `browser/branding/stratus/moz.configure` (new)**

Purpose: Add Stratus-specific build options to Gecko's configuration system

```python
# -*- Mode: python; indent-tabs-mode: nil; tab-width: 40 -*-
# vim: set filetype=python:

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Stratus Browser Runtime Configuration
Customizations for Stratus (Floorp-based, independent runtime)
"""

from __future__ import absolute_import, print_function, unicode_literals

from mozbuild.util import ReadOnlyNamespace

# ============================================================================
# STRATUS BRANDING CONFIGURATION
# ============================================================================

@depends(check_build_environment, '--help')
@checking('for Stratus branding')
def stratus_branding(build_env, _):
    """Enable Stratus branding and customization"""
    return True

set_config('STRATUS_BRANDING', stratus_branding)

# ============================================================================
# STRATUS VERSION
# ============================================================================

option(
    '--with-stratus-version',
    nargs=1,
    default=['1.0.0-dev'],
    help='Stratus version string (e.g., 1.0.0-beta.1)'
)

@depends('--with-stratus-version')
def stratus_version(value):
    return value[0] if value else '1.0.0-dev'

set_config('STRATUS_VERSION', stratus_version)
set_define('STRATUS_VERSION', stratus_version)

# ============================================================================
# STRATUS UPDATE CHANNEL
# ============================================================================

option(
    '--with-stratus-channel',
    choices=['release', 'beta', 'nightly'],
    default='release',
    help='Stratus update channel (release, beta, nightly)'
)

@depends('--with-stratus-channel')
def stratus_channel(value):
    channels = {
        'release': 'release',
        'beta': 'beta',
        'nightly': 'nightly',
    }
    return channels.get(value, 'release')

set_config('STRATUS_CHANNEL', stratus_channel)
set_define('STRATUS_CHANNEL', stratus_channel)

# ============================================================================
# FEATURE TOGGLES
# ============================================================================

option(
    '--enable-stratus-features',
    default=True,
    help='Enable Stratus-specific features'
)

@depends('--enable-stratus-features')
def stratus_features_enabled(value):
    return value

set_config('STRATUS_FEATURES', stratus_features_enabled)

# ============================================================================
# UPDATE CONFIGURATION
# ============================================================================

option(
    '--with-stratus-update-url',
    nargs=1,
    default=['https://updates.stratus-browser.org'],
    help='Stratus update server URL'
)

@depends('--with-stratus-update-url')
def stratus_update_url(value):
    return value[0] if value else 'https://updates.stratus-browser.org'

set_config('STRATUS_UPDATE_URL', stratus_update_url)
set_define('STRATUS_UPDATE_URL', stratus_update_url)

# ============================================================================
# TELEMETRY CONFIGURATION
# ============================================================================

option(
    '--with-stratus-telemetry-url',
    nargs=1,
    default=['https://telemetry.stratus-browser.org'],
    help='Stratus telemetry endpoint URL'
)

@depends('--with-stratus-telemetry-url')
def stratus_telemetry_url(value):
    return value[0] if value else 'https://telemetry.stratus-browser.org'

set_config('STRATUS_TELEMETRY_URL', stratus_telemetry_url)
set_define('STRATUS_TELEMETRY_URL', stratus_telemetry_url)

# ============================================================================
# CUSTOMIZATION SETTINGS
# ============================================================================

option(
    '--with-stratus-homepage',
    nargs=1,
    default=['https://stratus-browser.org'],
    help='Stratus homepage URL'
)

@depends('--with-stratus-homepage')
def stratus_homepage(value):
    return value[0] if value else 'https://stratus-browser.org'

set_config('STRATUS_HOMEPAGE', stratus_homepage)

option(
    '--with-stratus-support-url',
    nargs=1,
    default=['https://support.stratus-browser.org'],
    help='Stratus support/help URL'
)

@depends('--with-stratus-support-url')
def stratus_support_url(value):
    return value[0] if value else 'https://support.stratus-browser.org'

set_config('STRATUS_SUPPORT_URL', stratus_support_url)

# ============================================================================
# PRIVACY DEFAULTS
# ============================================================================

option(
    '--enable-stratus-privacy-defaults',
    default=True,
    help='Apply Stratus privacy-first defaults'
)

@depends('--enable-stratus-privacy-defaults')
def stratus_privacy_defaults(value):
    return value

set_config('STRATUS_PRIVACY_DEFAULTS', stratus_privacy_defaults)

# ============================================================================
# OUTPUT CONFIGURATION
# ============================================================================

# Summary of Stratus configuration
@depends(stratus_branding, stratus_version, stratus_channel)
def stratus_config_summary(branding, version, channel):
    if branding:
        return '\n'.join([
            'Stratus Runtime Configuration:',
            '  Version: {}'.format(version),
            '  Channel: {}'.format(channel),
            '  Branding: Enabled',
        ])
    return 'Stratus branding disabled'

# Print summary (shown during build)
@depends_all()
@checking('Stratus build configuration')
def stratus_build_info(_):
    return True
```

**Integration: Add to `browser/branding/stratus/moz.configure`**

---

## Task 2: Implement Branding Resources

### 2.1: Localization Strings

**File: `browser/branding/stratus/brand.properties`**

```properties
# Stratus Browser Branding Properties
# Used in about: pages, menus, and window titles

# ============================================================================
# Product Identity
# ============================================================================

brandShortName=Stratus
brandFullName=Stratus Browser
brandProductName=Stratus
brandCompanyName=Stratus Project
brandOfficialBranding=Stratus Browser

# ============================================================================
# Descriptive Text
# ============================================================================

brandMozillaNotice=Based on Firefox and Floorp
brandProductNotice=Stratus Browser is a privacy-focused browser built on Gecko

# ============================================================================
# URLs
# ============================================================================

# Update and telemetry
brandUpdateURL=https://updates.stratus-browser.org/
brandTelemetryURL=https://telemetry.stratus-browser.org/

# Help and support
brandSupportURL=https://support.stratus-browser.org/
brandHelpURL=https://help.stratus-browser.org/
brandReportAbusePath=https://support.stratus-browser.org/report/
brandReportPhishingURL=https://support.stratus-browser.org/phishing/

# Legal and privacy
brandPrivacyURL=https://stratus-browser.org/privacy
termsURL=https://stratus-browser.org/terms
licenseURL=https://stratus-browser.org/license

# Community
communityURL=https://github.com/Stratus-Browser/
feedbackURL=https://github.com/Stratus-Browser/stratus-browser/issues

# ============================================================================
# Menus and UI
# ============================================================================

brandMenuName=&Stratus
genericName=Browser
titleSeparator= — 

# ============================================================================
# About Page
# ============================================================================

aboutBrand=&Stratus Browser
aboutVersion=Version
userAgent=User Agent
iD=Installation ID

# ============================================================================
# Preferences
# ============================================================================

prefsTitle=Stratus Preferences
preferencesWindowTitleMac=Stratus Preferences
preferencesCategoryTitle=&Stratus
```

**File: `browser/branding/stratus/brand.dtd`**

```dtd
<!-- Stratus Browser Branding DTD -->
<!-- Used in XUL/HTML templates -->

<!ENTITY brandShortName "Stratus">
<!ENTITY brandFullName "Stratus Browser">
<!ENTITY brandProductName "Stratus">
<!ENTITY brandCompanyName "Stratus Project">

<!-- About page -->
<!ENTITY aboutBrand "About &brandShortName;">
<!ENTITY genericName "Browser">
<!ENTITY version "Version">
<!ENTITY userAgent "User Agent">

<!-- Menu items -->
<!ENTITY brandMenuName "&brandShortName;">

<!-- Window titles (platform specific) -->
<!ENTITY titleWindowsTitlebar "&brandFullName;">
<!ENTITY titleMacDefault "&brandFullName;">

<!-- Dialog titles -->
<!ENTITY prefsTitle "&brandShortName; Preferences">
<!ENTITY prefsWindowTitle "&brandShortName;">

<!-- Legal notice -->
<!ENTITY legalNotice "Based on Firefox and Floorp">

<!-- Support links -->
<!ENTITY supportLink "https://support.stratus-browser.org/">
<!ENTITY privacyLink "https://stratus-browser.org/privacy">
```

**File: `browser/branding/stratus/locales/en-US/brand.properties`** (English localization)

```properties
# English localization fallback
brandShortName=Stratus
brandFullName=Stratus Browser
brandProductName=Stratus

# URLs for English locale
brandSupportURL=https://support.stratus-browser.org/en/
brandHelpURL=https://help.stratus-browser.org/en/
brandPrivacyURL=https://stratus-browser.org/privacy
```

### 2.2: Default Preferences

**File: `browser/branding/stratus/stratus-defaults.js`**

```javascript
// Stratus Browser Default Preferences
// ============================================================================
// This file sets sensible defaults for privacy, security, and UI.
// Users can override these in their profile preferences.
// ============================================================================

// ============================================================================
// BRANDING & IDENTIFICATION
// ============================================================================

// Application name (shown in about:)
pref("app.name", "Stratus");
pref("app.version", "1.0.0");

// Homepage
pref("browser.startup.homepage", "https://stratus-browser.org/");
pref("startup.homepage_welcome_url", "https://stratus-browser.org/welcome");

// New tab page
pref("browser.newtab.preload", true);

// ============================================================================
// PRIVACY & SECURITY
// ============================================================================

// Enhanced Tracking Protection (ETP)
pref("privacy.trackingprotection.enabled", true);
pref("privacy.trackingprotection.socialtracking.enabled", true);
pref("privacy.trackingprotection.cryptomining.enabled", true);
pref("privacy.trackingprotection.fingerprinting.enabled", true);

// Cookie behavior (restrict cross-site tracking)
pref("network.cookie.cookieBehavior", 4);  // Reject all third-party cookies

// Do Not Track (DNT)
pref("privacy.donottrackheader.enabled", true);

// HTTPS-only mode
pref("dom.security.https_only_mode", true);
pref("dom.security.https_only_mode_ever_enabled", true);

// DNS over HTTPS (DoH)
pref("network.trr.mode", 2);  // Preferred
pref("network.trr.uri", "https://mozilla.cloudflare-dns.com/dns-query");

// Safe browsing
pref("browser.safebrowsing.enabled", true);
pref("browser.safebrowsing.phishing.enabled", true);

// Certificate pinning
pref("security.cert_pinning.enforcement_level", 2);  // Strict

// ============================================================================
// NETWORK & PERFORMANCE
// ============================================================================

// DNS prefetch
pref("network.dns.disablePrefetch", false);

// Speculative connection
pref("network.http.speculative-parallel-limit", 6);

// Connection keep-alive
pref("network.http.keep-alive.timeout", 300);

// ============================================================================
// UI & CUSTOMIZATION
// ============================================================================

// Noraneko overlay (Stratus UI layer)
pref("floorp.browser.nora.enabled", true);

// Vertical tabs support
pref("floorp.tabbar.style.current", "horizontal");
pref("floorp.tabbar.style.multirow.maxRow", 3);

// Design system (Stratus theme)
pref("floorp.design.configs.useSystemAccent", false);
pref("floorp.design.configs.accent", "#6c5ce7");  // Stratus purple

// Workspaces
pref("floorp.workspace.enabled", true);
pref("floorp.workspace.default", "Default");

// Split-view
pref("floorp.split-view.enabled", true);

// Tab bar customization
pref("browser.tabs.drawInTitlebar", true);
pref("browser.tabs.inTitlebar", 1);

// ============================================================================
// TELEMETRY & DATA COLLECTION
// ============================================================================

// Mozilla telemetry disabled (Stratus is privacy-first)
pref("toolkit.telemetry.enabled", false);
pref("toolkit.telemetry.archive.enabled", false);

// Health report disabled
pref("datareporting.healthreport.uploadEnabled", false);

// Crash reporter (disabled)
pref("breakpad.reportURL", "");

// Studies disabled
pref("experiments.enabled", false);
pref("datareporting.policy.dataSubmissionPolicyAcceptedVersion", 2);

// ============================================================================
// THIRD-PARTY SERVICES
// ============================================================================

// Pocket disabled (Stratus uses curated content instead)
pref("extensions.pocket.enabled", false);
pref("extensions.pocket.showHome", false);

// Sponsored content disabled
pref("browser.newtabpage.activity-stream.showSponsored", false);
pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);

// ============================================================================
// SEARCH & SUGGESTIONS
// ============================================================================

// Search suggestions
pref("browser.search.suggest.enabled", true);
pref("browser.search.suggest.enabled.private", false);

// Default search engine (DuckDuckGo for privacy)
pref("browser.search.defaultenginename", "DuckDuckGo");

// Search bar enabled
pref("browser.search.widget.inNavBar", true);

// ============================================================================
// DEVELOPER EXPERIENCE
// ============================================================================

// Developer tools enabled
pref("devtools.enabled", true);
pref("devtools.console.enabled", true);

// Web Console
pref("devtools.webconsole.enabled", true);

// Debugger
pref("devtools.debugger.enabled", true);

// Source maps
pref("devtools.source-map.client-service.enabled", true);

// ============================================================================
// PERFORMANCE & OPTIMIZATION
// ============================================================================

// Memory optimization
pref("browser.sessionstore.max_tabs_undo", 10);

// Network optimization
pref("network.http.pipelining", false);

// Preload
pref("network.preload", true);

// ============================================================================
// ACCESSIBILITY
// ============================================================================

// Underline links
pref("browser.underline_links", false);

// Keyboard navigation
pref("accessibility.typeaheadfind.flashBar", 2);

// Color contrast
pref("browser.display.focus_ring_on_any_element", true);

// ============================================================================
// SECURITY POLICIES
// ============================================================================

// Content Security Policy (CSP)
pref("security.csp.enable", true);

// Subresource integrity
pref("security.sri.enable", true);

// Cross-Origin Policy
pref("security.corp.enable", true);

// ============================================================================
// EXTENSIONS & ADD-ONS
// ============================================================================

// Extension updates
pref("extensions.update.enabled", true);
pref("extensions.update.autoUpdateDefault", true);

// Recommended extensions
pref("extensions.recommendations.hideNotice", false);

// ============================================================================
// UPDATES
// ============================================================================

// Automatic updates enabled
pref("app.update.enabled", true);
pref("app.update.auto", true);

// Update channel (set by build system)
pref("app.update.channel", "release");

// ============================================================================
// MISC
# ============================================================================

// Pocket recommendations disabled
pref("browser.pocket.recommendationsEnabled", false);

// Firefox home customization
pref("browser.firefox_home.top_sites.enabled", true);

// Startup
pref("startup.homepage_override_url", "https://stratus-browser.org/");
pref("startup.homepage_welcome_url", "https://stratus-browser.org/welcome");
```

### 2.3: Application Icons

**File: `browser/branding/stratus/icon-data.json`**

```json
{
  "icons": {
    "about": {
      "16": "about16.png",
      "32": "about32.png",
      "48": "about48.png",
      "64": "about64.png",
      "128": "about128.png",
      "256": "about256.png"
    },
    "application": {
      "16": "default16.png",
      "32": "default32.png",
      "48": "default48.png",
      "128": "default128.png",
      "256": "default256.png"
    },
    "favicon": {
      "16": "favicon16.png",
      "32": "favicon32.png",
      "48": "favicon48.png"
    }
  },
  "colors": {
    "primary": "#6c5ce7",
    "secondary": "#5f3dc4",
    "accent": "#6c5ce7",
    "background": "#ffffff",
    "text": "#1a1a1a"
  }
}
```

**Icon Generation Requirements:**

- `about16.png` - 16x16, used in about: page (low res)
- `about32.png` - 32x32, standard
- `about48.png` - 48x48, standard
- `about64.png` - 64x64, high res
- `about128.png` - 128x128, very high res
- `about256.png` - 256x256, ultra high res
- `default16.png` - 16x16, taskbar
- `default32.png` - 32x32, standard app icon
- `default48.png` - 48x48, standard
- `default128.png` - 128x128, high res
- `default256.png` - 256x256, ultra high res
- `favicon16.png` - 16x16, tab favicon
- `favicon32.png` - 32x32, bookmark favicon
- `favicon48.png` - 48x48, high res favicon

**Format:** PNG with alpha channel, must include:
- Stratus logo/mark (purple, #6c5ce7)
- Clear at all sizes
- Distinct from Firefox/Floorp icons

---

## Task 3: Validate Configuration

**Validation Script: `validate-branding.sh`**

```bash
#!/bin/bash
# Validate Stratus branding configuration

set -e

BRANDING_DIR="browser/branding/stratus"
ERRORS=0

echo "Validating Stratus branding configuration..."
echo ""

# Check required files
required_files=(
  "brand.properties"
  "brand.dtd"
  "stratus-defaults.js"
  "moz.configure"
)

for file in "${required_files[@]}"; do
  if [ -f "$BRANDING_DIR/$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (MISSING)"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# Validate JavaScript syntax
if command -v node &> /dev/null; then
  echo "Validating JavaScript syntax..."
  for js_file in "$BRANDING_DIR"/*.js; do
    if node -c "$js_file" 2>/dev/null; then
      echo "✓ $(basename $js_file)"
    else
      echo "✗ $(basename $js_file) (SYNTAX ERROR)"
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "⚠ Node not found, skipping JS validation"
fi

echo ""

# Validate Python (moz.configure)
if command -v python3 &> /dev/null; then
  echo "Validating Python syntax..."
  if python3 -m py_compile "$BRANDING_DIR/moz.configure" 2>/dev/null; then
    echo "✓ moz.configure"
  else
    echo "✗ moz.configure (SYNTAX ERROR)"
    ERRORS=$((ERRORS + 1))
  fi
fi

echo ""

# Check localization files
if [ -d "$BRANDING_DIR/locales/en-US" ]; then
  echo "✓ Localization directory"
  if [ -f "$BRANDING_DIR/locales/en-US/brand.properties" ]; then
    echo "✓ English localization"
  else
    echo "⚠ English localization (MISSING)"
  fi
else
  echo "✗ Localization directory (MISSING)"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Check for branding strings
if grep -q "brandShortName" "$BRANDING_DIR/brand.properties" 2>/dev/null; then
  echo "✓ Branding strings present"
else
  echo "✗ Branding strings (MISSING)"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Summary
if [ $ERRORS -eq 0 ]; then
  echo "✓ All validations passed!"
  exit 0
else
  echo "✗ $ERRORS validation(s) failed"
  exit 1
fi
```

---

## Task 4: Integration with .mozconfig

**Update: `.mozconfig`**

```bash
# Add to existing .mozconfig:

ac_add_options --with-stratus-version="1.0.0-dev"
ac_add_options --with-stratus-channel="nightly"
ac_add_options --enable-stratus-features
ac_add_options --enable-stratus-privacy-defaults
ac_add_options --with-stratus-update-url="https://updates.stratus-browser.org"
ac_add_options --with-stratus-telemetry-url="https://telemetry.stratus-browser.org"
ac_add_options --with-stratus-homepage="https://stratus-browser.org"
ac_add_options --with-stratus-support-url="https://support.stratus-browser.org"
```

---

## Implementation Steps

**Execute in order:**

```bash
cd ~/.stratus-dev/stratus-runtime

# 1. Create moz.configure
cat > browser/branding/stratus/moz.configure << 'EOF'
[Content from Task 1 above]
EOF

# 2. Create brand strings
cat > browser/branding/stratus/brand.properties << 'EOF'
[Content from Task 2.1 above]
EOF

cat > browser/branding/stratus/brand.dtd << 'EOF'
[Content from Task 2.1 above]
EOF

# 3. Create default preferences
cat > browser/branding/stratus/stratus-defaults.js << 'EOF'
[Content from Task 2.2 above]
EOF

# 4. Create localization directory
mkdir -p browser/branding/stratus/locales/en-US
cat > browser/branding/stratus/locales/en-US/brand.properties << 'EOF'
[English localization from Task 2.1]
EOF

# 5. Create icon metadata
cat > browser/branding/stratus/icon-data.json << 'EOF'
[Content from Task 2.3 above]
EOF

# 6. Create validation script
cat > validate-branding.sh << 'EOF'
[Script from Task 3 above]
EOF
chmod +x validate-branding.sh

# 7. Validate
./validate-branding.sh

# 8. Commit
git add browser/branding/stratus/
git commit -m "feat: M2.5.2 — Stratus branding, preferences, and configuration"
```

---

## Expected Output After M2.5.2

```
browser/branding/stratus/
├── moz.configure                    ← Build configuration
├── brand.properties                 ← UI strings
├── brand.dtd                        ← DTD templates
├── stratus-defaults.js              ← Default preferences
├── icon-data.json                   ← Icon metadata
├── locales/
│   └── en-US/
│       └── brand.properties         ← English strings
├── windows/                         (if present)
│   ├── branding.nsi
│   ├── InstallHeaderImage.bmp
│   ├── InstallWizardImage.bmp
│   └── UninstallHeaderImage.bmp
└── icons/                           (added later)
    ├── about*.png
    ├── default*.png
    └── favicon*.png
```

---

## Validation Checklist

- [ ] `moz.configure` syntax valid (Python)
- [ ] `brand.properties` has all required strings
- [ ] `brand.dtd` has all required entities
- [ ] `stratus-defaults.js` syntax valid (JavaScript)
- [ ] Localization directory structure correct
- [ ] No undefined string references
- [ ] Privacy defaults sensible and documented
- [ ] URLs point to Stratus domains (not Floorp)
- [ ] Version strings consistent across files
- [ ] Commit message clear and descriptive

---

## Next Steps (M2.5.3)

- Build with new configuration
- Verify "Stratus" appears in about:, window titles
- Test preference loading
- Validate branding appears throughout UI
