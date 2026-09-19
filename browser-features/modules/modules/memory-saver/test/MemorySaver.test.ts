// @colocated-env browser
// M8.8 memory saver: knob lifecycle + low-memory watchdog.
import { assert, assertEquals, runTests } from "../../../../chrome/test/utils/test_harness.ts";
import { initMemorySaver, runDiscardPass, getMemoryStats } from "../MemorySaver.sys.mts";
import {
  MEMORY_DEFAULTS_PREF,
  MEMORY_DISCARDS_PREF,
  MEMORY_SAVER_PREF,
  readDiscardCount,
  restoreBuildDefaults,
  SAVER_KNOBS,
  wipeDefaultsSnapshot,
} from "../MemorySaverCore.ts";
import { isSnapshotTainted } from "../MemorySaverCore.ts";

function resetState(): void {
  try { Services.prefs.clearUserPref(MEMORY_SAVER_PREF); } catch { /* clear */ }
  wipeDefaultsSnapshot();
  try { Services.prefs.clearUserPref(MEMORY_DISCARDS_PREF); } catch { /* clear */ }
}

function knobValue(name: string): boolean | number | null {
  try {
    const k = SAVER_KNOBS.find((k) => k.name === name);
    if (!k) {
      return null;
    }
    return k.type === "bool"
      ? Services.prefs.getBoolPref(name)
      : Services.prefs.getIntPref(name);
  } catch {
    return null;
  }
}

function testFreshProfileAppliesSaver(): void {
  resetState();
  initMemorySaver();
  assertEquals(knobValue("browser.tabs.unloadOnLowMemory"), true, "native unload enabled");
  assertEquals(knobValue("browser.sessionhistory.max_entries"), 20, "history entries capped");
  assertEquals(knobValue("browser.sessionhistory.contentViewerTimeout"), 180, "idle viewers expire");
  assertEquals(knobValue("browser.sessionstore.max_tabs_undo"), 10, "undo tabs trimmed");
  assertEquals(knobValue("browser.cache.memory.capacity"), 49152, "memory cache capped");
  assertEquals(knobValue("dom.ipc.processCount"), 4, "content processes capped");
  const snapshot = Services.prefs.getStringPref(MEMORY_DEFAULTS_PREF, "");
  assert(snapshot.length > 0, "build defaults snapshot persisted");
}

function testDisableRestoresBuildDefaults(): void {
  resetState();
  initMemorySaver(); // fresh -> applies saver + snapshots
  Services.prefs.setBoolPref(MEMORY_SAVER_PREF, false);
  Services.obs.notifyObservers(Services.prefs, "nsPref:changed", MEMORY_SAVER_PREF);
  // restoreBuildDefaults is invoked through the pref observer; it clears the
  // user prefs back to the build defaults on a fresh test profile.
  restoreBuildDefaults();
  const maxEntries = knobValue("browser.sessionhistory.max_entries");
  assertEquals(maxEntries, 50, "history entries back to build default");
  const undo = knobValue("browser.sessionstore.max_tabs_undo");
  assertEquals(undo, 25, "undo tabs back to build default");
  const unload = knobValue("browser.tabs.unloadOnLowMemory");
  assertEquals(unload, false, "native unload back to build default");
  const processes = knobValue("dom.ipc.processCount");
  assertEquals(processes, 8, "content processes back to build default");
}

function testWatchdogDiscardsInactiveKeepsActive(): void {
  resetState();
  initMemorySaver();
  const win = Services.wm.getMostRecentWindow("navigator:browser") as unknown as { gBrowser?: { selectedTab: { linkedBrowser: { isConnected: boolean } }; addTrustedTab(uri: string, opts: unknown): unknown; removeTab(tab: unknown): void } } | null;
  const gb = win?.gBrowser;
  if (!gb) {
    console.warn("[memory-saver:test] no browser window available, skipping window case");
    return;
  }
  const added = gb.addTrustedTab("about:blank", { relatedToCurrent: true }) as {
    linkedBrowser: { isConnected: boolean };
    getAttribute(name: string): string | null;
  };
  // active tab = the newly added tab; the original is now inactive + unpinned.
  const stats = getMemoryStats();
  const before = stats.discards;
  const discarded = runDiscardPass();
  assert(discarded >= 1, "inactive unpinned tab discarded by the pass");
  const after = readDiscardCount();
  assert(after >= before + 1, "discard counter incremented");
  assert(added.getAttribute("pending") !== "true", "ACTIVE tab is never marked pending");
  assertEquals(
    added.linkedBrowser.isConnected,
    true,
    "active browser frame stays connected",
  );
  // cleanup: close the extra tab
  gb.removeTab(added);
}

function testHeapMinimizeIsIgnored(): void {
  resetState();
  initMemorySaver();
  const before = readDiscardCount();
  Services.obs.notifyObservers(Services.prefs, "memory-pressure", "heap-minimize");
  assertEquals(readDiscardCount(), before, "heap-minimize does not discard tabs");
  const wins = Services.wm.getEnumerator("navigator:browser") as unknown as {
    hasMoreElements(): boolean;
    getNext(): unknown;
  };
  let ok = true;
  while (wins.hasMoreElements()) { const w = wins.getNext(); ok = !!w && ok; }
  assert(ok, "window enumeration still healthy after the notification");
}

function testTaintedSnapshotFallsBackToEngineDefaults(): void {
  resetState();
  initMemorySaver();
  // Simulate the tainted-snapshot failure mode: the stored defaults equal the
  // saver values (captured after an apply).
  const tainted: Record<string, boolean | number> = {};
  for (const k of SAVER_KNOBS) {
    tainted[k.name] = k.saver;
  }
  assert(isSnapshotTainted(tainted), "all-saver snapshot flagged tainted");
  Services.prefs.setStringPref(MEMORY_DEFAULTS_PREF, JSON.stringify(tainted));
  Services.prefs.setBoolPref(MEMORY_SAVER_PREF, false);
  restoreBuildDefaults();
  // Engine defaults: unload off, 50 history entries, processCount back to the
  // build default (8 on this machine), cache -1 (auto).
  assertEquals(knobValue("browser.tabs.unloadOnLowMemory"), false, "unload cleared to engine default");
  assertEquals(knobValue("browser.sessionhistory.max_entries"), 50, "entries cleared to engine default");
  assertEquals(knobValue("browser.cache.memory.capacity"), -1, "cache cleared to auto");
  assertEquals(knobValue("dom.ipc.processCount"), 8, "processes cleared to engine default");
}

export function runAllTests(): void {
  runTests("memory-saver.test", [
    { name: "fresh profile applies saver knobs + snapshot", fn: testFreshProfileAppliesSaver },
    { name: "disable restores build defaults", fn: testDisableRestoresBuildDefaults },
    { name: "watchdog discards inactive but keeps active", fn: testWatchdogDiscardsInactiveKeepsActive },
    { name: "heap-minimize level is ignored", fn: testHeapMinimizeIsIgnored },
    { name: "tainted snapshot falls back to engine defaults", fn: testTaintedSnapshotFallsBackToEngineDefaults },
  ]);
}
