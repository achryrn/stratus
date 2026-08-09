# M4 Phase 1 — Vertical Tabs UI Toggle Implementation

**Status:** 🔄 IN PROGRESS  
**Task ID:** M4-P1-001 (Vertical Tabs UI Toggle)  
**Estimated Effort:** 1 week  
**Priority:** High (unblocks M4 hardening pipeline)

---

## Overview

Vertical tabs geometry is already implemented in the config system (`tabbarStyle: "vertical"`). This task adds the **UI layer** — a settings control to toggle between horizontal, multirow, and vertical tab layouts.

**Scope:**
1. Create command palette command for vertical tabs toggle
2. Add settings preference UI option
3. Persist choice to prefs
4. Test toggle behavior + state persistence

---

## Implementation Plan

### Step 1: Add Command Palette Command

**File:** `browser-features/chrome/common/command-palette/command-registry.ts`

**Action:** Add command to toggle tab layout:
```typescript
"view-vertical-tabs": {
  name: "Vertical Tabs",
  category: "view",
  shortcut: null,
  handler: () => {
    // Toggle to vertical if not already, else back to horizontal
    const currentStyle = Services.prefs.getCharPref("floorp.tabbar.style.current", "horizontal");
    const newStyle = currentStyle === "vertical" ? "horizontal" : "vertical";
    Services.prefs.setCharPref("floorp.tabbar.style.current", newStyle);
    // Trigger config update
    triggerDesignConfigUpdate();
  }
}
```

### Step 2: Add Settings Preference Storage

**File:** `browser-features/chrome/common/designs/configs.ts`

**Action:** Update config to read/write `floorp.tabbar.style.current`:
- Add pref listener to save `config().tabbar.tabbarStyle` changes to `floorp.tabbar.style.current`
- Load preference on startup

### Step 3: Update Old Config Migrator

**File:** `browser-features/chrome/common/designs/utils/old-config-migrator.ts`

**Action:** Ensure backward compatibility:
- Migrate old `floorp.tabbar.style` (int pref) to new `floorp.tabbar.style.current` (string pref)
- Map: 0="horizontal", 1="multirow", 2="vertical"

### Step 4: Add UI Toggle (Settings Page / Sidebar Menu)

**Option A: Command Palette (Quickest)**
- Users press `Ctrl+Shift+P` → type "vertical tabs" → Enter to toggle
- No additional UI code needed

**Option B: Settings/Sidebar Menu**
- Add option to sidebar settings menu
- Radio button group: Horizontal / Multirow / Vertical

**Recommendation:** Start with Option A (command palette) for MVP, then add Option B if needed.

### Step 5: Test & Verification

**Tests to Add:**
1. `testVerticalTabsToggleViaCommand` — Verify command palette toggle works
2. `testVerticalTabsPersistence` — Verify setting persists across restart
3. `testVerticalTabsLayoutSwitch` — Verify DOM changes when style switches
4. `testVerticalTabsAccessibility` — Verify keyboard navigation in vertical mode

**Verification Steps:**
1. Launch browser
2. Open command palette (`Ctrl+Shift+P`)
3. Type "vertical" → Select "Vertical Tabs"
4. Verify tabs switch to vertical layout (pill-shaped, stacked)
5. Close & relaunch browser
6. Verify vertical layout persists
7. Toggle back to horizontal via command
8. Verify switch back works

---

## Files to Modify

| File | Changes | Lines |
|---|---|---|
| `command-registry.ts` | Add "view-vertical-tabs" command | +15 |
| `configs.ts` | Add pref listener for tabbar style | +10 |
| `old-config-migrator.ts` | Add pref migration logic | +8 |
| `css.test.ts` | Add vertical tabs persistence test | +20 |
| Total | | +53 lines |

---

## Implementation Checklist

- [ ] Create command in command-registry
- [ ] Add pref listener in configs.ts
- [ ] Update old-config-migrator for backward compatibility
- [ ] Write persistence test
- [ ] Write layout switch test
- [ ] Manual verification: toggle via command palette
- [ ] Manual verification: restart persistence
- [ ] Commit: "M4: add vertical tabs UI toggle via command palette"
- [ ] Update ARCHITECTURE.md M4 progress row
- [ ] Mark todo #6 completed

---

## Success Criteria

- ✅ Command palette command works (Ctrl+Shift+P → "Vertical Tabs")
- ✅ Tabs switch to vertical layout immediately
- ✅ Setting persists across browser restart
- ✅ Toggle back to horizontal works
- ✅ Tests pass (host + smoke + new vertical tabs tests)
- ✅ No regressions in other features

---

## Next Steps After Completion

1. **Accessibility testing** (todo #7): Screen reader, keyboard navigation
2. **Animation & transitions** (polish): Smooth toggle animation
3. **Workspaces + split-view hardening** (todo #8–9): Integration testing

---

## Notes

- **Vertical tabs geometry:** Already implemented in CSS via `--stratus-tab-radius`, `--stratus-tab-gap`, `--tab-min-height`
- **Stratus skin coverage:** Already applied in M3 increment 2
- **No new UI components needed:** Just config + command palette integration
- **Fast iteration possible:** Command palette is simpler than full settings page

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Pref persistence fails | Low | High | Write test before implementation |
| Layout switch animation janky | Medium | Low | Add transition CSS, polish later |
| Keyboard navigation broken in vertical | Medium | Medium | Add accessibility tests early |
| Regressions in horizontal/multirow | Low | High | Run full test suite after changes |

---

## Timeline

- **Day 1:** Implement command + pref listener (2 hours)
- **Day 2:** Add tests + verification (2 hours)
- **Day 3:** Polish + accessibility review (1 hour)
- **Total:** ~5 hours (can complete in 1 day)

**Estimated completion:** End of day 1 (8/9 or 8/10 depending on start time)
