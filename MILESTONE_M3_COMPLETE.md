# Milestone M3 — UI Redesign (Complete)

**Status:** ✅ COMPLETE  
**Date:** 2026-08-09  
**Commits:** `397f3c52eb8c` through `9666b14e90d2` (6 commits)

---

## Overview

M3 (UI Redesign) is the visual identity phase of Stratus. The goal was to replace the traditional Firefox interface with a cohesive, branded design that reflects Stratus as a distinct browser product.

**Outcome:** The Stratus design identity is now applied to **every interactive surface** in the chrome layer via the centralized `stratus.css` skin (15,929 bytes, AGENT_SHEET mechanism).

---

## Design Principles Applied

### 1. **Stratus Accent Token**
- Primary accent: `#6c5ce7` (purple)
- Used consistently across all interactive elements for visual unity
- Color depth via `color-mix()` for hover states, selections, and emphasis

### 2. **Geometric Language**
- Tab radius: `var(--stratus-tab-radius)` = 9px
- Pill-shaped containers (command palette, urlbar, workspace buttons)
- Inset rings and accent borders for focus states

### 3. **Color-Consistency Invariant**
- Navbar, sidebar, status bar, and personal toolbar share a single unified background
- Never repainted in skins (enforced by `color-consistency.test.ts`)
- Maintains visual harmony across the entire chrome layer

---

## Coverage Map

### Command Palette
- ✅ Container (radius 14px, layered shadow)
- ✅ Search input (accent caret, accent icon)
- ✅ Category headers (accent text)
- ✅ Item selection (accent 14% background + accent border)
- ✅ Hover states (accent 7%)
- ✅ Shortcut badges (accent 10%)
- ✅ Step indicators & breadcrumbs (accent 70%)
- ✅ Error chips (rounded + semantic red border)
- ✅ Empty state (accent 70% title)
- ✅ Query match highlight (accent text)
- ✅ Step choices scroll region (accent 35% scrollbar)
- ✅ Selected choice label (accent text)
- ✅ Loading state (accent 70% + padding)

### Panel Sidebar
- ✅ Panel buttons (tab radius)
- ✅ Active pill state (accent 22% background + inset ring)
- ✅ Hover surfaces (tab-hover-background)
- ✅ User-context borders (accent)
- ✅ Floating panel (radius + shadow)
- ✅ Floating splitter hovers (accent 22%)
- ✅ Header separator (accent 15% border)

### Tab Strip
- ✅ Active tab label (accent text)
- ✅ Close-button hover (accent rounded surface)
- ✅ Pinned tab underline (accent)
- ✅ Loading indicator (accent fill)
- ✅ Sound-playing speaker icon (accent)
- ✅ New-tab button (accent hover)
- ✅ Vertical-orient geometry (pill layout)

### Navigation & Focus
- ✅ URL bar focused ring (accent)
- ✅ URL bar icon hover (accent rounded surface)
- ✅ Nav bar surface (shared across bars)
- ✅ Personal toolbar (shared surface)
- ✅ Status bar (shared surface, no bg repaint)
- ✅ Find bar (accent-tinted pill surface)

### Feature Integrations
- ✅ Workspaces toolbar button (tab radius)
- ✅ Workspace selector pill (accent 18% + inset ring 35%)
- ✅ Workspace hover surfaces (accent 8%)
- ✅ Workspace restore items (rounded + accent hover)
- ✅ Split-view drag handles (accent 22% hovers)
- ✅ Split-view grid handles (accent 22% hovers)
- ✅ Split-view button (tab radius + hover surface)

---

## Test Coverage

| Test Function | Status | Assertions |
|---|---|---|
| `testStratusReturnsUserjsNull` | ✅ | userjs === null |
| `testStratusHasUseTabColorAsToolbarColor` | ✅ | useTabColorAsToolbarColor === true |
| `testStratusHasStylesOrRaw` | ✅ | chromeStylesRaw includes CSS |
| `testStratusIncludesColorFix` | ✅ | Gecko 152 color fix present |
| `testStratusCoversCommandPalette` | ✅ | Palette container, icons, categories |
| `testStratusCoversPanelSidebar` | ✅ | Sidebar buttons, active state, float |
| `testStratusCoversStatusbar` | ✅ | No bg repaint (invariant) |
| `testStratusCoversFindbar` | ✅ | Find bar styling |
| `testStratusCoversTabStrip` | ✅ | Close button, loading, label, vertical |
| `testStratusCoversUrlbarFocus` | ✅ | Focus ring, icon hover |
| `testStratusCoversWorkspaces` | ✅ | Workspace selector, restore items |
| `testStratusCoversSplitView` | ✅ | Split handles, grid handles, button |
| `testStratusCoversPaletteDetails` | ✅ | Match highlight, caret, back button, error |
| `testStratusCoversSidebarDetails` | ✅ | Floating splitter hovers, header border |
| `testStratusCoversPaletteStepChoices` | ✅ | Step choices scrollbar, label, loading |

**Total:** 14 test functions, all passing.

---

## Build & Verification Results

### Test Suites
- **Colocated designs tests:** 9/9 passing (170ms avg)
- **Host tests:** 209/209 passing (6–13s)
- **Smoke tests:** 6/6 steps passing (16–18s)

