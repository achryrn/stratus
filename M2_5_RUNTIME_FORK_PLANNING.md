# M2.5: Floorp Runtime Fork & Build System Planning

**Phase:** M2 - Core Infrastructure  
**Milestone:** M2.5 - Runtime Fork & Build  
**Date:** 2026-08-09  
**Status:** Planning & Execution Phase  
**Owner:** Build Infrastructure Team  

---

## Executive Summary

M2.5 establishes the Stratus fork of the Floorp runtime (Gecko ESR 153.0.3.3) with customized build configuration, branding, and reproducible build infrastructure. This is foundational work required before M4 features can be integrated into production builds.

**Key Deliverables:**
1. Forked `floorp-runtime` repository with Stratus branding
2. Updated `moz.configure` with Stratus-specific build options
3. Rebranded application resources (icons, strings, certificates)
4. Build validation and reproducibility verification
5. Updated `floorp-runtime.lock.json` in main project

**Timeline:** 3 weeks (Weeks 1-3 of Phase 2)  
**Team:** 1 Build Engineer, 1 DevOps  
**Effort:** 120 hours total

---

## Part 1: Understanding the Current Setup

### Current Architecture

```
browser-dev/
├── floorp/                          # Main Stratus project
│   ├── package.json                 # Deno/TypeScript deps
│   ├── floorp-runtime.lock.json     # Pinned runtime: Gecko ESR 153.0.3.3
│   ├── tools/src/feles-build.ts     # Build orchestrator
│   ├── browser-features/            # Feature modules (M4 deliverables)
│   └── ...
└── floorp-runtime/                  # (TO BE FORKED IN M2.5)
    ├── moz.configure                # Build configuration
    ├── browser/                      # Browser chrome code
    ├── toolkit/                      # Gecko toolkit
    ├── dom/                          # DOM implementation
    └── third_party/                 # Dependencies
```

### Current Runtime Source

- **Repository:** `https://github.com/Floorp-Projects/floorp-runtime`
- **Version:** Gecko ESR 153.0.3.3
- **Commit:** `2d38da4d11be1e0e615f4ddd785ad5e77c95e18d` (daily-998)
- **Build Command:** `./mach build` (standard Mozilla build)
- **Build Time:** ~45 minutes (cached), ~2 hours (clean)
- **Output:** `obj-x86_64-pc-mingw32/dist/` (Windows)

### Current Pinning Mechanism

**File:** `floorp-runtime.lock.json`

```json
{
  "version": "153.0.3.3",
  "commit": "2d38da4d11be1e0e615f4ddd785ad5e77c95e18d",
  "channel": "daily-998",
  "source": "https://github.com/Floorp-Projects/floorp-runtime",
  "buildMetadata": {
    "platform": "win32",
    "arch": "x86_64",
    "compiler": "clang-cl",
    "timestamp": "2026-08-09T00:00:00Z"
  }
}
```

---

## Part 2: M2.5 Execution Plan

### M2.5.1: Fork & Repository Setup

#### Task: Create Stratus Runtime Fork

**Objective:** Fork `floorp-runtime` to `stratus-runtime` under Floorp-Projects org

**Steps:**

1. **GitHub Fork Setup** (Day 1)
   - Fork `Floorp-Projects/floorp-runtime` to `Floorp-Projects/stratus-runtime`
   - Configure settings:
     - Default branch: `stratus-main` (not `main`)
     - Enforce branch protection on `stratus-main`
     - Require status checks before merge
     - Allow auto-delete head branches
   - Add branch protection rules

2. **Clone & Branch Setup** (Day 1)
   ```bash
   git clone https://github.com/Floorp-Projects/stratus-runtime.git
   cd stratus-runtime
   git checkout -b stratus-main
   git push -u origin stratus-main
   ```

3. **Verify Build Environment** (Day 1-2)
   - Confirm Gecko ESR 153.0.3.3 source present
   - Verify all submodules initialized
   - Check build tools available (LLVM 18+, Python 3.8+, Perl, NASM)
   - Test clean checkout builds successfully

