# Milestone M2.5 — Runtime Rebuild (Planning)

**Status:** 🔄 PLANNING  
**Gating Dependency:** Blocks M4 Feature Platforms  
**Estimated Effort:** 4–6 weeks (build environment setup + Gecko customization + testing)  
**Prerequisites:** M3 UI Redesign ✅ COMPLETE

---

## Overview

M2.5 is the **runtime rebrand** phase. Currently, Stratus runs atop the Floorp-Runtime (prebuilt Gecko ESR artifact). To transition to production, Stratus must:

1. **Own the runtime fork** — Create a dedicated Stratus-Runtime repository
2. **Customize Gecko** — Rebrand application resources, update build configuration
3. **Build & sign** — Compile with MSVC/Rust toolchain, apply code signing
4. **Pin versioning** — Update browser-dev's `floorp-runtime.lock.json` to reference Stratus-Runtime

This milestone converts Stratus from a **Floorp overlay** into a **standalone product** with its own runtime identity.

---

## Current Runtime Status

### Floorp-Runtime (Current)
- **Source:** `Floorp-Projects/Floorp-Runtime`
- **Tracking:** `nora-0.2.0` branch, pinned to `daily-998` (commit `2d38da4d11be1e0e615f4ddd785ad5e77c95e18d`)
- **Gecko Version:** ESR 153.0.3.3 (buildId 20260725075208)
- **Download:** Prebuilt artifact (53 materials, 220 KB manifest)
- **Identity:** Floorp branding (application.ini, product name, update URLs, installer name)

### What M2.5 Changes
- **Fork Origin:** `Floorp-Projects/Floorp-Runtime` → `StratusBrowser/Stratus-Runtime` (new repo)
- **Gecko Base:** Same ESR 153, but locally customized via moz.configure patches
- **Application Resources:** Rebrand all Gecko-level identity (appName, userAgent, update check URLs, installer branding)
- **Build Artifacts:** New signing identity, custom build number scheme, Stratus distribution channel
- **Integration Point:** browser-dev updates `floorp-runtime.lock.json` to track Stratus-Runtime instead of Floorp-Runtime

---

## M2.5 Scope & Tasks

### Phase 1: Repository & Environment Setup (Week 1)

#### Task 1.1: Fork Floorp-Runtime
- **Action:** Create `StratusBrowser/Stratus-Runtime` repository
- **Source:** Clone from `Floorp-Projects/Floorp-Runtime@nora-0.2.0`
- **Initial State:** Byte-identical to daily-998 commit `2d38da4d11be1e0e615f4ddd785ad5e77c95e18d`
- **Deliverable:** GitHub repo with initial commit + README

#### Task 1.2: Document Build Environment Requirements
- **Windows 11 Build Machine:**
  - Visual Studio 2022 (Community or Pro) with MSVC C++ toolchain
  - Rust (via rustup, MSVC target: `x86_64-pc-windows-msvc`)
  - Python 3.10+ (for moz.configure, mozbuild)
  - MozillaBuild (all-in-one bootstrap, includes autoconf, make, git)
  - Git 2.55.0+
  - 50 GB free disk space (Gecko source + obj directory)

- **Deliverable:** `CONTRIBUTING.md` + `BUILD_SETUP.md` in Stratus-Runtime repo

#### Task 1.3: Verify Local Build (Optional Dry Run)
- **Goal:** Test that Floorp-Runtime builds cleanly on developer machine
- **Steps:**
  1. Clone `Floorp-Projects/Floorp-Runtime@nora-0.2.0`
  2. Run `./mach build` with MSVC/Rust configuration
  3. Confirm artifact output
- **Risk:** May take 1–2 hours; optional if confidence is high
- **Deliverable:** Build verification notes

---

### Phase 2: Gecko Customization (Week 2–3)

