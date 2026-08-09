# M4 Phase 3: Production Build & Validation

**Phase:** M4 Final  
**Duration:** 2 weeks (10 business days)  
**Effort:** 60 hours  
**Team:** 2-3 engineers  
**Start:** After M2.5 completion (Week 4)  
**Deliverables:** Production-ready Stratus runtime with M4 features  

---

## Executive Summary

M4 Phase 3 is the final milestone of the core feature implementation phase. It executes the production build of Stratus Browser with all M4 features (vertical tabs, workspaces, split-view) fully integrated, tested, and validated. This phase gates entry to M5-M7 feature development and establishes the baseline for beta testing.

**Key Outcomes:**
- Production-ready browser binary
- Full feature integration verified
- Performance baselines established
- Installer package ready for distribution
- All M4 test suites passing
- Accessibility compliance confirmed

---

## Phase Dependencies

### Prerequisites (Must Be Complete)

✅ M1: Design System (Complete)
✅ M3: Configuration System (Complete)
✅ M4 Phase 1-2: Core Features & Testing (Complete)
🔄 M2.5: Runtime Fork (In Progress → Must Complete Before Phase 3 Start)

### Blockers

- **M2.5 Completion:** Phase 3 cannot start until stratus-runtime is ready with updated floorp-runtime.lock.json
- **Build Environment:** Windows build tools, Visual Studio 2022, LLVM, Python, Perl
- **Code Signing:** EV certificate for production installer (can be prepared in parallel)

---

## Work Breakdown Structure

### 4.3.1: Production Build Setup (2 days)

**Objective:** Prepare build environment and configure production settings

**Tasks:**

#### 4.3.1.1: Verify Build Environment
- [ ] Confirm all build tools installed (VS2022, LLVM, Python, Perl, NASM)
- [ ] Update Deno to latest stable (2.9.4+)
- [ ] Verify floorp-runtime.lock.json integration with feles-build
- [ ] Run clean bootstrap build to validate pipeline
- [ ] Document build machine state for reproducibility

**Success Criteria:**
- Bootstrap build completes without errors
- All artifacts generated in expected locations
- Build time recorded for baseline

**Owner:** Build Engineer  
**Effort:** 8 hours

#### 4.3.1.2: Configure Production Build Parameters
- [ ] Update build configuration for production mode
- [ ] Disable debug logging and dev features
- [ ] Enable optimizations (O3 for performance)
- [ ] Configure version numbers (M4 Phase 3 final)
- [ ] Set release channel to "stratus-beta"
- [ ] Update user agent string
- [ ] Configure auto-update endpoint (staging)

**Success Criteria:**
- Configuration verified in build output
- Version numbers correct in About dialog
- User agent reflects Stratus branding

**Owner:** Build Engineer  
**Effort:** 6 hours

#### 4.3.1.3: Prepare Code Signing Infrastructure
- [ ] Obtain EV certificate (DigiCert/Sectigo)
- [ ] Configure certificate in CI/CD pipeline
- [ ] Test code signing process on sample binary
- [ ] Prepare timestamping service configuration
- [ ] Create rollback plan for signing failures

**Success Criteria:**
- Certificate installed and accessible
- Test signature validates
- Timestamping works reliably

**Owner:** DevOps Engineer  
**Effort:** 8 hours

### 4.3.2: Production Build Execution (3 days)

**Objective:** Build production browser binary with all M4 features

**Tasks:**

#### 4.3.2.1: Execute Full Feles-Build Production
- [ ] Run `deno task feles-build build` with production settings
- [ ] Monitor build progress for errors
- [ ] Collect build logs and artifacts
- [ ] Verify all expected binaries generated
- [ ] Calculate build time and file sizes
- [ ] Archive build artifacts for traceability

**Build Outputs Expected:**
- `browser.exe` (main executable, ~60MB)
- `browser.dll` (main library, ~80MB)
- `xul.dll` (Gecko engine, ~150MB)
- Various supporting DLLs and resources
- Total package size: ~400-500MB

**Success Criteria:**
- Build completes without errors
- All binaries present and valid
- Build is reproducible (same hash possible)
- Artifact sizes within expected ranges