**Success Criteria:**
- [ ] Repository accessible at `https://github.com/Floorp-Projects/stratus-runtime`
- [ ] `stratus-main` branch set as default
- [ ] Branch protection rules enforced
- [ ] Clean build succeeds locally
- [ ] Build artifacts reproducible

#### Task: Document Build Environment Setup

**Objective:** Create comprehensive build environment documentation

**Deliverable:** `stratus-runtime/docs/BUILD_ENVIRONMENT.md` (500+ lines)

**Contents:**

1. **System Requirements**
   - Windows 11/10 Pro (non-admin)
   - Disk: 30GB free (source + build artifacts)
   - RAM: 16GB minimum, 32GB recommended
   - Network: Fast connection (4GB+ download)

2. **Required Tools**
   - Visual Studio 2022 or Build Tools (C++ workload)
   - LLVM 18.1.8 (for clang-cl)
   - Python 3.8+
   - Perl 5.30+
   - NASM 2.14+
   - Git 2.40+
   - Deno 2.9+

3. **Installation Steps** (with verified commands)
   - Step-by-step setup for each tool
   - Environment variable configuration
   - Path verification checklist

4. **Build Process**
   - `./mach bootstrap` - First-time setup
   - `./mach build` - Build Gecko runtime
   - `./mach package` - Create installer
   - `./mach test` - Run test suite

5. **Troubleshooting**
   - Common build failures and fixes
   - Performance optimization tips
   - Rebuild vs clean build trade-offs

6. **CI/CD Integration**
   - GitHub Actions workflow examples
   - Artifact caching strategies
   - Build matrix (Windows 11, macOS, Linux)

**Success Criteria:**
- [ ] Documentation complete and tested
- [ ] First-time setup guide verified on fresh machine
- [ ] CI/CD examples working
- [ ] Troubleshooting covers 80%+ common issues

---

### M2.5.2: Build Configuration & Branding

#### Task: Update Gecko moz.configure

**Objective:** Customize Gecko build for Stratus branding

**File:** `stratus-runtime/moz.configure`

**Changes Required:**

1. **Application Identifier** (10 lines)
   ```python
   # Current (Floorp)
   ac_add_options --with-app-id="{ec8030f7-c20a-464f-9b0e-13a3a9e97384}"
   
   # Stratus (new)
   ac_add_options --with-app-id="{stratus-ec8030f7-c20a-464f-9b0e-13a3a9e97384}"
   ```

2. **Application Name** (5 lines)
   ```python
   # Update MOZ_APP_NAME, MOZ_APP_VENDOR, MOZ_APP_VERSION
   MOZ_APP_NAME = "stratus"
   MOZ_APP_VENDOR = "Stratus Project"
   MOZ_APP_VERSION = "1.0.0"
   ```

3. **Build Features** (30 lines)
   ```python
   # Enable necessary features
   ac_add_options --enable-optimize
   ac_add_options --enable-release
   ac_add_options --disable-debug
   ac_add_options --disable-tests
   ac_add_options --enable-minui
   ac_add_options --enable-geckodriver
   ```

4. **Windows-Specific Options** (15 lines)
   ```python
   # Windows build options
   ac_add_options --target=x86_64-pc-mingw32
   ac_add_options --with-toolchain-prefix=
   ```

**Validation:**
- Build completes without errors
- Application name correct in About dialog
- Icon and branding appear in installer

**Success Criteria:**
- [ ] moz.configure updated
- [ ] Build produces "Stratus" branded output
- [ ] About dialog shows correct version/vendor
- [ ] Installer uses Stratus branding

#### Task: Rebrand Application Resources

**Objective:** Update icons, strings, and certificates for Stratus

**File Changes:**

1. **Icons** (5 files)
   - `browser/branding/unofficial/icon16.png` → Stratus 16x16 icon
   - `browser/branding/unofficial/icon32.png` → Stratus 32x32 icon
   - `browser/branding/unofficial/icon64.png` → Stratus 64x64 icon
   - `browser/branding/unofficial/icon128.png` → Stratus 128x128 icon
   - `browser/branding/unofficial/icon256.png` → Stratus 256x256 icon

2. **Strings** (3 files)
   - `browser/branding/unofficial/brand.dtd` → Update product name
   - `browser/branding/unofficial/brand.properties` → Update strings
   - `browser/branding/unofficial/locale.inc` → Update locale info

