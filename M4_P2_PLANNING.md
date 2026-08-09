# M4 Phase 2: Workspaces & Split-View Hardening — Planning & Scope

**Created:** 2026-08-09  
**Phase Duration:** 8–10 weeks  
**Status:** Planning  
**Blockers:** None identified

## Executive Summary

M4 Phase 2 focuses on hardening and extending the two fully-implemented platform features: workspaces and split-view. Both features have complete geometry and CSS styling (via Stratus). This phase adds comprehensive testing, platform validation, accessibility compliance, and integration with the new vertical tabs feature.

## Feature Status Summary

| Feature | Geometry | CSS | UI Toggle | Tests | Accessibility | Status |
|---------|----------|-----|-----------|-------|----------------|--------|
| **Workspaces** | ✅ Complete | ✅ Stratus | ✅ Implemented | ⏳ Pending | ⏳ Pending | **Ready for Phase 2** |
| **Split-View** | ✅ Complete | ✅ Stratus | ✅ Implemented | ⏳ Pending | ⏳ Pending | **Ready for Phase 2** |
| **Vertical Tabs** | ✅ Complete | ✅ Stratus | ✅ Phase 1 | ✅ Phase 1 | ⏳ Phase 2 | **Integration focus** |

## Phase 2 Work Breakdown

### Track 1: Workspaces Platform (4 weeks, 6 tasks)

#### Task 2.1: Workspaces Test Suite (1 week)
**Goal:** Comprehensive functional testing for workspace creation, switching, and persistence

**Acceptance Criteria:**
- ✅ Test workspace creation via UI and keyboard shortcut
- ✅ Test workspace switching (forward/back navigation)
- ✅ Test workspace persistence (state survives browser restart)
- ✅ Test workspace deletion and cleanup
- ✅ Test workspace name editing
- ✅ Test max workspace limit enforcement (if applicable)

**Files to Create/Modify:**
- `browser-features/chrome/common/workspaces/test/workspaces.test.ts` (NEW, ~200 lines)
- `tools/src/colocated_test_runner.ts` — Register workspaces test module

**Expected Coverage:**
- 8–10 test functions
- Colocated (browser integration) tests
- Error conditions (invalid names, max limit exceeded)

#### Task 2.2: Workspaces + Vertical Tabs Integration Tests (1 week)
**Goal:** Verify that vertical tabs toggle works correctly within workspace contexts

**Acceptance Criteria:**
- ✅ Test vertical tabs toggle persists within workspace
- ✅ Test workspace switch doesn't reset tabbar style
- ✅ Test vertical tabs style is consistent across all workspaces
- ✅ Test vertical tabs + workspace keyboard shortcuts don't conflict

**Files to Create/Modify:**
- `browser-features/chrome/common/workspaces/test/workspaces.test.ts` — Add integration tests
- Update test registration in colocated runner

**Expected Coverage:**
- 4–5 integration test functions
- Verify state consistency across feature boundaries

#### Task 2.3: Workspaces Accessibility Audit (1 week)
**Goal:** WCAG 2.1 AA compliance for workspace UI and interactions

**Audit Checklist:**
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader announcements (workspace names, switch notifications)
- ✅ Focus management (initial focus, focus restoration)
- ✅ Color contrast (workspace icons, active indicators)
- ✅ Label and description associations
- ✅ Error messages (clear, recoverable)

**Testing Tools:**
- NVDA (screen reader, Windows)
- Keyboard-only navigation
- Chrome DevTools accessibility audit
- Manual testing on Windows 11

**Deliverable:** `docs/ACCESSIBILITY_AUDIT_WORKSPACES.md` (findings + recommendations)

#### Task 2.4: Workspaces Platform Tests (1 week)
**Goal:** Validate workspaces on Windows 11, macOS (if applicable), and Linux

**Test Scenarios:**
- ✅ Create, switch, delete workspaces on each platform
- ✅ Verify workspace state persists across browser restarts
- ✅ Test with different screen resolutions (1080p, 1440p, 4K)
- ✅ Test with multiple monitors (workspace spans monitors, etc.)
- ✅ Performance baseline (time to create/switch workspace)

**Platforms:**
- Windows 11 (primary)
- macOS (if resources available)
- Linux (if resources available)

**Deliverable:** `docs/PLATFORM_TESTS_WORKSPACES.md` (results, known issues)