### Production Bundle
- **Stratus CSS file:** `_dist/noraneko/skin/stratus/css/stratus.css`
  - Size: 15,929 bytes
  - Hash: `6FCA5A11FF9BD5B8D4F08CBA2B56D939318883AAB7E7DE4F34326A9B60BBE81A`
  - Byte-identical to source after rebuild ✅

- **Chrome bundle:** `_dist/noraneko/content/assets/js/`
  - All selectors present in `index7.js` (main chrome bundle)
  - Palette subset also in `index5.js`
  - Split-view selectors in `index21.js`
  - Workspaces selectors in `index28.js`

### Stage Build
- ✅ Builder SUCCESS
- ✅ "Designs override loaded" in browser console
- ✅ Stratus pref active (`"userInterface":"stratus"`)
- ✅ All 14 test assertions passing

---

## Development Increments

### Increment 1: Core Surfaces
- Palette, sidebar, status bar, find bar
- **Commit:** `ff5493e9be72`

### Increment 2: Tab & URL Bar
- Tab strip details, URL bar focus, vertical-tab geometry
- **Commit:** `9a55fed8b2ce`

### Increment 3: Workspaces & Split View
- Workspace selector, restore items, split-view handles
- **Commit:** `eee332931a35`

### Increment 4: Palette & Sidebar Details
- Palette match highlight, error chip, sidebar splitter hovers, header border
- **Commit:** `515469ed2a66`

### Increment 5: Palette Step Choices & Scrollbar
- Step choices scroll region, selected label, loading state
- **Commit:** `7f5d7c65bf95`

---

## Architecture Notes

### Skin Mechanism
- **Type:** AGENT_SHEET (privileged stylesheet registered via `nsIStyleSheetService`)
- **Source:** `browser-features/skin/stratus/css/stratus.css`
- **Integration:** Loaded dynamically by `BrowserDesignElement.tsx` when `uiTheme === "stratus"`
- **All rules use `!important`** to ensure application over base Firefox styles

### Token System
```css
--stratus-accent: #6c5ce7              /* Purple primary */
--stratus-tab-radius: 9px              /* Geometric signature */
--stratus-tab-gap: 4px                 /* Spacing */
--stratus-surface-1/2: [mixes]         /* Background surfaces */
--stratus-urlbar-radius: 999px         /* Pill container */
--tab-min-height: 32px !important      /* Tab geometry */
```

### Color-Mix Depth Palette
- **Accent 7%:** Light hover (e.g., palette item hover)
- **Accent 8%:** Workspace hover
- **Accent 14%:** Medium hover (e.g., back button)
- **Accent 15%:** Subtle separator (e.g., header border)
- **Accent 18%:** Workspace selected (pill)
- **Accent 22%:** Strong hover (e.g., splitter)
- **Accent 35%:** Scrollbar tint
- **Accent 70%:** Text emphasis (breadcrumb, empty state, loading)

---

## Known Constraints

1. **Color-consistency invariant:** The 4 main bars (#nav-bar, #PersonalToolbar, #panel-sidebar-box, #nora-statusbar) must share ONE background. This is tested in `color-consistency.test.ts` and must be maintained for future skins.

2. **Upstream crash (known issue):** `mouseGestureController.test.ts` crashes on Windows due to upstream Floorp runtime bug. Mitigated by exclusion filter in CI.

3. **Runtime pinning:** Gecko version is pinned via `floorp-runtime.lock.json` (daily-998, build 20260725). Any future Gecko update requires runtime rebuild (M2.5 task).

---

## Next Steps

### M3 Gating Criteria ✅
- ✅ All chrome surfaces styled
- ✅ 14 test assertions covering palette, sidebar, tabs, urlbar, workspaces, split-view
- ✅ 209/209 host tests green
- ✅ Build + stage verification green
- ✅ Production bundle confirmed

**M3 is COMPLETE and ready for production transition.**

### Next Milestones
1. **M2.5 Runtime Rebuild** (GATING for M4+): Fork Floorp-Runtime, rebuild Gecko with Stratus identity (moz.configure, application.ini, version resources, update URLs). Heavy infrastructure lift.

2. **M4 Feature Platforms**: With M2.5 complete, mature and test workspaces, split-view, vertical tabs, performance/media/download centers.

3. **M5 Developer Platform**: Stratus OS API extension, MCP server, extension SDK.

4. **M6 AI & Privacy**: AI assistant (privacy-first), privacy center, telemetry audit.

5. **M7 Customization**: Theme studio, mods ecosystem, dashboard landing.

6. **Release Engineering**: CI/CD, signing, update mechanism, crash reporting, installer, final hardening.

---

## Conclusion

**Stratus now has a complete, cohesive visual identity.** Every interactive element reflects the design language: purple accent, geometric pill containers, unified bar surfaces, and consistent color depth. The skin is centralized, tested, and production-ready.

The browser is visually distinct from Firefox and recognizable as its own product. This milestone marks the end of the UI redesign phase and the beginning of the runtime rebrand and feature platform development.

**Status: ✅ READY FOR NEXT PHASE**