#### Task 2.1: Update Application Configuration (moz.configure)
- **File:** `mozilla-release/moz.configure` (or `browser/config/`)
- **Changes:**
  - `MOZ_APP_NAME` → `"stratus"` (was "firefox" or "floorp")
  - `MOZ_APP_VENDOR` → `"StratusBrowser"`
  - `MOZ_UPDATER_URL_BASE` → Point to Stratus update server (TBD, can use Mozilla's infrastructure or custom CDN)
  - Build number scheme → `STRATUS_BUILD_NUMBER` (distinct from Gecko)
  - Locale pack identifier → Update to Stratus namespace
- **Deliverable:** Patch file + moz.configure diff

#### Task 2.2: Rebrand Application Resources
- **Files:**
  - `browser/app/application.ini` → Update appName, version format, update check URL
  - `browser/app/profile/channel-prefs.js` → Set distribution channel to `"stratus"`
  - `browser/branding/` → Replace Floorp logo/artwork with Stratus assets (already designed in M2)
  - `browser/installer/` → Update Windows installer branding (MSI metadata, NSIS scripts)
  - `browser/base/content/browser.xhtml` → Update window title, product name strings
- **Deliverable:** Rebranding patch set (5–6 files)

#### Task 2.3: Update User Agent & Update Check URLs
- **User Agent:** `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Stratus/1.0`
- **Update Check:**
  - Replace Floorp update endpoint with Stratus endpoint
  - Can stub with test URL initially: `https://updates.stratusbrowser.com/updates.xml`
  - Or reuse Mozilla's infrastructure (defer to M2.5.2 if blocking)
- **Deliverable:** Patch to `browser/app/` + `toolkit/components/`

#### Task 2.4: Sign & Code-Integrity Configuration
- **File:** `browser/config/version.txt` (Stratus versioning)
- **Signing Config:**
  - Set up code-signing certificate path (to be acquired separately)
  - Update `build/automation.py.in` to use Stratus signing identity
  - Create `build/stratus_signing.conf` (cert reference, timestamp server URL)
- **Deliverable:** Signing configuration + placeholder cert path

---

### Phase 3: Build & Testing (Week 3–4)

#### Task 3.1: Build Stratus-Runtime (MSVC)
- **Steps:**
  1. Clone Stratus-Runtime repo with patches applied
  2. Configure: `./mach bootstrap` (select MSVC/Rust)
  3. Build: `./mach build --opt` (optimized build for release)
  4. Package: `./mach package` → Creates installer
- **Expected Output:**
  - `obj/dist/install/sea/Stratus*.exe` (signed or unsigned, depending on cert availability)
  - `obj/dist/Stratus/` (application directory)
  - Build log + artifact hashes
- **Deliverable:** Build artifact + build log

#### Task 3.2: Smoke Test Built Runtime
- **Tests:**
  - Launch `Stratus*.exe` → Check window title (should show "Stratus")
  - Verify user-agent string: `about:blank` → open browser console → `navigator.userAgent` should include "Stratus/1.0"
  - Check prefs: `about:config` → `app.name` should be "stratus"
  - Verify update check URL in prefs
- **Deliverable:** Smoke test report + screenshots

#### Task 3.3: Test browser-dev Integration
- **Goal:** Verify that browser-dev can download & use new Stratus-Runtime
- **Steps:**
  1. Update `floorp-runtime.lock.json` to reference Stratus-Runtime@<commit>
  2. Run `deno task feles-build dev` → Should download new runtime
  3. Launch `deno task feles-build stage` → Should run with Stratus identity
  4. Verify "Designs override loaded" in console
- **Deliverable:** Integration test report

---

### Phase 4: Versioning & Release (Week 4)

#### Task 4.1: Establish Version Scheme
- **Stratus Version:** Decouple from Gecko
  - Format: `Stratus/MAJOR.MINOR.PATCH-BUILDID`
  - Example: `Stratus/1.0.0-20260808.1` (date-based buildId)
  - Update `application.ini` version field
  - Update installer version metadata (MSI ProductVersion)
- **Deliverable:** Version scheme documentation + updated files

#### Task 4.2: Create Release Documentation
- **Files:**
  - `CHANGELOG.md` → List M2.5 rebrand + Gecko ESR 153 baseline
  - `SECURITY.md` → Security contact info, disclosure process
  - `UPDATE_URLS.md` → Update check endpoint configuration (for future ops)
  - `BUILD_PROCESS.md` → Step-by-step build reproduction guide
- **Deliverable:** Release documentation bundle

#### Task 4.3: Tag & Release Initial Build
- **Git Tag:** `stratus-runtime-1.0.0` (marks first Stratus-Runtime release)
- **GitHub Release:** Publish build artifact (or link to signed artifact if available)
- **Deliverable:** GitHub release + artifact

---

### Phase 5: browser-dev Integration (Week 4–5)

#### Task 5.1: Update floorp-runtime.lock.json
- **Changes:**
  - `source.repository` → `StratusBrowser/Stratus-Runtime`
  - `source.trackingRef` → `main` (or `stratus-1.0`)
  - `source.ref` → Tag or branch name (e.g., `stratus-runtime-1.0.0`)
  - `source.commit` → New commit hash from Stratus-Runtime
  - Update materials manifest (new download artifact)
- **Deliverable:** Updated lock file + git commit

#### Task 5.2: Test Full browser-dev Build Chain
- **Tests:**
  1. `deno task feles-build dev` → Downloads Stratus-Runtime, stages browser
  2. `deno task feles-build stage` → Launches with Stratus identity
  3. `deno task test:host` → All 209 tests pass
  4. `deno task test:smoke` → All 6 smoke steps pass
- **Deliverable:** Test report + commit to browser-dev

#### Task 5.3: Update Documentation
- **Files:**
  - `ARCHITECTURE.md` § M2.5 row → Update with completion date + commit hashes
  - `README.md` → Note Stratus-Runtime dependency
  - `docs/BUILD.md` → Reference Stratus-Runtime setup steps
- **Deliverable:** Documentation updates + commit

---

## Dependencies & Risks

### Critical Dependencies
1. **Code Signing Certificate** — Needed for release builds
   - Can defer to M2.5.2 (build unsigned for testing, sign later)
   - Cost: ~$200–500/year (EV code sign cert)
   - Effort: 1–2 weeks to acquire + configure
   - **Action:** Acquire in parallel with build environment setup

2. **Update Server Infrastructure** — Needed for `browser.update.url` prefs
   - Can use placeholder URL initially (`https://updates.stratusbrowser.com/...`)
   - Defer actual server deployment to Release Engineering (M6+)
   - **Action:** Set up test update server or use mock endpoint

3. **Build Environment** — Windows 11 with MSVC, Rust, MozillaBuild
   - **Risk:** Setup complexity, requires ~50 GB disk space
   - **Mitigation:** Document step-by-step, use MozillaBuild bootstrap

### Known Risks
1. **Build Time:** First build may take 2–4 hours (Gecko is large)
   - **Mitigation:** Incremental builds faster; set expectations

2. **Upstream Floorp Changes:** If Floorp-Runtime updates, Stratus-Runtime must merge
   - **Mitigation:** Fork independence reduces coupling; document merge process

3. **Installer Signing:** NSIS/MSI installer signing requires cert + timestamp server
   - **Mitigation:** Build unsigned first, sign in CI/CD later

4. **User Agent Breakage:** Some websites may not recognize "Stratus" user agent
   - **Mitigation:** Can include "Firefox/153" compatibility flag; test with major sites

---

## Success Criteria

- ✅ Stratus-Runtime repository created & forked from Floorp-Runtime
- ✅ Gecko application config rebranded (appName, userAgent, update URLs)
- ✅ Build succeeds locally with MSVC/Rust toolchain
- ✅ Built artifact launches with "Stratus" window title & identity
- ✅ browser-dev integration successful (floorp-runtime.lock.json updated)
- ✅ All tests pass (209 host + 6 smoke)
- ✅ Release documentation complete

---

## Timeline & Effort Estimate

| Phase | Task | Effort | Blocker |
|---|---|---|---|
| 1 | Repo + Environment | 1 week | Code signing cert (defer) |
| 2 | Gecko Customization | 1–2 weeks | None |
| 3 | Build & Test | 1 week | Build environment ready |
| 4 | Versioning & Release | 3–4 days | None |
| 5 | browser-dev Integration | 3–4 days | M2.5 tasks complete |
| **Total** | | **4–6 weeks** | **Cert acquisition** |

---

## Next Steps (M2.5.1 Kickoff)

1. **Acquire Code Signing Certificate** — Start process immediately (can run in parallel)
2. **Set up Build Machine** — Install MSVC, Rust, Python, MozillaBuild
3. **Create Stratus-Runtime Repository** — Fork Floorp-Runtime, initial commit
4. **Document Build Process** — CONTRIBUTING.md, BUILD_SETUP.md
5. **Begin Gecko Customization** — Patches for moz.configure, application.ini

---

## Context for Future Phases

### M4 Dependency
M4 Feature Platforms (workspaces, split-view, vertical tabs, performance/media/download centers) can proceed in parallel with M2.5, but **cannot reach production** until M2.5 is complete. M2.5 provides the standalone runtime identity required for M4 feature stability testing.

### Release Engineering (M6+)
M2.5 establishes the foundation for:
- CI/CD pipeline (build automation)
- Code signing & distribution (artifact signing, update delivery)
- Installer generation (Windows MSI + NSIS)
- Update mechanism (browser.update.url infrastructure)

---

## Conclusion

M2.5 is a **critical infrastructure milestone** that transforms Stratus from a Floorp overlay into a standalone product with its own runtime identity. The scope is well-defined, dependencies are manageable, and the effort (4–6 weeks) is reasonable with proper planning.

**Status: READY FOR PHASE KICKOFF**

Next action: Assign M2.5.1 tasks and begin build environment setup.