#### Task 2.5: Workspaces Documentation & Examples (1 week)
**Goal:** User-facing docs + developer API examples

**Deliverables:**
- `docs/USER_GUIDE_WORKSPACES.md` — How to use workspaces (create, switch, delete, customize)
- `docs/DEVELOPER_API_WORKSPACES.md` — Workspace API for extensions/developers
- `docs/ARCHITECTURE_WORKSPACES.md` — Internal design (pref structure, event flow, persistence)

**Content:**
- Keyboard shortcuts reference
- Screenshots/demo GIFs
- Common workflows (organizing by project, by task type)
- Extension API (if applicable)

#### Task 2.6: Workspaces Bug Hunt & Hardening (1 week)
**Goal:** Identify and fix edge cases, race conditions, and edge case bugs

**Focus Areas:**
- ✅ Concurrent workspace operations (rapid create/delete)
- ✅ Workspace switching during tab operations (dragging tabs, closing tabs)
- ✅ Workspace state corruption (pref corruption, recovery)
- ✅ Memory leaks (workspace cleanup, event listener removal)
- ✅ Performance degradation (many workspaces, large tab counts)

**Tools:**
- Automated stress tests (rapid operations)
- Memory profiler (DevTools)
- Event listener verification
- Preference corruption injection tests

---

### Track 2: Split-View Platform (4 weeks, 6 tasks)

#### Task 2.7: Split-View Test Suite (1 week)
**Goal:** Comprehensive functional testing for split-view layout, resizing, and persistence

**Acceptance Criteria:**
- ✅ Test split-view toggle (on/off)
- ✅ Test split-view orientation (horizontal/vertical)
- ✅ Test split pane resizing (drag separator)
- ✅ Test split-view persistence (state survives restart)
- ✅ Test split-view + tab operations (new tab, close tab in each pane)
- ✅ Test split-view cleanup (unsplit, close browser)

**Files to Create/Modify:**
- `browser-features/chrome/common/split-view/test/split-view.test.ts` (NEW, ~200 lines)
- `tools/src/colocated_test_runner.ts` — Register split-view test module

**Expected Coverage:**
- 8–10 test functions
- Colocated (browser integration) tests
- Separator drag tests (resize verification)

#### Task 2.8: Split-View + Vertical Tabs Integration Tests (1 week)
**Goal:** Verify vertical tabs work correctly in split-view panes

**Acceptance Criteria:**
- ✅ Test vertical tabs toggle within each split pane independently
- ✅ Test vertical tabs style consistency across panes
- ✅ Test tab dragging between split panes with vertical tabs active
- ✅ Test split-view orientation change with vertical tabs active

**Files to Create/Modify:**
- `browser-features/chrome/common/split-view/test/split-view.test.ts` — Add integration tests

**Expected Coverage:**
- 4–5 integration test functions
- Verify feature interactions don't cause regressions

#### Task 2.9: Split-View Accessibility Audit (1 week)
**Goal:** WCAG 2.1 AA compliance for split-view UI

**Audit Checklist:**
- ✅ Keyboard navigation (Tab, arrows to move focus between panes)
- ✅ Screen reader announcements (pane names, active pane, resize notifications)
- ✅ Focus management (focus in active pane, focus trap escape)
- ✅ Color contrast (pane separators, active indicators)
- ✅ Resize handle accessibility (keyboard-accessible resize)
- ✅ Error messages and feedback

**Testing Tools:**
- NVDA (screen reader)
- Keyboard-only navigation
- Chrome DevTools accessibility audit
- Manual testing

**Deliverable:** `docs/ACCESSIBILITY_AUDIT_SPLIT_VIEW.md`

#### Task 2.10: Split-View Platform Tests (1 week)
**Goal:** Validate split-view on multiple platforms and configurations

**Test Scenarios:**
- ✅ Toggle split-view on/off on each platform
- ✅ Resize panes at various ratios (50/50, 30/70, 10/90)
- ✅ Verify split-view state persists across restarts
- ✅ Test with different screen resolutions (1080p, 1440p, 4K)
- ✅ Test with multiple monitors (split-view spanning monitors)
- ✅ Performance baseline (toggle time, resize responsiveness)

**Platforms:**
- Windows 11 (primary)
- macOS (if resources available)
- Linux (if resources available)

