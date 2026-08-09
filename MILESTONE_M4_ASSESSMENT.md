# Milestone M4 — Feature Platforms (Assessment)

**Status:** 🔍 ASSESSMENT  
**Gating Dependency:** M2.5 Runtime Rebuild (must complete before M4 reaches production)  
**Date:** 2026-08-09  

---

## Overview

M4 is the **feature platform maturity** phase. The goal is to harden, test, and prepare 6 platform features for production:

1. **Workspaces** — Tab grouping with snapshot/archive/restore
2. **Split View** — Side-by-side tab layouts with interactive splitter
3. **Vertical Tabs** — Alternative tab strip orientation
4. **Performance Center** — System performance monitoring & optimization
5. **Media Center** — Media playback & library management
6. **Download Manager** — Download tracking & organization

This assessment determines **what's already built**, **what needs hardening**, and **what's missing entirely**.

---

## Feature Status Summary

| Feature | Status | Code Loc | Tests | Skin Coverage | Notes |
|---|---|---|---|---|---|
| **Workspaces** | ✅ Fully Implemented | 15 files | ✅ Yes | ✅ Yes (M3 increment 3) | Production-ready; needs platform testing |
| **Split View** | ✅ Fully Implemented | 12 files | ✅ Yes | ✅ Yes (M3 increment 3) | Production-ready; needs platform testing |
| **Vertical Tabs** | ⚠️ Partial | Tabbar module | ⚠️ Limited | ✅ Yes (M3 increment 2) | Geometry done; needs UX refinement & testing |
| **Performance Center** | ❌ Not Started | N/A | ❌ No | ❌ No | Stub or placeholder; design needed |
| **Media Center** | ❌ Not Started | N/A | ❌ No | ❌ No | Stub or placeholder; design needed |
| **Download Manager** | ❌ Not Started | N/A | ❌ No | ❌ No | Stub or placeholder; design needed |

---

## Detailed Assessment

### 1. Workspaces ✅ Fully Implemented

**Location:** `browser-features/chrome/common/workspaces/`

**Status:** Production-ready (no build-out needed for M4)

**Implementation:**
- 15 files including:
  - `workspacesService.ts` — Core service (create, rename, delete, switch, snapshot, archive, restore)
  - `workspacesTabManager.tsx` — Tab lifecycle & workspace attribution
  - `workspacesDataManagerBase.tsx` — Persistence & data migration
  - `workspace-modal.tsx` — Management UI
  - Snapshot & archive utilities
  - Context menus, toolbar button, popup selector

**Features:**
- ✅ Create/rename/delete workspaces
- ✅ Switch between workspaces (tabs follow)
- ✅ Capture snapshots (tab state at moment in time)
- ✅ Archive workspace (save & clear)
- ✅ Restore from archive (re-populate tabs)
- ✅ Data persistence (prefs-based storage)
- ✅ Workspace context menu (right-click tabs)
- ✅ Toolbar button + popup selector

**Stratus Skin Coverage (M3):**
- ✅ Workspace toolbar button (tab-radius)
- ✅ Selected workspace pill (accent 18% + inset ring)
- ✅ Hover surfaces (accent 8%)
- ✅ Restore item buttons (rounded + accent hover)

**Tests:**
- ✅ Colocated designs test: `testStratusCoversSplitView`
- ⚠️ Feature unit tests: Need to audit

**M4 Platform Work:**
- Per-platform build verification (ensure workspaces work on Windows, macOS, Linux)
- Integration testing with split-view + vertical tabs
- Performance testing (many workspaces, large snapshots)
- User feedback & UX refinement

**Verdict:** **Ready for M4 hardening phase.** No new feature code needed.

---

### 2. Split View ✅ Fully Implemented

**Location:** `browser-features/chrome/common/split-view/`

**Status:** Production-ready (no build-out needed for M4)

