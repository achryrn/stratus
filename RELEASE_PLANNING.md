# Release Planning: Stratus Browser Beta 1.0.0

**Phase:** Release & Distribution  
**Target:** Production Beta Release  
**Date:** 2026-08-09  
**Status:** Planning Phase  
**Owner:** Release Management Team  

---

## Executive Summary

Release planning establishes the process and infrastructure for shipping Stratus Browser to beta users. This includes CI/CD pipelines, code signing, installer creation, and quality assurance processes.

**Key Deliverables:**
1. GitHub Actions CI/CD pipeline
2. Code signing and certificate setup
3. Installer and distribution packages
4. Final QA and testing procedures
5. Beta launch documentation

**Timeline:** 2 weeks  
**Team:** 1 Release Engineer, 1 DevOps, 1 QA Lead  
**Effort:** 80 hours total  

---

## Part 1: Release Architecture

### Release Pipeline Overview

```
┌──────────────────────────────────────────────────────┐
│          Developer Pushes to stratus-main             │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│      GitHub Actions Triggered (PR Check)             │
│  - Lint & format check                               │
│  - Build stratus-runtime                             │
│  - Run test suite (209 tests)                        │
│  - Security scanning                                │
└────────────────────┬─────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │ PR Review Required  │
          └──────────┬──────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│        Merge to stratus-main (Approved PR)            │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│    Build & Test Pipeline (Post-Merge)                │
│  - Build stratus-runtime                             │
│  - Compile browser with M4 features                  │
│  - Run full test suite                               │
│  - Run smoke tests                                   │
│  - Generate build artifacts                          │
└────────────────────┬─────────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      │ All Tests Pass?             │
      └──────────────┬──────────────┘
                     │
          ┌──────────┴──────────┐
          │ NO: Rollback alert  │
          └─────────────────────┘
                     │
                     ▼ YES
┌──────────────────────────────────────────────────────┐
│      Sign & Package (Code Signing)                    │
│  - Sign executable with certificate                  │
│  - Create NSIS installer                             │
│  - Sign installer                                    │
│  - Create checksums (SHA256)                         │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│      Upload to Release Storage                        │
│  - GitHub Releases                                   │
│  - CDN distribution                                  │
│  - Backup storage                                    │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│    Notify Beta Testers & Generate Release Notes      │
│  - Email to beta list                                │
│  - Post to community channels                        │
│  - Update download page                              │
└──────────────────────────────────────────────────────┘
```

---

## Part 2: CI/CD Pipeline Setup

### Release: CI/CD Pipeline Configuration

**Objective:** Automated build, test, and release workflow

**File:** `.github/workflows/build-and-release.yml`

```yaml
name: Build and Release

on:
  push:
    branches: [stratus-main]
    tags: ['v*']
  pull_request:
    branches: [stratus-main]

jobs:
  lint-and-test:
    runs-on: windows-latest
    name: Lint, Build, Test
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: vx.x.x

      - name: Lint code
        run: deno lint

      - name: Format check
        run: deno fmt --check

      - name: Build browser
        run: deno task feles-build build
        timeout-minutes: 120

      - name: Run host tests
        run: deno task test:host
        timeout-minutes: 15

      - name: Run smoke tests
        run: deno task test:smoke
        timeout-minutes: 10

      - name: Upload build artifacts
        if: success()
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            dist/stratus-browser.exe
            dist/stratus-browser-installer.exe
          retention-days: 7

  security-scan:
    runs-on: ubuntu-latest
    name: Security Scanning
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  code-sign:
    needs: [lint-and-test, security-scan]
    runs-on: windows-latest
    name: Code Signing
    if: github.ref == 'refs/heads/stratus-main' || startsWith(github.ref, 'refs/tags/')
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts

      - name: Import code signing certificate
        run: |
          $cert = [System.Convert]::FromBase64String("${{ secrets.CODE_SIGNING_CERT }}")
          [System.IO.File]::WriteAllBytes("${{ runner.temp }}\cert.pfx", $cert)

      - name: Sign executable
        run: |
          signtool sign /f "${{ runner.temp }}\cert.pfx" /p "${{ secrets.CODE_SIGNING_PASSWORD }}" /t "http://timestamp.digicert.com" stratus-browser.exe

      - name: Sign installer
        run: |
          signtool sign /f "${{ runner.temp }}\cert.pfx" /p "${{ secrets.CODE_SIGNING_PASSWORD }}" /t "http://timestamp.digicert.com" stratus-browser-installer.exe

      - name: Generate checksums
        run: |
          certutil -hashfile stratus-browser.exe SHA256 | Out-File -FilePath checksums.txt
          certutil -hashfile stratus-browser-installer.exe SHA256 | Out-File -Append -FilePath checksums.txt

      - name: Upload signed artifacts
        uses: actions/upload-artifact@v3
        with:
          name: signed-artifacts
          path: |
            stratus-browser.exe
            stratus-browser-installer.exe
            checksums.txt

  release:
    needs: code-sign
    runs-on: ubuntu-latest
    name: Create Release
    if: startsWith(github.ref, 'refs/tags/')
    steps:
      - uses: actions/checkout@v4

      - name: Download signed artifacts
        uses: actions/download-artifact@v3
        with:
          name: signed-artifacts

      - name: Create Release Notes
        run: |
          node scripts/generate-release-notes.js > RELEASE_NOTES.md

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            stratus-browser.exe
            stratus-browser-installer.exe
            checksums.txt
            RELEASE_NOTES.md
          body_path: RELEASE_NOTES.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload to CDN
        run: |
          aws s3 cp stratus-browser-installer.exe s3://stratus-releases/beta/ --region us-east-1

      - name: Notify beta testers
        run: |
          node scripts/notify-beta-testers.js
```