3. **Certificates** (1 file)
   - `browser/branding/unofficial/certificate.pem` → Code signing cert (if applicable)

**Implementation:**
- Use design system icons (from M3 Stratus design)
- Update all localized strings (en-US at minimum)
- Create certificate for code signing (optional for beta)

**Success Criteria:**
- [ ] Icons display correctly in Windows explorer
- [ ] About dialog shows Stratus branding
- [ ] Installer splash screen branded
- [ ] Help → About shows updated strings

---

### M2.5.3: Build Validation & Lock File Update

#### Task: Build & Test Stratus Runtime

**Objective:** Produce working Stratus runtime binary and validate reproducibility

**Build Steps:**

1. **Clean Build** (Day 1)
   ```bash
   cd stratus-runtime
   ./mach bootstrap           # ~20 min
   ./mach build              # ~90 min (first time)
   ./mach package            # ~10 min
   ```

2. **Verify Output** (Day 1)
   - Binary size: ~80-120MB (expected for ESR)
   - Artifacts in `obj-x86_64-pc-mingw32/dist/`
   - Installer created successfully

3. **Smoke Testing** (Day 2)
   - Launch browser
   - Verify About dialog
   - Check DevTools console for errors
   - Verify basic feature set works

4. **Reproducible Build** (Day 2-3)
   - Clean checkout from same commit
   - Build again
   - Compare artifacts (hash verification)
   - Document any differences

**Build Artifacts:**
- `stratus-runtime.exe` (browser executable)
- `stratus-runtime-installer.exe` (NSIS installer)
- Build logs and metadata

**Success Criteria:**
- [ ] Browser launches without errors
- [ ] Stratus branding visible in UI
- [ ] Basic navigation works
- [ ] DevTools functional
- [ ] Reproducible build hash matches

#### Task: Update floorp-runtime.lock.json

**Objective:** Pin Stratus runtime version and metadata

**Current Lock File:** `floorp/floorp-runtime.lock.json`

**Updates:**

```json
{
  "version": "153.0.3.3-stratus-1.0.0",
  "source": "https://github.com/Floorp-Projects/stratus-runtime",
  "branch": "stratus-main",
  "commit": "{{NEW_COMMIT_HASH}}",
  "buildMetadata": {
    "platform": "win32",
    "arch": "x86_64",
    "compiler": "clang-cl",
    "timestamp": "2026-08-09T00:00:00Z",
    "buildTime": "90m",
    "artifactHash": "sha256:{{BINARY_SHA256}}",
    "reproducible": true,
    "buildSystem": "mozilla-mach",
    "customizations": [
      "application-id-updated",
      "branding-applied",
      "moz.configure-customized"
    ]
  },
  "features": {
    "geckodriver": true,
    "devtools": true,
    "minui": true,
    "testing": false
  }
}
```

**Steps:**

1. Calculate SHA256 of final binary
2. Update commit hash from stratus-runtime repo
3. Record build metadata
4. Commit to floorp main branch

**Success Criteria:**
- [ ] Lock file updated with new commit
- [ ] Build artifact hash recorded
- [ ] Reproducibility verified
- [ ] Integration with feles-build tested

---

## Part 3: Risk Mitigation & Contingency

### Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Build failures due to toolchain | Medium | High | Pre-validate toolchain on fresh machine |
| Runtime incompatibility with M4 features | Low | Critical | Early integration testing with M4 code |
| Branding changes break functionality | Low | High | Comprehensive smoke testing |
| Build reproducibility issues | Medium | Medium | Document environment precisely |
| Performance regression in forked runtime | Low | Medium | Benchmarking before/after |

### Contingency Plans

1. **Build Toolchain Issues**
   - Fallback: Use GitHub Actions to build in clean environment
   - Document exact LLVM/VisualStudio versions known to work

2. **Runtime Incompatibility**
   - Plan early M4 integration test (by end Week 2 of M2.5)
   - Have upstream Floorp developers available for consultation

3. **Reproducibility Concerns**
   - If builds differ: Investigate compiler flags, dependencies
   - If persistent: Document environment differences, accept variance