**Implementation:**
- 12 files including:
  - `split-view-manager.ts` — Manager (layout state, reactive effects)
  - `layout.ts` — Layout calculations (position, dimensions, drag)
  - `layout.spec.ts` — Layout algorithm tests
  - Components (splitter handles, grid layout, button UI)
  - Data & persistence layer
  - Patches & styles

**Features:**
- ✅ Create split layouts (horizontal or vertical)
- ✅ Drag splitter to resize panes
- ✅ Click handles to expand/collapse
- ✅ Layout state persisted
- ✅ Tab rendering in split regions
- ✅ Reactive layout tracking via SolidJS effects

**Stratus Skin Coverage (M3):**
- ✅ Drag handles (accent 22% hovers)
- ✅ Grid handles (accent 22% hovers)
- ✅ Split-view button (tab-radius + hover surface)

**Tests:**
- ✅ Layout algorithm tests: `layout.spec.ts`
- ✅ Colocated designs test: `testStratusCoversSplitView`
- ⚠️ Feature integration tests: Need to audit

**M4 Platform Work:**
- Per-platform build verification
- Integration testing with workspaces + vertical tabs
- Performance testing (many splits, rapid resizing)
- Edge case testing (collapse/expand, nested splits)
- User feedback & UX refinement

**Verdict:** **Ready for M4 hardening phase.** No new feature code needed.

---

### 3. Vertical Tabs ⚠️ Partial Implementation

**Location:** `browser-features/chrome/common/tabbar/` (multirow-tabbar, tabbar-style)

**Status:** Geometry implemented; needs UX refinement

**Implementation:**
- Tab strip can render vertically (pill-shaped layout, margin/gap via CSS)
- CSS variables control geometry:
  - `--stratus-tab-radius: 9px`
  - `--stratus-tab-gap: 4px`
  - `--stratus-tab-block-margin: 4px`
  - `--tab-min-height: 32px`

**Stratus Skin Coverage (M3 increment 2):**
- ✅ Vertical-tab pill geometry
- ✅ Active label accent
- ✅ Close-button hover surfaces
- ✅ Loading/sound indicators

**What's Missing:**
- ⚠️ **UI Toggle:** No UI control to switch vertical/horizontal (need settings option or toolbar button)
- ⚠️ **Layout State Persistence:** Vertical orientation preference not persisted
- ⚠️ **Responsive Behavior:** Unclear how tabs respond when width is constrained (should auto-layout?)
- ⚠️ **Integration:** Interaction with workspaces + split-view in vertical mode untested
- ⚠️ **Accessibility:** Screen reader behavior in vertical layout untested

**Tests:**
- ⚠️ No dedicated vertical-tabs tests (geometry only in css.test.ts)
- ❌ No UX/interaction tests

**M4 Platform Work:**
1. **Add UI Control:** Settings option or toolbar button to toggle vertical orientation
2. **Persist State:** Save vertical preference to prefs
3. **Testing:** Layout responsiveness, accessibility, interaction with other features
4. **Polish:** Animation on toggle, smooth transitions
5. **Documentation:** Vertical tabs user guide

**Verdict:** **Needs refinement.** Geometry is done; UX/settings layer is missing.

---

### 4. Performance Center ❌ Not Started

**Location:** TBD

**Status:** Not implemented

**Scope (Estimated):**
- System metrics display (CPU, memory, disk, network)
- Per-tab performance indicators
- Performance optimization suggestions
- Historical performance trending
- Integration with Firefox DevTools or custom dashboard

**Design Questions:**
- Where is it UI-located? (sidebar panel, modal, dashboard page?)
- What metrics are displayed? (real-time only, or historical?)
- Should it be always-on or on-demand?
- Integration with browser performance telemetry?

**M4 Platform Work:**
1. **Design phase:** Mockups, UX research, accessibility review
2. **Implementation:** Create feature module, UI components, metrics collection
3. **Testing:** Performance impact of metrics collection, accuracy validation
4. **Integration:** Stratus skin styling, M3 design coverage

**Effort Estimate:** 2–3 weeks

**Verdict:** **Greenfield.** Requires design → implementation → testing.

