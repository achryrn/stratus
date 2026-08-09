# M2.5 Task Breakdown & Execution Checklist

**Phase:** M2 - Core Infrastructure  
**Milestone:** M2.5 - Runtime Fork & Build  
**Date:** 2026-08-09  
**Status:** Ready for Execution  

---

## M2.5.1: Fork & Repository Setup

### Task 2.5.1.1: Create GitHub Fork

**Objective:** Set up Stratus runtime repository  
**Owner:** DevOps Engineer  
**Effort:** 1-2 hours  
**Dependencies:** GitHub write access to Floorp-Projects  

**Checklist:**

- [ ] **Navigate to Floorp-Projects/floorp-runtime**
  - Open: https://github.com/Floorp-Projects/floorp-runtime
  - Verify latest commit: `2d38da4d11be1e0e615f4ddd785ad5e77c95e18d`
  - Verify version: Gecko ESR 153.0.3.3

- [ ] **Fork to stratus-runtime**
  - Click "Fork" button
  - Owner: Floorp-Projects
  - Repository name: `stratus-runtime`
  - Description: "Stratus runtime fork of Gecko ESR 153.0.3.3 with custom branding and build configuration"
  - Create fork

- [ ] **Configure Repository Settings**
  - Go to Settings → General
  - Set default branch to `stratus-main` (will create this next)
  - Enable "Allow auto-delete head branches"
  - Save

- [ ] **Set Up Branch Protection**
  - Go to Settings → Branches
  - Add rule for branch name pattern: `stratus-main`
  - Check: "Require a pull request before merging"
  - Check: "Require status checks to pass before merging"
  - Check: "Require branches to be up to date before merging"
  - Check: "Include administrators"
  - Save

- [ ] **Verify Fork Created**
  - Confirm URL: https://github.com/Floorp-Projects/stratus-runtime
  - Confirm main branch contains Gecko ESR 153.0.3.3
  - Verify settings applied

**Success Verification:**
```bash
# Navigate to fork
cd ~/temp
git clone https://github.com/Floorp-Projects/stratus-runtime.git
cd stratus-runtime

# Verify commit
git log --oneline | head -1
# Should show: 2d38da4d Gecko ESR 153.0.3.3 or similar

# Check branches
git branch -a
# Should show: main, origin/main
```

---

### Task 2.5.1.2: Local Checkout & Branch Setup

**Objective:** Prepare local development environment  
**Owner:** Build Engineer  
**Effort:** 30 minutes  
**Dependencies:** Task 2.5.1.1 complete, Git installed  

**Checklist:**

- [ ] **Clone Repository**
  ```bash
  cd C:\development
  git clone https://github.com/Floorp-Projects/stratus-runtime.git
  cd stratus-runtime
  git log --oneline | head -3
  ```

- [ ] **Verify Submodules**
  ```bash
  git submodule status
  # Should show submodules (dom, toolkit, third_party, etc.)
  
  # If missing, initialize:
  git submodule update --init --recursive
  ```

- [ ] **Create stratus-main Branch**
  ```bash
  git checkout -b stratus-main
  git push -u origin stratus-main
  ```

- [ ] **Verify Branch Created**
  ```bash
  git branch -a
  # Output should show:
  #   stratus-main
  # * main
  #   remotes/origin/HEAD -> origin/main
  #   remotes/origin/main
  #   remotes/origin/stratus-main
  ```

- [ ] **Switch to stratus-main**
  ```bash
  git checkout stratus-main
  git branch -vv
  # Should show: stratus-main ... origin/stratus-main [ahead 0, behind 0]
  ```

**Success Verification:**
```bash
# Confirm current branch
git rev-parse --abbrev-ref HEAD
# Output: stratus-main

# Confirm remote tracking
git branch -vv
# Output: stratus-main ... origin/stratus-main
```

---

### Task 2.5.1.3: Verify Build Environment

**Objective:** Confirm all build tools available  
**Owner:** Build Engineer  
**Effort:** 2-4 hours  
**Dependencies:** Windows 11, Local stratus-runtime clone  

**Checklist:**