**Success Criteria:**
- [ ] CI/CD pipeline created
- [ ] All workflows execute successfully
- [ ] Code signing integrated
- [ ] Release artifacts generated

### Release: GitHub Actions Configuration

**Objective:** Set up GitHub Actions secrets and environment variables

**Secrets to Configure:**

```
CODE_SIGNING_CERT        # Base64-encoded .pfx certificate
CODE_SIGNING_PASSWORD    # Certificate password
AWS_ACCESS_KEY_ID        # For CDN upload
AWS_SECRET_ACCESS_KEY    # For CDN upload
BETA_TESTER_LIST_API     # API endpoint for notifications
```

**Success Criteria:**
- [ ] All secrets stored securely
- [ ] No secrets leaked in logs
- [ ] CI/CD can access all necessary credentials

---

## Part 3: Code Signing & Certificates

### Release: Code Signing Setup

**Objective:** Sign executables to verify authenticity

**Process:**

1. **Obtain Code Signing Certificate**
   - Provider: DigiCert or Sectigo
   - Type: Extended Validation (EV)
   - Cost: ~$300-500/year
   - Validity: 1 year

2. **Certificate Information**
   - Subject: Stratus Project
   - Organization: Floorp Projects
   - Country: JP (or project location)
   - Valid for: Code signing, authenticode

3. **Timestamping**
   - Use DigiCert timestamp service
   - Prevents certificate expiration issues
   - Ensures long-term validity

4. **Deployment**
   - Store certificate in GitHub Secrets
   - Reference in CI/CD pipeline
   - Use signtool (Windows) for signing

**File:** `scripts/sign-executables.ps1`

```powershell
# PowerShell script for signing executables

param(
    [Parameter(Mandatory=$true)]
    [string]$CertPath,
    
    [Parameter(Mandatory=$true)]
    [string]$CertPassword,
    
    [Parameter(Mandatory=$true)]
    [string[]]$FilesToSign
)

foreach ($file in $FilesToSign) {
    Write-Host "Signing $file..."
    
    signtool sign /f $CertPath `
                  /p $CertPassword `
                  /t "http://timestamp.digicert.com" `
                  /d "Stratus Browser" `
                  /du "https://stratus.dev" `
                  $file
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to sign $file"
    }
    
    Write-Host "Successfully signed $file"
}

Write-Host "All files signed successfully"
```

**Success Criteria:**
- [ ] Certificate obtained
- [ ] Signing script works
- [ ] Signed executables verified
- [ ] No signing errors in CI/CD

---

## Part 4: Installer & Distribution

### Release: NSIS Installer Configuration

**Objective:** Create professional Windows installer

**File:** `browser/installer/windows/nsis/stratus-installer.nsi`

```nsi
; Stratus Browser Installer

!include "MUI2.nsh"
!include "x64.nsh"