---

### 5. Media Center ❌ Not Started

**Location:** TBD

**Status:** Not implemented

**Scope (Estimated):**
- Media playback control (pause, play, skip, volume)
- Media queue/playlist management
- Media library browser (music, podcasts, video)
- Integration with browser media controls or external players
- Now-playing display & history

**Design Questions:**
- Is this for in-browser media (HTML5 video/audio) or external apps?
- Should it integrate with system media controls?
- Playlist/library storage (local or cloud)?
- Album art, metadata display?

**M4 Platform Work:**
1. **Design phase:** Mockups, feature scope, integration strategy
2. **Implementation:** Create feature module, UI components, media API integration
3. **Testing:** Media codec support, playback state tracking, queue reliability
4. **Integration:** Stratus skin styling, M3 design coverage

**Effort Estimate:** 2–3 weeks

**Verdict:** **Greenfield.** Requires design → implementation → testing.

---

### 6. Download Manager ❌ Not Started

**Location:** TBD

**Status:** Not implemented

**Scope (Estimated):**
- Download list & progress tracking
- Pause/resume/cancel downloads
- Download history & archiving
- File organization (group by type, date, domain)
- Virus scan integration (optional)
- Auto-cleanup old downloads

**Design Questions:**
- UI location? (sidebar panel, modal, dedicated page?)
- Integration with Firefox's built-in download manager or replacement?
- Cloud sync for download history?
- Smart grouping heuristics?

**M4 Platform Work:**
1. **Design phase:** Mockups, integration strategy
2. **Implementation:** Create feature module, download API integration, UI components
3. **Testing:** Download reliability, cancellation, state persistence
4. **Integration:** Stratus skin styling, M3 design coverage

**Effort Estimate:** 2–3 weeks

**Verdict:** **Greenfield.** Requires design → implementation → testing.

---

## M4 Work Breakdown

### Phase 1: Mature Existing Features (Weeks 1–4)

#### Workspaces Hardening
- Audit feature tests (unit, integration, e2e)
- Platform-specific testing (Windows, macOS, Linux)
- Performance testing (10+ workspaces, large snapshots)
- User feedback & UX polish
- Documentation & help content

#### Split View Hardening
- Audit feature tests
- Platform-specific testing
- Layout edge cases (collapse/expand, nested splits)
- Performance testing (many splits, rapid resizing)
- Accessibility testing (keyboard navigation, screen readers)
- Documentation & help content

#### Vertical Tabs Completion
- Add UI toggle (settings option + toolbar button)
- Persist orientation preference
- Test responsiveness & layout reflow
- Accessibility testing (screen readers, keyboard)
- Animation & smooth transitions
- Documentation

**Deliverable:** All 3 features pass platform gate (build + tests green on Windows)

### Phase 2: New Feature Design (Weeks 2–3, parallel with Phase 1)

#### Performance Center Design
- Research & competitive analysis
- Mockups & wireframes
- Accessibility review
- Stratus skin plan

#### Media Center Design
- Research & competitive analysis
- Mockups & wireframes
- Integration strategy (browser vs. external)
- Accessibility review
- Stratus skin plan

#### Download Manager Design
- Research & competitive analysis
- Mockups & wireframes
- Integration strategy (built-in vs. replacement)
- Accessibility review
- Stratus skin plan

**Deliverable:** 3 design specs + Stratus skin coverage plans

### Phase 3: New Feature Implementation (Weeks 4–8)

#### Performance Center Implementation
- Create feature module
- Metrics collection & display
- Testing & validation
- Stratus skin application

#### Media Center Implementation
- Create feature module
- Media API integration
- UI components
- Testing & validation
- Stratus skin application

#### Download Manager Implementation
- Create feature module
- Download API integration
- UI components
- Testing & validation
- Stratus skin application

**Deliverable:** All 3 features implemented, tested, skinned

### Phase 4: Platform Verification & Gating (Week 9)