- [ ] **Check Required Tools**
  ```powershell
  # Python
  python --version
  # Expected: 3.8 or higher
  
  # Perl
  perl --version
  # Expected: 5.30 or higher
  
  # NASM
  nasm -version
  # Expected: 2.14 or higher
  
  # Git
  git --version
  # Expected: 2.40 or higher
  
  # Deno (for integration)
  deno --version
  # Expected: 2.9+ (Copilot default)
  ```

- [ ] **Check Visual Studio Build Tools**
  ```powershell
  # Check if installed
  & "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
  cl.exe
  # Expected: MSVC compiler available
  ```

- [ ] **Check LLVM/Clang**
  ```powershell
  clang-cl --version
  # Expected: clang version 18.x or higher
  ```

- [ ] **Run Bootstrap**
  ```bash
  cd stratus-runtime
  ./mach bootstrap
  # Follow prompts, select "Build Firefox" (for Gecko base)
  # Expected completion: ~20 minutes
  ```

- [ ] **Verify Bootstrap Success**
  ```bash
  # Check build configuration created
  ls -la mach
  # Should show mach executable
  
  # List available commands
  ./mach help | head -20
  ```

**Success Verification:**
```bash
# Try a simple build command
./mach help build
# Should show build command help without errors

# Check obj- directory created
ls -d obj-* 2>/dev/null
# Should show: obj-x86_64-pc-mingw32 (or similar)
```

---

### Task 2.5.1.4: Test Clean Build

**Objective:** Verify build succeeds before customization  
**Owner:** Build Engineer  
**Effort:** 2-3 hours (mostly waiting)  
**Dependencies:** Task 2.5.1.3 complete  

**Checklist:**

- [ ] **Clean Previous Artifacts**
  ```bash
  rm -rf obj-x86_64-pc-mingw32/
  ```

- [ ] **Start Clean Build**
  ```bash
  cd stratus-runtime
  ./mach build
  # Expected: 90-120 minutes on first build
  # Monitor output for errors
  ```

- [ ] **Monitor Build Progress**
  - [ ] Compiling C/C++ files (first 30 min)
  - [ ] Linking objects (next 20 min)
  - [ ] Packaging artifacts (last 10 min)
  - [ ] No fatal errors

- [ ] **Verify Build Completed**
  ```bash
  # Check exit code
  echo $?
  # Expected: 0
  
  # Check artifacts
  ls -lh obj-x86_64-pc-mingw32/dist/firefox.exe
  # Should show executable (~80-120MB)
  ```

- [ ] **Launch Browser**
  ```bash
  ./mach run
  # Browser should launch
  # Verify no console errors
  ```

- [ ] **Check About Dialog**
  - Open Help → About Firefox
  - Verify version matches (153.0.3.3)
  - Verify branding shows "Firefox" (not yet Stratus)
  - Verify no errors in console

**Success Verification:**
Build artifacts present and browser launches without errors.

---

## M2.5.2: Build Configuration & Branding

### Task 2.5.2.1: Update moz.configure

**Objective:** Customize Gecko build for Stratus  
**Owner:** Build Engineer  
**Effort:** 1-2 hours  
**Dependencies:** Task 2.5.1.4 complete  

**Checklist:**

- [ ] **Locate moz.configure**
  ```bash
  cd stratus-runtime
  ls -la moz.configure
  # File should exist at root
  ```

- [ ] **Backup Original**
  ```bash
  cp moz.configure moz.configure.backup
  git add moz.configure.backup
  ```

- [ ] **Update Application ID**
  ```bash
  # Find current app ID
  grep "app-id" moz.configure
  
  # Current: ec8030f7-c20a-464f-9b0e-13a3a9e97384 (Firefox)
  # Change to: stratus-ec8030f7-c20a-464f-9b0e-13a3a9e97384
  
  # Edit moz.configure (use text editor or sed)
  # Replace: --with-app-id="{ec8030f7-c20a-464f-9b0e-13a3a9e97384}"
  # With: --with-app-id="{stratus-ec8030f7-c20a-464f-9b0e-13a3a9e97384}"
  ```

- [ ] **Update Application Name**
  ```bash
  # Find MOZ_APP_NAME
  grep "MOZ_APP_NAME" moz.configure
  
  # Current: firefox
  # Change to: stratus
  
  # Also update:
  # MOZ_APP_VENDOR = "Mozilla" → "Stratus Project"
  # MOZ_APP_VERSION = "153.0esr" → "1.0.0"
  ```