**Owner:** Build Engineer  
**Effort:** 16 hours (includes monitoring and troubleshooting)

#### 4.3.2.2: Apply Code Signing
- [ ] Sign all executable files (.exe, .dll)
- [ ] Apply timestamps to signatures
- [ ] Verify signatures with command-line tools
- [ ] Test signature validation on different Windows versions
- [ ] Document signing process for CI/CD automation

**Success Criteria:**
- All binaries properly signed
- Signatures valid and timestamped
- No Windows Defender warnings

**Owner:** DevOps Engineer  
**Effort:** 6 hours

#### 4.3.2.3: Create Installer Package
- [ ] Configure NSIS installer with Stratus branding
- [ ] Include all runtime files and resources
- [ ] Add uninstall configuration
- [ ] Create Start Menu shortcuts
- [ ] Configure default settings (vertical tabs, workspaces)
- [ ] Test installer on clean Windows VM
- [ ] Sign installer executable

**Installer Features:**
- Silent and interactive installation modes
- Program files location: `C:\Program Files\Stratus`
- Registry entries for browser integration
- Uninstall support
- Upgrade path from beta builds

**Success Criteria:**
- Installer creates valid browser installation
- All shortcuts work correctly
- Uninstall removes all files
- Upgrade path works (from previous beta)

**Owner:** Build Engineer  
**Effort:** 8 hours

### 4.3.3: Smoke Testing (2 days)

**Objective:** Verify production build functions correctly across core scenarios

**Tasks:**

#### 4.3.3.1: Browser Launch & UI Validation
- [ ] Launch browser from Start Menu
- [ ] Verify Stratus splash screen displays
- [ ] Check About dialog shows correct version
- [ ] Verify window title shows "Stratus Browser"
- [ ] Confirm UI renders correctly (no visual glitches)
- [ ] Test window minimize/maximize/close
- [ ] Verify taskbar integration

**Test Environment:**
- Windows 11 22H2 (clean VM)
- 1080p display
- 8GB RAM, SSD

**Success Criteria:**
- Browser launches in <3 seconds
- UI renders cleanly
- No console errors in devtools
- About dialog shows M4 Phase 3 version

**Owner:** QA Engineer  
**Effort:** 4 hours

#### 4.3.3.2: M4 Features Functional Verification
- [ ] **Vertical Tabs:** Toggle on/off, verify UI changes, test all styles (horizontal/vertical/multirow)
- [ ] **Workspaces:** Create workspace, switch workspaces, verify tab attribution, archive/restore
- [ ] **Split-View:** Create split view, add tabs to panels, resize panels, test keyboard navigation

**Test Cases per Feature:**
- Vertical Tabs: 8 test scenarios
- Workspaces: 10 test scenarios
- Split-View: 8 test scenarios

**Success Criteria:**
- All features launch without crashing
- Feature toggles persist across restarts
- No data loss or corruption
- Performance acceptable (switches <200ms)

**Owner:** QA Engineer  
**Effort:** 12 hours

#### 4.3.3.3: Core Browser Functionality
- [ ] Navigation (forward/back, reload, stop)
- [ ] Address bar (typing, suggestions, auto-complete)
- [ ] Tab management (new, close, pin, mute, duplicate)
- [ ] Bookmarks (create, organize, search)
- [ ] History (view, clear, search)
- [ ] Settings access and modification
- [ ] DevTools access (F12)

**Test Sites:**
- google.com (search functionality)
- github.com (complex modern site)
- mozilla.org (Mozilla content)
- stratus.local (internal testing site)

**Success Criteria:**
- All core features work without crashes
- Navigation smooth and responsive
- No UI freezes or hangs
- DevTools functional

**Owner:** QA Engineer  
**Effort:** 10 hours

#### 4.3.3.4: Performance & Resource Usage
- [ ] Measure startup time (cold start from first click to responsive)
- [ ] Measure tab switch time (activity monitor)
- [ ] Memory usage (baseline, 10 tabs, 100 tabs)
- [ ] CPU usage during normal browsing
- [ ] Disk I/O patterns during startup
- [ ] Compare against M4 Phase 1 baseline