- Build all 6 features together (Windows build)
- Run full test suite (host + smoke + new feature tests)
- Per-platform testing (if macOS/Linux support is required)
- Performance profiling
- Security review

**Deliverable:** M4 platform gate passing

---

## Resource & Timeline Estimate

| Phase | Task | Effort | Owner |
|---|---|---|---|
| **Phase 1** | Workspaces hardening | 1 week | Feature team |
| | Split view hardening | 1 week | Feature team |
| | Vertical tabs completion | 1 week | Feature team |
| **Phase 2** | Design 3 new features | 1 week | Design team |
| **Phase 3** | Implement 3 new features | 3–4 weeks | Dev team |
| **Phase 4** | Platform verification & gating | 1 week | QA + Dev |
| **Total** | | **8–10 weeks** | Multi-disciplinary |

**Blockers:**
- M2.5 Runtime Rebuild must complete before M4 can ship to production
- Design specs for Performance, Media, Download centers (can start in parallel)

---

## Recommendation

### Immediate (Next 1–2 weeks)
1. **Audit existing tests:** Workspaces & Split View have feature code; validate test coverage
2. **Complete vertical tabs:** Add UI toggle, settings persistence, accessibility testing
3. **Start design:** Begin Performance, Media, Download center design specs in parallel

### Follow-up (Weeks 3–10)
1. **Platform hardening:** Workspaces & Split View integration tests, performance testing
2. **New feature build:** Implement 3 new features with design specs
3. **M2.5 dependency:** Coordinate with M2.5 timeline (must complete before M4 production release)

### Success Criteria
- ✅ All 6 features implemented
- ✅ Platform-specific build green (Windows at minimum)
- ✅ Host + smoke + feature tests all passing
- ✅ Stratus skin coverage complete for all 6 features
- ✅ Documentation & help content ready
- ✅ M2.5 runtime rebuild complete (enables production release)

---

## Conclusion

**M4 is a mixed workload:** 2 mature features (workspaces, split-view) ready for hardening + 1 near-complete feature (vertical tabs) needing UX polish + 3 greenfield features (performance, media, download centers) needing full design & implementation.

With parallel design & development, M4 can complete in **8–10 weeks**. The critical path is M2.5 runtime rebuild (gating for production), which runs in parallel.

**Next action:** Begin Phase 1 hardening on existing features + Phase 2 design on new features.

---

## Appendix: Feature Checklist

### Workspaces
- [x] Core feature implemented
- [x] Stratus skin applied
- [ ] Unit tests comprehensive
- [ ] Integration tests (+ split-view, vertical tabs)
- [ ] Performance tests (10+ workspaces)
- [ ] Platform tests (Windows)
- [ ] Accessibility tests
- [ ] Documentation

### Split View
- [x] Core feature implemented
- [x] Stratus skin applied
- [x] Layout algorithm tests
- [ ] Integration tests (+ workspaces, vertical tabs)
- [ ] Performance tests (many splits)
- [ ] Edge case tests (collapse/expand)
- [ ] Platform tests (Windows)
- [ ] Accessibility tests
- [ ] Documentation

### Vertical Tabs
- [x] Geometry implemented
- [x] Stratus skin applied
- [ ] UI toggle (settings + toolbar button)
- [ ] Settings persistence
- [ ] Responsiveness & layout reflow
- [ ] Platform tests (Windows)
- [ ] Accessibility tests
- [ ] Animation & transitions
- [ ] Documentation

### Performance Center
- [ ] Design spec
- [ ] Stratus skin plan
- [ ] Feature implementation
- [ ] Metrics collection
- [ ] UI components
- [ ] Tests
- [ ] Documentation

### Media Center
- [ ] Design spec
- [ ] Stratus skin plan
- [ ] Feature implementation
- [ ] Media API integration
- [ ] UI components
- [ ] Tests
- [ ] Documentation

### Download Manager
- [ ] Design spec
- [ ] Stratus skin plan
- [ ] Feature implementation
- [ ] Download API integration
- [ ] UI components
- [ ] Tests
- [ ] Documentation