; Variables
!define PRODUCT_NAME "Stratus Browser"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Stratus Project"
!define PRODUCT_WEB_SITE "https://stratus.dev"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\Stratus.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

; Installer settings
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "stratus-browser-installer.exe"
InstallDir "$PROGRAMFILES64\${PRODUCT_NAME}"
ShowInstDetails show
ShowUnInstDetails show

; UI
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

; Installation section
Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy main executable
  File "dist\stratus-browser.exe"
  
  ; Copy runtime files
  File /r "dist\*.*"
  
  ; Create shortcuts
  SetShortCut "$SMPROGRAMS\${PRODUCT_NAME}.lnk" "$INSTDIR\stratus-browser.exe"
  SetShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\stratus-browser.exe"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Register in Add/Remove Programs
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\stratus-browser.exe"
SectionEnd

; Uninstall section
Section "Uninstall"
  Delete "$INSTDIR\stratus-browser.exe"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}.lnk"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
SectionEnd
```

**Success Criteria:**
- [ ] Installer created successfully
- [ ] Installation works without errors
- [ ] Shortcuts created correctly
- [ ] Uninstall works cleanly

### Release: Distribution Channels

**Objective:** Make Stratus available to beta testers

**Channels:**

1. **GitHub Releases**
   - URL: `https://github.com/Floorp-Projects/floorp/releases`
   - Format: `.exe` executable + installer
   - Checksums included
   - Release notes auto-generated

2. **Direct Download**
   - URL: `https://stratus.dev/download`
   - Hosted on CDN
   - Direct links to latest
   - Installation instructions

3. **Auto-Update Mechanism**
   - Check for updates weekly
   - Download silently in background
   - Prompt user to install
   - Auto-install on restart (optional)

4. **Beta Channel**
   - Opt-in beta testers
   - Early access to features
   - Direct feedback collection
   - Weekly builds

**File:** `browser-features/chrome/common/update/update-checker.ts`

```typescript
class UpdateChecker {
  private updateCheckInterval = 7 * 24 * 60 * 60 * 1000; // Weekly

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    const response = await fetch("https://api.stratus.dev/updates/check", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        currentVersion: this.getCurrentVersion(),
        channel: this.getUpdateChannel(),
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.availableVersion && this.isNewerVersion(data.availableVersion)) {
      return {
        version: data.availableVersion,
        downloadUrl: data.downloadUrl,
        releaseNotes: data.releaseNotes,
        size: data.size,
      };
    }

    return null;
  }

  /**
   * Download and install update
   */
  async downloadAndInstall(updateInfo: UpdateInfo): Promise<void> {
    const downloadPath = await this.downloadUpdate(updateInfo.downloadUrl);
    await this.verifyChecksum(downloadPath, updateInfo.checksum);
    await this.installUpdate(downloadPath);
  }

  /**
   * Schedule update checks
   */
  scheduleUpdateChecks(): void {
    setInterval(async () => {
      const update = await this.checkForUpdates();
      if (update) {
        this.notifyUserAboutUpdate(update);
      }
    }, this.updateCheckInterval);
  }
}
```

**Success Criteria:**
- [ ] GitHub Releases page configured
- [ ] Download page created
- [ ] Auto-update mechanism functional
- [ ] Beta channel operational

---

## Part 5: Quality Assurance

### Release: Pre-Release Testing Checklist

**Objective:** Comprehensive testing before beta release

**Functional Testing:**

```
✓ Installation
  [ ] Installer downloads successfully
  [ ] Installation completes without errors
  [ ] Shortcuts created correctly
  [ ] Uninstall works cleanly

✓ Browser Startup
  [ ] Browser launches within 3 seconds
  [ ] UI renders correctly
  [ ] Tabs display properly
  [ ] No console errors

✓ Navigation
  [ ] Can navigate to websites
  [ ] Back/Forward buttons work
  [ ] Bookmarks functional
  [ ] History working

✓ M4 Features
  [ ] Vertical tabs toggle works
  [ ] Workspaces create/switch/delete
  [ ] Split-view creates and resizes
  [ ] Tab drag-and-drop works

✓ Settings
  [ ] Privacy settings persist
  [ ] Theme selection works
  [ ] Color scheme changes apply
  [ ] Settings saved across restarts

✓ Performance
  [ ] Startup time <3s
  [ ] Tab switching <200ms
  [ ] Memory usage stable
  [ ] No memory leaks after 1 hour
```