**Baseline Targets:**
- Startup: <1.5 seconds
- Tab switch: <200ms
- Memory (100 tabs): <1GB
- Idle memory: <200MB
- CPU (idle): <2%

**Success Criteria:**
- All metrics within acceptable ranges
- No performance regressions
- Memory stable (no leaks)
- Resource usage predictable

**Owner:** QA Engineer & Build Engineer  
**Effort:** 8 hours

#### 4.3.3.5: Crash & Stability Testing
- [ ] Rapid tab opening (50 tabs in sequence)
- [ ] Feature toggle stress test (100 toggles)
- [ ] Workspace switching stress test (rapid switches)
- [ ] Split-view resize stress test (rapid resizes)
- [ ] Long-running soak test (8+ hour session)
- [ ] Monitor crash reporter logs

**Success Criteria:**
- Zero crashes during stress tests
- Memory remains stable during soak
- No exceptions in console
- Crash reporter clean

**Owner:** QA Engineer  
**Effort:** 12 hours

### 4.3.4: Automated Test Suite Execution (2 days)

**Objective:** Verify all M4 test suites pass with production build

**Tasks:**

#### 4.3.4.1: Host Test Suite (209 tests)
- [ ] Run `deno task test:host` against production build
- [ ] Verify all 209 tests pass
- [ ] Collect coverage metrics
- [ ] Review any warnings or deprecations
- [ ] Document test execution time

**Success Criteria:**
- 209/209 tests passing
- Test execution time <10 seconds
- No skipped tests
- Zero critical warnings

**Owner:** QA Engineer  
**Effort:** 4 hours

#### 4.3.4.2: Smoke Test Suite (6 steps)
- [ ] Run `deno task test:smoke`
- [ ] Verify all 6 steps complete successfully
- [ ] Check browser launch and shutdown
- [ ] Verify feature availability
- [ ] Collect performance metrics

**Smoke Test Steps:**
1. Browser launch
2. New tab creation
3. Navigation to test site
4. Feature toggle test
5. Workspace creation
6. Browser shutdown

**Success Criteria:**
- All 6 steps pass
- Browser launches and shuts down cleanly
- Test execution time <50 seconds

**Owner:** QA Engineer  
**Effort:** 2 hours

#### 4.3.4.3: M4 Integration Test Execution
- [ ] Run colocated test runner for M4 suites
- [ ] Execute workspaces integration (31 tests)
- [ ] Execute vertical tabs integration (19 tests)
- [ ] Execute split-view integration (27 tests)
- [ ] Verify all 77 tests pass
- [ ] Report any failures with details

**Success Criteria:**
- 77/77 integration tests passing
- Coverage >90% for M4 features
- All test categories passing
- Performance tests within baselines

**Owner:** QA Engineer  
**Effort:** 6 hours

#### 4.3.4.4: Regression Test Report
- [ ] Compare M4 Phase 1 baseline vs Phase 3
- [ ] Identify any performance regressions
- [ ] Analyze memory usage changes
- [ ] Document fixes applied
- [ ] Create summary report

**Report Contents:**
- Test pass rates
- Performance metrics comparison
- Memory usage analysis
- Identified issues and resolutions
- Sign-off checklist

**Success Criteria:**
- No new regressions
- Performance improved or stable
- Memory usage acceptable
- All issues resolved

**Owner:** QA Lead  
**Effort:** 4 hours

### 4.3.5: Accessibility Validation (1 day)

**Objective:** Confirm WCAG 2.1 Level AA compliance in production build

**Tasks:**

#### 4.3.5.1: Screen Reader Testing
- [ ] Test with NVDA (latest version)
- [ ] Test with JAWS (if available)
- [ ] Verify M4 features accessible via keyboard
- [ ] Test workspace navigation with screen reader
- [ ] Test split-view panel navigation
- [ ] Document any accessibility issues

**Test Scenarios:**
- Feature discovery
- Toggle activation
- Workspace switching
- Tab management
- Settings adjustment

**Success Criteria:**
- All core features discoverable by screen reader
- Keyboard navigation complete
- No accessibility errors
- Remediation plan if issues found

**Owner:** Accessibility Tester  
**Effort:** 6 hours