---

## Part 4: Integration with Existing Build System

### How feles-build Uses Runtime

**Current Flow:**
```
feles-build (Deno)
  → Downloads runtime (from floorp-runtime.lock.json)
  → Extracts to ./runtime/
  → Uses runtime libraries for feature compilation
  → Output: browser-dev/dist/
```

**Post-M2.5 Flow:**
```
feles-build (Deno)
  → Downloads stratus-runtime (from updated floorp-runtime.lock.json)
  → Extracts to ./runtime/
  → Uses Stratus runtime libraries
  → Integrates M4 features (vertical tabs, workspaces, split-view)
  → Output: Stratus browser executable
```

### Required Changes to feles-build

1. **Update Runtime URL**
   ```typescript
   const RUNTIME_SOURCE = "https://github.com/Floorp-Projects/stratus-runtime";
   const RUNTIME_VERSION = "153.0.3.3-stratus-1.0.0";
   ```

2. **Verify Lock File Parsing**
   - Ensure new JSON structure readable
   - Test artifact hash verification

3. **Test Integration**
   ```bash
   deno task feles-build dev
   # Should launch Stratus browser with M4 features
   ```

---

## Part 5: Timeline & Milestones

### Week 1: Fork & Setup
- **Mon-Tue:** GitHub fork, repository setup, branch protection
- **Wed:** Build environment documentation
- **Thu-Fri:** Verify build environment, clean build test

### Week 2: Configuration & Branding
- **Mon-Tue:** moz.configure updates, feature validation
- **Wed:** Resource rebranding (icons, strings)
- **Thu-Fri:** Initial smoke testing, bug fixes

### Week 3: Validation & Integration
- **Mon-Tue:** Reproducible build verification
- **Wed:** Lock file update, feles-build integration test
- **Thu:** M4 feature integration test
- **Fri:** Documentation cleanup, release readiness

**Go/No-Go Decision:** End of Week 3

---

## Part 6: Success Criteria & Sign-Off

### M2.5.1 Completion Criteria
- [ ] stratus-runtime repository created and configured
- [ ] Branch protection rules enforced
- [ ] Build environment documentation complete
- [ ] Clean build succeeds on fresh machine

### M2.5.2 Completion Criteria
- [ ] moz.configure customized for Stratus
- [ ] Application branding visible (About dialog, icons)
- [ ] Resources rebranded (icons, strings)
- [ ] Smoke tests pass

### M2.5.3 Completion Criteria
- [ ] stratus-runtime builds successfully
- [ ] Reproducible build verification complete
- [ ] floorp-runtime.lock.json updated
- [ ] feles-build integration test passes
- [ ] M4 features integrate without issues

### Overall M2.5 Sign-Off
- [ ] Runtime fork complete and functional
- [ ] Build system integrated and tested
- [ ] Documentation complete and verified
- [ ] Ready for M4 production builds
- [ ] Ready for M5 API platform work

---

## Part 7: Post-M2.5 Work

### Immediate Next Steps (M4 Phase 3)
1. Build production Stratus runtime with M4 features
2. Run full test suite (host + smoke tests)
3. Package installer for beta distribution

### Future Enhancements (M3+)
1. macOS and Linux builds
2. Automated CI/CD pipeline
3. Build caching and performance optimization
4. Signed releases with code certificates

---

## Appendix: Build Commands Reference

```bash
# First-time setup
./mach bootstrap

# Clean build
rm -rf obj-x86_64-pc-mingw32/
./mach build

# Incremental build (fast)
./mach build

# Package installer
./mach package

# Run tests
./mach test

# Help
./mach help
```

## Appendix: Useful Links

- [Mozilla Build Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Build_Instructions)
- [Gecko ESR Release Notes](https://www.mozilla.org/en-US/firefox/enterprise/release-notes/)
- [Floorp Runtime Repository](https://github.com/Floorp-Projects/floorp-runtime)
- [Stratus Design System (M3)](./ARCHITECTURE.md#design-system)

---

**Document Status:** Ready for M2.5.1 Execution  
**Last Updated:** 2026-08-09  
**Next Review:** After M2.5.1 completion