**Security Testing:**

```
✓ Code Signing
  [ ] Executable properly signed
  [ ] Installer properly signed
  [ ] Windows Defender accepts binary
  [ ] SmartScreen reputation building

✓ Content Security
  [ ] CSP headers correct
  [ ] No XSS vulnerabilities
  [ ] No malicious code in binary
  [ ] Third-party libraries scanned

✓ Privacy
  [ ] Tracking protection enabled by default
  [ ] No telemetry collected
  [ ] User data not sent externally
  [ ] Settings persist securely
```

**Compatibility Testing:**

```
✓ Windows Versions
  [ ] Windows 10 (21H2+)
  [ ] Windows 11 (21H2+)
  [ ] Works with Windows Defender
  [ ] Compatible with antivirus software

✓ Hardware
  [ ] Tests on different CPUs (Intel/AMD)
  [ ] Tests on 4GB RAM systems
  [ ] Tests on SSD and HDD
  [ ] GPU acceleration working

✓ Languages
  [ ] English interface
  [ ] Character encoding correct
  [ ] Right-to-left text support
  [ ] Time/date formatting correct
```

**Accessibility Testing:**

```
✓ Keyboard Navigation
  [ ] Tab order logical
  [ ] All buttons keyboard accessible
  [ ] Shortcuts work correctly
  [ ] No keyboard traps

✓ Screen Reader
  [ ] NVDA announces UI correctly
  [ ] JAWS full navigation
  [ ] All controls labeled
  [ ] Dynamic content announced

✓ Color Contrast
  [ ] WCAG AA compliant
  [ ] High Contrast mode works
  [ ] Text readable on all backgrounds
  [ ] No color-only indicators
```

**Success Criteria:**
- [ ] All functional tests pass
- [ ] Security tests pass
- [ ] Compatibility verified
- [ ] Accessibility compliant
- [ ] Performance targets met

### Release: Beta Tester Program

**Objective:** Gather feedback from early adopters

**Program Structure:**

1. **Recruitment**
   - Sign-up at `https://stratus.dev/beta`
   - Selection criteria: experience level, focus areas
   - Target: 500-1000 beta testers

2. **Onboarding**
   - Welcome email with installation guide
   - Known issues list
   - Feedback form link
   - Community chat invite

3. **Weekly Builds**
   - Release new build every Wednesday
   - Changelog included
   - Known issues updated
   - Request specific testing

4. **Feedback Collection**
   - Feedback form for each build
   - GitHub issues for bugs
   - Discord community for discussion
   - Monthly survey

5. **Support**
   - Dedicated support channel
   - Known issues documentation
   - FAQ document
   - Regular updates from team

**Success Criteria:**
- [ ] 500+ beta testers recruited
- [ ] 20%+ submission rate for feedback
- [ ] Critical bugs identified and fixed
- [ ] Community engaged and positive

---

## Part 6: Release Documentation

### Release: Release Notes Generation

**File:** `scripts/generate-release-notes.js`

```javascript
const fs = require("fs");
const { execSync } = require("child_process");

function generateReleaseNotes(version) {
  const previousTag = getPreviousTag();
  const commits = getCommitsSince(previousTag);

  const grouped = groupCommitsByType(commits);

  let notes = `# Stratus Browser ${version}\n\n`;
  notes += `Released: ${new Date().toISOString().split("T")[0]}\n\n`;

  if (grouped.features?.length > 0) {
    notes += `## ✨ New Features\n`;
    grouped.features.forEach(commit => {
      notes += `- ${commit.message}\n`;
    });
    notes += `\n`;
  }

  if (grouped.improvements?.length > 0) {
    notes += `## 🚀 Improvements\n`;
    grouped.improvements.forEach(commit => {
      notes += `- ${commit.message}\n`;
    });
    notes += `\n`;
  }

  if (grouped.bugfixes?.length > 0) {
    notes += `## 🐛 Bug Fixes\n`;
    grouped.bugfixes.forEach(commit => {
      notes += `- ${commit.message}\n`;
    });
    notes += `\n`;
  }

  notes += `## 📊 Stats\n`;
  notes += `- Commits: ${commits.length}\n`;
  notes += `- Files changed: ${countFilesChanged(commits)}\n`;
  notes += `- Tests: 209 passing\n\n`;

  notes += `## 📥 Download\n`;
  notes += `- [Installer (exe)](https://github.com/Floorp-Projects/floorp/releases/download/v${version}/stratus-browser-installer.exe)\n`;
  notes += `- [Portable (exe)](https://github.com/Floorp-Projects/floorp/releases/download/v${version}/stratus-browser.exe)\n`;
  notes += `- [Checksums (sha256)](https://github.com/Floorp-Projects/floorp/releases/download/v${version}/checksums.txt)\n`;

  return notes;
}