#### 4.3.5.2: Keyboard Navigation Audit
- [ ] Tab through all UI elements
- [ ] Test keyboard shortcuts (Ctrl+Tab, etc.)
- [ ] Verify focus visibility throughout
- [ ] Test with high contrast mode
- [ ] Verify zoom functionality (100-150%)
- [ ] Document keyboard map

**Keyboard Shortcuts Tested:**
- Tab navigation
- Ctrl+Tab (panel switch in split-view)
- Alt+Tab (workspace switch)
- Arrow keys (resize)
- Enter/Space (activation)

**Success Criteria:**
- All keyboard navigation works
- Focus visible always
- Zoom supported to 150%
- High contrast readable

**Owner:** Accessibility Tester  
**Effort:** 4 hours

#### 4.3.5.3: Accessibility Compliance Report
- [ ] Document current compliance status
- [ ] List any remaining issues
- [ ] Prioritize enhancements vs requirements
- [ ] Create remediation timeline for Phase 2.6
- [ ] Sign off on Phase 3 accessibility

**Report Contents:**
- WCAG 2.1 AA assessment
- Test results (NVDA, JAWS, keyboard)
- Issues found and severity
- Remediation plan
- Sign-off checklist

**Success Criteria:**
- AA compliance confirmed
- Issues documented with priority
- Remediation plan clear
- Go/no-go decision for beta

**Owner:** Accessibility Lead  
**Effort:** 3 hours

### 4.3.6: Documentation & Release Preparation (1 day)

**Objective:** Prepare documentation and release artifacts

**Tasks:**

#### 4.3.6.1: Release Notes Generation
- [ ] Collect all M4 features for documentation
- [ ] Document new capabilities (vertical tabs, workspaces, split-view)
- [ ] List improvements and fixes
- [ ] Include installation instructions
- [ ] Add known limitations
- [ ] Prepare FAQ section

**Release Notes Contents:**
- Feature overview (3 major features)
- What's new summary
- Installation guide
- Known limitations
- Getting started guide
- Support contact information

**Success Criteria:**
- Comprehensive feature documentation
- Clear installation steps
- Known issues listed
- User-friendly language

**Owner:** Technical Writer  
**Effort:** 6 hours

#### 4.3.6.2: User Documentation Updates
- [ ] Update user guide for M4 features
- [ ] Create feature tutorials (video scripts or walkthroughs)
- [ ] Update keyboard shortcuts reference
- [ ] Document preferences and settings
- [ ] Add accessibility information
- [ ] Publish to documentation site

**Documentation Sections:**
- Vertical tabs: How to use & customize
- Workspaces: Creation, switching, archiving
- Split-view: Layout, tab management, keyboard nav
- Accessibility: Screen reader support, keyboard nav

**Success Criteria:**
- All M4 features documented
- Screenshots/diagrams included
- Examples clear and actionable
- Accessibility documented

**Owner:** Technical Writer  
**Effort:** 8 hours

#### 4.3.6.3: Beta Launch Preparation
- [ ] Create beta landing page
- [ ] Prepare beta signup form
- [ ] Organize beta tester groups
- [ ] Create feedback collection process
- [ ] Set up issue tracking template
- [ ] Prepare feedback analysis dashboard

**Beta Program Components:**
- Landing page (Stratus website)
- Signup form (Google Forms or custom)
- Early access group (50-100 testers)
- Community group (500-1000 testers)
- Feedback form and issue templates
- Weekly update email template

**Success Criteria:**
- Beta infrastructure ready
- Signup process working
- First 50 testers onboarded
- Feedback collection live

**Owner:** Community Manager  
**Effort:** 8 hours

#### 4.3.6.4: Version Lock File Update
- [ ] Update floorp-runtime.lock.json with M4 Phase 3 build info
- [ ] Record build timestamp and version
- [ ] Include commit hash for reproducibility
- [ ] Add performance baseline notes
- [ ] Commit updated lock file

**Lock File Updates:**
```json
{
  "version": "M4-Phase-3-Final",
  "buildDate": "2026-08-23",
  "commit": "<commit-hash>",
  "runtime": "Gecko ESR 153.0.3.3-stratus",
  "features": ["vertical-tabs", "workspaces", "split-view"],
  "performance": {
    "startupTime": "1.2s",
    "memoryIdle": "120MB",
    "memory100Tabs": "450MB"
  }
}
```