- [ ] **Verify Changes**
  ```bash
  git diff moz.configure
  # Should show your changes highlighted
  ```

- [ ] **Test Configuration**
  ```bash
  rm -rf obj-x86_64-pc-mingw32/
  ./mach build
  # Build should complete without config errors
  ```

**Success Verification:**
Build completes and generates valid application identifier.

---

### Task 2.5.2.2: Prepare Icons & Branding Assets

**Objective:** Create Stratus-branded resources  
**Owner:** Design Engineer + Build Engineer  
**Effort:** 2-3 hours  
**Dependencies:** M3 Design System (completed), Task 2.5.2.1 complete  

**Checklist:**

- [ ] **Locate Branding Directory**
  ```bash
  cd stratus-runtime
  ls -la browser/branding/unofficial/
  # Should contain: icon16.png, icon32.png, icon48.png, icon64.png, icon128.png
  ```

- [ ] **Create Icon Files**
  - [ ] icon16.png - 16x16 Stratus logo (from M3 design)
  - [ ] icon32.png - 32x32 Stratus logo
  - [ ] icon48.png - 48x48 Stratus logo
  - [ ] icon64.png - 64x64 Stratus logo
  - [ ] icon128.png - 128x128 Stratus logo
  - [ ] icon256.png - 256x256 Stratus logo (optional, high-res)

  **Source:** Use Stratus color scheme from M3 (`--stratus-accent: #6c5ce7`)

- [ ] **Update Branding Strings**
  ```bash
  # Edit: browser/branding/unofficial/brand.dtd
  # Find: <!ENTITY brandShortName "Firefox">
  # Replace: <!ENTITY brandShortName "Stratus">
  
  # Edit: browser/branding/unofficial/brand.properties
  # Update all references from "Firefox" to "Stratus"
  ```

- [ ] **Verify Icon Changes**
  ```bash
  ls -lh browser/branding/unofficial/*.png
  # All PNG files should be present
  ```

- [ ] **Test Branding in Build**
  ```bash
  rm -rf obj-x86_64-pc-mingw32/
  ./mach build
  ./mach run
  # Help → About should show "Stratus" branding
  ```

**Success Verification:**
About dialog displays "Stratus" branding and correct version.

---

### Task 2.5.2.3: Update Installer Branding

**Objective:** Create Stratus NSIS installer  
**Owner:** Build Engineer  
**Effort:** 1-2 hours  
**Dependencies:** Task 2.5.2.2 complete  

**Checklist:**

- [ ] **Locate Installer Script**
  ```bash
  find . -name "*.nsi" -type f
  # Typically: browser/installer/windows/nsis/installer.nsi
  ```

- [ ] **Update Installer Strings**
  ```nsi
  ; Find and update:
  ; !define BrandShortName "Firefox"
  ; Replace: !define BrandShortName "Stratus"
  
  ; Update other branding strings:
  ; !define BrandFullName "Stratus"
  ; !define CompanyName "Stratus Project"
  ```

- [ ] **Create Installer Icon**
  - Use Stratus logo (16x16 ICO format)
  - Place in: `browser/branding/unofficial/installer.ico`

- [ ] **Update Installer Splash Screen**
  - Create splash screen with Stratus branding
  - Dimensions: 500x300 or 600x300 pixels
  - File: `browser/branding/unofficial/splash.bmp`

- [ ] **Test Installer Creation**
  ```bash
  ./mach package
  # Should create: obj-x86_64-pc-mingw32/dist/stratus-installer.exe
  ```

**Success Verification:**
Installer created with Stratus branding in splash screen and About dialog.

---

## M2.5.3: Build Validation & Integration

### Task 2.5.3.1: Build Stratus Runtime

**Objective:** Create production Stratus runtime binary  
**Owner:** Build Engineer  
**Effort:** 2-3 hours (90 min build + validation)  
**Dependencies:** Tasks 2.5.2.1-2.5.2.3 complete  

**Checklist:**

- [ ] **Clean Build Directory**
  ```bash
  cd stratus-runtime
  rm -rf obj-x86_64-pc-mingw32/
  ```