**Deliverable:** `docs/PLATFORM_TESTS_SPLIT_VIEW.md`

#### Task 2.11: Split-View Documentation & Examples (1 week)
**Goal:** User-facing docs + developer API examples

**Deliverables:**
- `docs/USER_GUIDE_SPLIT_VIEW.md` — How to use split-view (toggle, resize, organize tabs)
- `docs/DEVELOPER_API_SPLIT_VIEW.md` — Split-view API for extensions
- `docs/ARCHITECTURE_SPLIT_VIEW.md` — Internal design (pane management, event flow, persistence)

**Content:**
- Keyboard shortcuts reference
- Resize drag demo (screenshots/GIFs)
- Common workflows (research, comparison, reference)
- Extension API

#### Task 2.12: Split-View Bug Hunt & Hardening (1 week)
**Goal:** Identify and fix edge cases and race conditions

**Focus Areas:**
- ✅ Rapid toggle split-view on/off
- ✅ Resize separator edge cases (minimum pane size, maximum drag)
- ✅ Tab operations during split (dragging, closing, switching)
- ✅ State corruption (pref corruption, recovery)
- ✅ Memory leaks (event listener cleanup, pane cleanup)
- ✅ Performance (pane switching, large tab counts)

**Tools:**
- Automated stress tests
- Memory profiler
- Event listener verification
- Preference corruption tests

---

### Track 3: Cross-Feature Integration (2 weeks, 3 tasks)

#### Task 2.13: Vertical Tabs + Workspaces + Split-View Integration (1 week)
**Goal:** Comprehensive integration testing for all three features together

**Test Scenarios:**
- ✅ Create workspace with split-view active (each pane with vertical tabs)
- ✅ Switch workspaces while split-view active (tabbar style persists in all panes)
- ✅ Toggle split-view with vertical tabs in workspace (layout changes, tabs remain)
- ✅ Toggle vertical tabs in split panes within workspace (independent toggles)
- ✅ Rapid operations: toggle split + switch workspace + toggle vertical tabs
- ✅ Keyboard shortcuts don't conflict (Ctrl+Shift+V for tabs, workspace shortcuts)

**Files to Create/Modify:**
- `browser-features/chrome/common/designs/test/css.test.ts` — Add integration tests
- NEW: `tools/src/integration_tests.ts` (optional, for complex multi-feature tests)

**Expected Coverage:**
- 6–8 integration test functions
- State consistency verification
- Keyboard shortcut conflict detection

#### Task 2.14: Performance & Memory Baseline (1 week)
**Goal:** Establish performance benchmarks for feature interactions

**Metrics to Measure:**
- Time to create workspace
- Time to switch workspace
- Time to toggle split-view
- Time to toggle vertical tabs
- Memory usage (idle, with N workspaces, with split-view active)
- Frame rate during pane resize
- Tab drag performance (split-view, vertical tabs, across workspaces)

**Deliverable:** `docs/PERFORMANCE_BASELINE_M4_PHASE2.md`
- Baseline numbers (Windows 11, reference hardware)
- Known hotspots identified
- Optimization recommendations for Phase 3

#### Task 2.15: M4 Phase 2 Completion Report (1 week)
**Goal:** Comprehensive phase completion documentation

**Deliverable:** `M4_P2_COMPLETION.md`
- Summary of all tasks completed
- Test coverage report
- Accessibility audit results
- Platform test results
- Known issues and mitigation strategies
- Performance baselines
- Lessons learned
- Recommendations for Phase 3

---

## Timeline & Milestones

| Week | Task | Owner | Status |
|------|------|-------|--------|
| 1 | 2.1, 2.7 (test suites) | Engineering | Not started |
| 2 | 2.2, 2.8 (integration tests) | Engineering | Not started |
| 3 | 2.3, 2.9 (accessibility) | A11y Lead | Not started |
| 4 | 2.4, 2.10 (platform tests) | QA Lead | Not started |
| 5 | 2.5, 2.11 (docs) | Tech Writer | Not started |
| 6 | 2.6, 2.12 (hardening) | Engineering | Not started |
| 7 | 2.13 (integration) | Engineering | Not started |
| 8 | 2.14, 2.15 (perf, report) | Engineering + QA | Not started |

**Total Duration:** 8–10 weeks (with optional parallelization)

## Success Criteria