**Success Criteria:**
- Lock file updated
- Metadata accurate
- Reproducible build info recorded

**Owner:** Build Engineer  
**Effort:** 2 hours

---

## Quality Gate Checklist

### Pre-Phase 3 Gate

- [ ] M2.5 runtime fork complete
- [ ] floorp-runtime.lock.json updated
- [ ] Build environment verified
- [ ] Code signing certificates obtained
- [ ] Team assigned and prepared
- [ ] Test plan reviewed and approved

### Mid-Phase Gate (After 4.3.2)

- [ ] Production build complete
- [ ] All binaries signed
- [ ] Installer package created
- [ ] Build artifacts archived
- [ ] No critical build errors
- [ ] Build reproducibility verified

### Pre-Beta Gate (End of Phase 3)

✅ **Must Pass:**
- [ ] All 209 host tests passing
- [ ] All 77 M4 integration tests passing
- [ ] All 6 smoke tests passing
- [ ] Zero crashes in stress testing
- [ ] Performance within baselines
- [ ] WCAG 2.1 AA accessibility confirmed
- [ ] Release notes complete and reviewed
- [ ] Beta infrastructure operational
- [ ] Code signing validated
- [ ] Installer tested on clean VM

⚠️ **Known Acceptable Issues:**
- [ ] Accessibility enhancements (Phase 2.6)
- [ ] Performance optimizations (Phase 2.6)
- [ ] Minor UI polish (Phase 2.6)

🚫 **Blockers (Must Fix Before Release):**
- [ ] Any crashes or hangs
- [ ] M4 features non-functional
- [ ] Accessibility violations (critical)
- [ ] Installer failures
- [ ] Code signing issues

---

## Risk Management

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Build compilation errors | Low | High | Extensive testing in Phase 2, clean build environment |
| Performance regression | Medium | Medium | Continuous benchmarking, revert if needed |
| Crashes in production | Low | High | Comprehensive stress testing, crash reporting |
| Code signing failures | Low | High | Early testing, fallback processes, vendor support |
| Missing features in build | Low | High | M4 Phase 1-2 verification, integration tests |
| Accessibility issues | Medium | Medium | Audit in Phase 3, remediation timeline |

### Contingency Plans

**Build Compilation Errors:**
- Rollback to last working commit
- Diagnose compilation issue in parallel
- Rebuild with fix
- Re-run full test suite

**Performance Regression:**
- Identify regression source via profiling
- Apply targeted optimizations
- Re-benchmark and compare
- Document changes and impact

**Crashes in Production:**
- Capture crash logs and debug info
- Isolate reproducer scenario
- Emergency patch if critical
- Flag for post-beta hotfix if non-critical

**Code Signing Failures:**
- Use fallback signing service
- Retry with different certificate
- Contact vendor support
- Continue with alternative approach

**Missing Features:**
- Quick rebuild with feature flag fix
- Verify with regression tests
- Document what was missing and why
- Add to Phase 2.6 verification checklist

---

## Timeline & Milestones

### Week 4 (Days 1-5)

**4.3.1: Build Setup** (2 days)
- Monday-Tuesday: Environment verification, production configuration, signing setup
- Checkpoint: All build prerequisites ready ✓

**4.3.2: Production Build** (3 days)
- Wednesday-Friday: Full build execution, code signing, installer creation
- Checkpoint: Production binary ready and signed ✓

### Week 5 (Days 6-10)

**4.3.3: Smoke Testing** (2 days)
- Monday-Tuesday: Browser launch, M4 features, core functionality
- Checkpoint: Manual testing complete ✓

**4.3.4: Test Suite Execution** (2 days)
- Wednesday-Thursday: Host tests, smoke tests, integration tests
- Checkpoint: All automated tests passing ✓

**4.3.5-6: Validation & Release Prep** (1 day)
- Friday: Accessibility audit, documentation, release notes
- Checkpoint: Ready for beta release ✓

**Final Sign-Off:** Friday EOD
- All gates passed
- Beta program live
- First cohort of testers onboarded