- [ ] **Execute Build**
  ```bash
  ./mach build
  # Monitor output for errors
  # Expected: ~90 minutes
  ```

- [ ] **Build Completion Check**
  ```bash
  # Verify exit code
  echo $?
  # Expected: 0
  
  # Check main artifacts
  ls -lh obj-x86_64-pc-mingw32/dist/stratus.exe
  # Expected: 80-120 MB file
  ```

- [ ] **Package Installer**
  ```bash
  ./mach package
  # Expected: ~10 minutes
  ```

- [ ] **Verify Installer Created**
  ```bash
  ls -lh obj-x86_64-pc-mingw32/dist/stratus-installer.exe
  # Expected: 40-60 MB file
  ```

- [ ] **Save Build Artifacts**
  ```bash
  mkdir -p ~/stratus-build-artifacts/1.0.0/
  cp obj-x86_64-pc-mingw32/dist/stratus.exe ~/stratus-build-artifacts/1.0.0/
  cp obj-x86_64-pc-mingw32/dist/stratus-installer.exe ~/stratus-build-artifacts/1.0.0/
  ```

**Success Verification:**
Both binary and installer present, correct file sizes.

---

### Task 2.5.3.2: Smoke Testing

**Objective:** Validate Stratus runtime functionality  
**Owner:** QA Engineer  
**Effort:** 1-2 hours  
**Dependencies:** Task 2.5.3.1 complete  

**Test Cases:**

- [ ] **Browser Launch**
  ```bash
  ./mach run
  # Browser should open without errors
  # Splash screen shows Stratus branding
  # Main window loads successfully
  ```

- [ ] **About Dialog**
  - Open Help → About Stratus
  - [ ] Product name: "Stratus"
  - [ ] Version: "1.0.0"
  - [ ] Vendor: "Stratus Project"
  - [ ] No error messages in console

- [ ] **Navigation Test**
  - [ ] Visit https://example.com
  - [ ] Page loads and renders correctly
  - [ ] Links clickable
  - [ ] Back/Forward buttons work

- [ ] **DevTools**
  - Press F12 to open Developer Tools
  - [ ] Inspector tab loads
  - [ ] Console shows no critical errors
  - [ ] Debugger functional

- [ ] **Feature Check**
  - [ ] Tabs can be created/closed
  - [ ] Bookmark functionality works
  - [ ] Settings accessible
  - [ ] No crashes or hangs

- [ ] **Shutdown**
  - Close browser cleanly
  - [ ] No exit errors
  - [ ] Profile saved correctly

**Success Verification:**
All smoke tests pass, no critical errors logged.

---

### Task 2.5.3.3: Reproducible Build Verification

**Objective:** Verify build reproducibility  
**Owner:** Build Engineer  
**Effort:** 3-4 hours  
**Dependencies:** Task 2.5.3.1 complete  

**Procedure:**

- [ ] **First Build Hash**
  ```bash
  # From Task 2.5.3.1
  sha256sum obj-x86_64-pc-mingw32/dist/stratus.exe > build1.sha256
  cat build1.sha256
  # Save hash value: [HASH_1]
  ```

- [ ] **Clean Checkout**
  ```bash
  cd ~/temp
  rm -rf stratus-runtime-verify/
  git clone https://github.com/Floorp-Projects/stratus-runtime.git stratus-runtime-verify
  cd stratus-runtime-verify
  git checkout stratus-main
  ```

- [ ] **Second Build**
  ```bash
  ./mach bootstrap
  rm -rf obj-x86_64-pc-mingw32/
  ./mach build
  ./mach package
  ```

- [ ] **Compare Hashes**
  ```bash
  sha256sum obj-x86_64-pc-mingw32/dist/stratus.exe > build2.sha256
  diff build1.sha256 build2.sha256
  # Expected: No output (hashes match)
  ```

- [ ] **Hash Match Result**
  - [ ] If MATCH: Reproducibility confirmed ✓
  - [ ] If DIFFERENT: Investigate differences
    - [ ] Compare timestamps (ignore)
    - [ ] Check compiler versions match
    - [ ] Document environment differences

**Success Verification:**
Reproducible builds confirmed or documented differences explained.