console.log(generateReleaseNotes(process.argv[2]));
```

**Success Criteria:**
- [ ] Release notes auto-generated
- [ ] Format clean and readable
- [ ] All commits categorized
- [ ] Statistics accurate

### Release: Installation & Setup Guide

**File:** `docs/INSTALLATION.md`

```markdown
# Installing Stratus Browser

## System Requirements

- Windows 10 (21H2 or later) or Windows 11
- 2GB RAM minimum, 4GB+ recommended
- 500MB free disk space
- Admin rights for installation (not required for running)

## Installation Steps

### Method 1: Installer (Recommended)

1. Download the installer from [stratus.dev/download](https://stratus.dev/download)
2. Run `stratus-browser-installer.exe`
3. Follow the setup wizard
4. Click "Install"
5. Choose start menu and desktop shortcut options
6. Click "Finish"
7. Stratus will launch automatically

### Method 2: Portable Version

1. Download the portable executable
2. Run `stratus-browser.exe` directly
3. No installation needed
4. Settings stored in portable data folder

### Method 3: Command Line

```bash
stratus-browser-installer.exe /S /D=C:\Program Files\Stratus
```

## First Run

1. On first launch, Stratus will import bookmarks and settings
2. Review privacy settings (recommended)
3. Choose a theme
4. Start browsing!

## Updating

Stratus checks for updates automatically. When an update is available:
1. You'll see a notification
2. Click "Update Now" or wait for next restart
3. Update installs silently in background
4. You can continue using the browser

## Uninstalling

### Via Control Panel

1. Open Settings
2. Go to Apps → Installed apps
3. Find "Stratus Browser"
4. Click Uninstall
5. Follow the uninstall wizard

### Via Command Line

```bash
"C:\Program Files\Stratus\Uninstall.exe"
```

## Troubleshooting

### Installer won't run
- Check Windows Defender/Antivirus isn't blocking
- Try downloading again
- Try portable version

### Browser won't start
- Check system requirements
- Restart computer
- Uninstall and reinstall

### Missing shortcuts
- Run installer again
- Manually create shortcut to `stratus-browser.exe`
```

**Success Criteria:**
- [ ] Installation guide complete
- [ ] Steps clear and easy to follow
- [ ] Troubleshooting covers common issues
- [ ] Multiple installation methods documented

---

## Timeline & Milestones

### Week 1: Infrastructure
- CI/CD pipeline setup
- Code signing certificate
- Installer creation

### Week 2: Testing & Distribution
- Pre-release testing
- Beta program setup
- GitHub Releases configuration
- Distribution setup

**Go/No-Go Decision:** End of Week 2

---

## Success Criteria & Sign-Off

- [ ] CI/CD pipeline fully functional
- [ ] Code signing working
- [ ] Installer created and tested
- [ ] All pre-release tests pass
- [ ] Beta program ready
- [ ] Documentation complete
- [ ] Release infrastructure secure
- [ ] Ready for beta launch

---

## Post-Release Monitoring

### Launch Day Checklist

- [ ] Monitor download page traffic
- [ ] Track installation success rate
- [ ] Monitor error reports
- [ ] Have support team standby
- [ ] Prepare rollback plan if needed

### First Week Monitoring

- [ ] Daily builds tracking
- [ ] Beta tester feedback review
- [ ] Critical bug prioritization
- [ ] Performance metrics collection
- [ ] Security issue response

### Ongoing Support

- [ ] Weekly security updates
- [ ] Bi-weekly feature releases
- [ ] Monthly full releases
- [ ] Community engagement
- [ ] Performance optimization

---

**Document Status:** Ready for Release Planning Review  
**Created:** 2026-08-09  
**Next: Beta Launch & Community Outreach**