---

## Success Criteria

### Functional Success

✅ Production browser builds and launches  
✅ All M4 features functional (vertical tabs, workspaces, split-view)  
✅ Zero crashes during comprehensive testing  
✅ All 292 tests passing (209 host + 77 integration + 6 smoke)  
✅ Performance baselines met or exceeded  

### Quality Success

✅ WCAG 2.1 Level AA accessibility confirmed  
✅ Code properly signed and validated  
✅ Installer creates valid installation  
✅ Reproducible build documented  
✅ All documentation complete  

### Release Readiness

✅ Beta infrastructure operational  
✅ 50+ beta testers onboarded  
✅ Feedback collection process live  
✅ Issue tracking configured  
✅ Support channels established  

### Sign-Off

- **Build Engineer:** "Build quality excellent, ready for beta"
- **QA Lead:** "All tests passing, no critical issues, go"
- **Accessibility Lead:** "AA compliant, accessible to testers"
- **Release Manager:** "Infrastructure ready, launch approved"
- **Product Lead:** "Feature complete, community engagement ready"

---

## Integration with M5-M7

### Parallel Work (Weeks 4-5)

While Phase 3 executes, parallel teams can:
- Finalize M5 platform architecture
- Prototype M6 privacy UI
- Design M7 theme templates
- Begin M5 API layer 1 implementation

### Phase 3 Completion Gate

M5-M7 work blocked until:
✅ M4 Phase 3 complete  
✅ Production build validated  
✅ Beta program operational  
✅ First feedback cycle analyzed  

**Expected Date:** Friday of Week 5 (2026-08-30)

---

## Resource Requirements

### Personnel

- **Build Engineer** (1.0 FTE): 4.3.1, 4.3.2, leadership on testing
- **QA Engineer** (1.0 FTE): 4.3.3, 4.3.4, stress testing
- **Accessibility Tester** (0.5 FTE): 4.3.5 validation
- **DevOps Engineer** (0.5 FTE): 4.3.1, code signing, CI/CD
- **Technical Writer** (0.5 FTE): 4.3.6 documentation
- **Community Manager** (0.5 FTE): 4.3.6 beta program

**Total: 3-4 FTE equivalent**

### Infrastructure

- Build machine: Windows 11, VS2022, LLVM, 16GB RAM, SSD
- Test VMs: 3-5 clean Windows 11 instances
- Code signing: DigiCert/Sectigo infrastructure
- Storage: 1TB for build artifacts and backups
- CI/CD: GitHub Actions configured and tested

### External Dependencies

- Code signing certificate (EV, DigiCert or Sectigo)
- Timestamping service access
- Windows update servers (for testing)
- GitHub Actions runners

---

## Communication Plan

### Stakeholders

- **Development Team:** Daily standup, async updates in shared channel
- **Quality Team:** Test execution reports, daily test results
- **Leadership:** Weekly progress review (Wed 3pm)
- **Beta Testers:** Weekly update emails, feature highlights
- **Community:** Public announcement of beta launch

### Reporting

- **Daily:** Build status (Slack #stratus-build)
- **Daily:** Test results (automated GitHub Actions)
- **Mid-Phase:** Gate review and decision
- **End-of-Phase:** Comprehensive Phase 3 summary
- **Beta Launch:** Public announcement and FAQ

### Escalation Path

1. **Build Issues:** Build Engineer → Tech Lead → Project Lead
2. **Test Failures:** QA Engineer → QA Lead → Release Manager
3. **Critical Blockers:** Immediate team huddle + stakeholder notification
4. **Schedule Slippage:** Project lead + team assessment + mitigation plan

---

## Sign-Off & Approval

**Prepared by:** Kiro (Development Partner)  
**Phase Owner:** [Build Engineer Name]  
**QA Lead:** [QA Lead Name]  
**Release Manager:** [Release Manager Name]  
**Approved by:** [Project Lead Name]  

**Status:** Ready for Execution  
**Start Date:** Week 4 (2026-08-19)  
**Target Completion:** Week 5 EOD (2026-08-30)  
**Confidence Level:** High (90%+)

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-09  
**Next Review:** After M2.5 completion (Week 3 EOD)