### Test Coverage
- ✅ 16+ new test functions (8 workspaces + 8 split-view)
- ✅ 4+ integration test functions (vertical tabs + workspaces + split-view)
- ✅ All tests passing on host and colocated runners
- ✅ Edge cases and race conditions covered

### Accessibility
- ✅ WCAG 2.1 AA compliance verified for workspaces
- ✅ WCAG 2.1 AA compliance verified for split-view
- ✅ Keyboard navigation fully functional
- ✅ Screen reader compatible
- ✅ No color contrast violations

### Platform Support
- ✅ Windows 11 fully tested and working
- ✅ macOS and Linux tested (baseline, known issues documented)
- ✅ Multiple screen resolutions validated (1080p, 1440p, 4K)
- ✅ Multi-monitor scenarios tested

### Documentation
- ✅ User guides for workspaces and split-view
- ✅ Developer API documentation
- ✅ Architecture documentation
- ✅ Performance baselines documented

### Quality
- ✅ No memory leaks identified
- ✅ No race condition bugs
- ✅ Edge cases handled gracefully
- ✅ Performance within acceptable limits (TBD in Phase 2)

## Known Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Accessibility compliance gaps | Medium | High | Early audit (week 3), iterative fixes |
| Cross-platform issues (macOS/Linux) | Medium | Medium | Platform-specific tests, issue tracking |
| Memory leaks in feature interactions | Low | High | Profiling tools, automated memory tests |
| Keyboard shortcut conflicts | Low | Medium | Conflict detection in phase 1, tests |
| Performance regression (large workspace counts) | Low | Medium | Baseline measurements, optimization queue |

## Dependencies & Prerequisites

### Internal
- ✅ M4 Phase 1 (vertical tabs) — COMPLETE
- ✅ Stratus CSS styling — COMPLETE
- ✅ Config system + old-config migrator — COMPLETE

### External
- Floorp test browser (feles-build test) — Already available
- NVDA screen reader (for accessibility) — Required for weeks 3, 6
- Performance profiling tools (Chrome DevTools) — Available

### Team
- 1 Senior Engineer (test suite lead, hardening)
- 1 QA Lead (platform tests, bug hunt)
- 1 Accessibility Specialist (audit, compliance)
- 1 Technical Writer (documentation)

## Deliverables Checklist

### Code Artifacts
- [ ] `workspaces.test.ts` — Full test suite
- [ ] `split-view.test.ts` — Full test suite
- [ ] Integration tests (updated `css.test.ts`)
- [ ] Bug fixes and hardening commits

### Documentation
- [ ] `USER_GUIDE_WORKSPACES.md`
- [ ] `USER_GUIDE_SPLIT_VIEW.md`
- [ ] `DEVELOPER_API_WORKSPACES.md`
- [ ] `DEVELOPER_API_SPLIT_VIEW.md`
- [ ] `ARCHITECTURE_WORKSPACES.md`
- [ ] `ARCHITECTURE_SPLIT_VIEW.md`
- [ ] `ACCESSIBILITY_AUDIT_WORKSPACES.md`
- [ ] `ACCESSIBILITY_AUDIT_SPLIT_VIEW.md`
- [ ] `PLATFORM_TESTS_WORKSPACES.md`
- [ ] `PLATFORM_TESTS_SPLIT_VIEW.md`
- [ ] `PERFORMANCE_BASELINE_M4_PHASE2.md`
- [ ] `M4_P2_COMPLETION.md`

### Quality Assurance
- [ ] All tests passing (host + colocated)
- [ ] Accessibility audit complete
- [ ] Platform tests on Windows 11, macOS, Linux
- [ ] Performance baselines established
- [ ] No memory leaks detected
- [ ] No race condition bugs

---

## Next Phase (M4 Phase 3)

After Phase 2 completion, Phase 3 will implement three new greenfield features:

1. **Performance Center** — System metrics, resource monitoring, optimization tools
2. **Media Center** — Media download, format conversion, metadata management
3. **Download Manager** — Enhanced download UI, resumable downloads, organization

Each feature requires ~3 weeks (design + implementation + testing).

---

**Created By:** Floorp Browser Dev Team  
**Status:** Ready for kickoff after M4 Phase 1 completion  
**Approval Date:** 2026-08-09  
**Next Review:** Upon Phase 2 kickoff