---

### Task 2.5.3.4: Update floorp-runtime.lock.json

**Objective:** Pin Stratus runtime version in main project  
**Owner:** Build Engineer  
**Effort:** 30 minutes  
**Dependencies:** Task 2.5.3.3 complete  

**Checklist:**

- [ ] **Get Build Metadata**
  ```bash
  # Commit hash from stratus-runtime
  cd stratus-runtime
  git log --oneline | head -1
  # Save: [COMMIT_HASH]
  
  # Binary hash
  sha256sum obj-x86_64-pc-mingw32/dist/stratus.exe
  # Save: [BINARY_HASH]
  
  # Build timestamp
  date -u +"%Y-%m-%dT%H:%M:%SZ"
  # Save: [TIMESTAMP]
  ```

- [ ] **Edit floorp-runtime.lock.json**
  ```json
  {
    "version": "153.0.3.3-stratus-1.0.0",
    "source": "https://github.com/Floorp-Projects/stratus-runtime",
    "branch": "stratus-main",
    "commit": "[COMMIT_HASH]",
    "buildMetadata": {
      "platform": "win32",
      "arch": "x86_64",
      "compiler": "clang-cl",
      "timestamp": "[TIMESTAMP]",
      "buildTime": "90m",
      "artifactHash": "sha256:[BINARY_HASH]",
      "reproducible": true,
      "buildSystem": "mozilla-mach"
    },
    "features": {
      "geckodriver": true,
      "devtools": true,
      "minui": true,
      "testing": false
    }
  }
  ```

- [ ] **Verify JSON Syntax**
  ```bash
  cd floorp
  deno run --allow-read --eval "console.log(JSON.parse(Deno.readTextFileSync('floorp-runtime.lock.json')))"
  # Should parse without errors
  ```

- [ ] **Commit Lock File**
  ```bash
  git add floorp-runtime.lock.json
  git commit -m "build: M2.5.3 - update stratus-runtime lock file (v1.0.0)"
  ```

**Success Verification:**
Lock file updated, JSON valid, committed to main branch.

---

### Task 2.5.3.5: Integrate with feles-build

**Objective:** Verify feles-build works with new lock file  
**Owner:** Build Engineer  
**Effort:** 1-2 hours  
**Dependencies:** Task 2.5.3.4 complete  

**Checklist:**

- [ ] **Verify Lock File Integration**
  ```bash
  cd floorp
  deno task feles-build test
  # Should parse lock file without errors
  ```

- [ ] **Test Dev Build**
  ```bash
  deno task feles-build dev
  # Expected: ~5-10 minutes
  # Should download stratus-runtime from lock file
  # Should compile browser features
  # Should launch browser
  ```

- [ ] **Verify Browser Launches**
  - [ ] Stratus branding visible
  - [ ] M4 features present (vertical tabs, workspaces, split-view)
  - [ ] No console errors
  - [ ] DevTools functional

- [ ] **Test Build Verification**
  ```bash
  deno task test:host
  # Should run all tests
  # Expected: 209 tests pass
  ```

**Success Verification:**
Build system fully integrated, all tests pass.

---

## Summary Checklist

### M2.5.1 Completion
- [ ] GitHub fork created (stratus-runtime)
- [ ] Branch protection configured
- [ ] Build environment documented
- [ ] Local checkout complete
- [ ] Build tools verified
- [ ] Clean build successful

### M2.5.2 Completion
- [ ] moz.configure updated
- [ ] Icons and branding updated
- [ ] Installer branding complete
- [ ] Build with customizations successful

### M2.5.3 Completion
- [ ] Stratus runtime built successfully
- [ ] Smoke tests pass
- [ ] Reproducibility verified
- [ ] Lock file updated
- [ ] feles-build integration verified
- [ ] All tests pass

### Overall M2.5 Sign-Off Ready
- [ ] All tasks completed
- [ ] Documentation complete
- [ ] Ready for M4 Phase 3 (production builds)
- [ ] Ready for release planning

---

**Document Status:** Ready for M2.5 Execution  
**Created:** 2026-08-09  
**Estimated Duration:** 3 weeks (40-50 hours effort)  
**Next Milestone:** M4 Phase 3 - Production Build & Testing
