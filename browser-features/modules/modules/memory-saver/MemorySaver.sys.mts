// SPDX-License-Identifier: MPL-2.0
/**
 * M8.8 memory saver (startup-initialized): applies the memory-optimized
 * knob set from MemorySaverCore on fresh profiles and reacts to
 * memory-pressure by discarding inactive, non-pinned, non-audible tabs
 * (gBrowser.discardBrowser — live-verified on ESR 153). The engine-native
 * browser.tabs.unloadOnLowMemory knob is part of the applied set, so the
 * watchdog and the engine's own unloader both help under real pressure.
 */
import {
  applySaverKnobs,
  isMemorySaverEnabled,
  loadSavedDefaults,
  MEMORY_DISCARDS_PREF,
  MEMORY_SAVER_PREF,
  persistSavedDefaults,
  readDiscardCount,
  readSavedDefaults,
  restoreBuildDefaults,
  SAVER_KNOBS,
  type MemoryKnob,
} from "./MemorySaverCore.ts";

const TOPIC_MEMORY_PRESSURE = "memory-pressure";

interface MemoryStats { enabled: boolean; discards: number; knobs: MemoryKnob[] }

type BrowserWindowLike = {
  gBrowser?: {
    tabs?: ReadonlyArray<{
      pinned?: boolean;
      selected?: boolean;
      audible?: unknown;
      getAttribute?(name: string): string | null;
      linkedBrowser?: {
        uncertainDiscarded?: boolean;
        isConnected?: boolean;
        isLoading?: boolean;
      };
    }>;
    /** Engine-owned discard: takes the TAB (aTab, aForceDiscard). */
    discardBrowser?(tab: unknown, force?: boolean): boolean;
  };
};

let initializing = false;

function ensureKnobs(): void {
  // Snapshot the build defaults once, before the first apply, so that
  // disabling the saver returns the exact pre-saver values.
  const snapshot = loadSavedDefaults();
  if (!snapshot) {
    persistSavedDefaults(readSavedDefaults());
  }
  applySaverKnobs();
}

function onSaverPrefChanged(): void {
  const enabled = isMemorySaverEnabled();
  if (enabled) {
    ensureKnobs();
    console.info("[memory-saver] enabled: knobs applied");
  } else {
    restoreBuildDefaults();
    console.info("[memory-saver] disabled: build defaults restored");
  }
}

const saverPrefObserver = {
  observe(): void {
    onSaverPrefChanged();
  },
};

/**
 * Explicit setter used by the settings UI / remote agents. Sets the pref
 * (which fires the observer) AND applies immediately so callers clearing the
 * pref still get the right state.
 */
export function setMemorySaverEnabled(enabled: boolean): void {
  Services.prefs.setBoolPref(MEMORY_SAVER_PREF, enabled);
  onSaverPrefChanged();
}

function discardInactiveTabs(): number {
  let discards = 0;
  const wins = Services.wm.getEnumerator("navigator:browser") as unknown as {
    hasMoreElements(): boolean;
    getNext(): unknown;
  };
  while (wins.hasMoreElements()) {
    const win = wins.getNext() as BrowserWindowLike;
    const gb = win.gBrowser;
    if (!gb?.tabs || typeof gb.discardBrowser !== "function") {
      continue;
    }
    for (const tab of gb.tabs) {
      if (tab.pinned || tab.selected || tab.audible) {
        continue;
      }
      // Respect the platform tab-sleep exclusion allowlist (user patterns).
      if (tab.getAttribute?.("floorp-sleep-excluded") === "true") {
        continue;
      }
      const browser = tab.linkedBrowser;
      if (
        !browser ||
        browser.uncertainDiscarded ||
        browser.isLoading ||
        browser.isConnected === false ||
        tab.getAttribute?.("pending") === "true"
      ) {
        continue;
      }
      try {
        // Engine-owned discard: gBrowser.discardBrowser(aTab, force). Passing
        // the tab (not the browser) is the ESR 153 contract; it flushes
        // session state, destroys the frame and marks the tab lazy.
        if (gb.discardBrowser(tab, false)) {
          discards += 1;
        }
      } catch (error) {
        console.error("[memory-saver] discard failed:", error);
      }
    }
  }
  if (discards > 0) {
    const total = readDiscardCount() + discards;
    Services.prefs.setIntPref(MEMORY_DISCARDS_PREF, total);
  }
  return discards;
}

export function getMemoryStats(): MemoryStats {
  return {
    enabled: isMemorySaverEnabled(),
    discards: readDiscardCount(),
    knobs: Array.from(SAVER_KNOBS),
  };
}

export function initMemorySaver(): void {
  if (initializing) {
    return;
  }
  initializing = true;
  try {
    if (isMemorySaverEnabled()) {
      ensureKnobs();
      console.info("[memory-saver] active with", readSavedDefaults() ? Object.keys(readSavedDefaults()!).length : 0, "knobs");
    }
    // Object-form observer (function-form callbacks are unreliable on this
    // runtime): flips the knob set whenever the user toggles the saver.
    Services.prefs.addObserver(MEMORY_SAVER_PREF, saverPrefObserver);
    Services.obs.addObserver(memoryPressureObserver, TOPIC_MEMORY_PRESSURE);
  } catch (error) {
    console.error("[memory-saver] init failed:", error);
  }
}

function observeMemoryPressure(_subject: unknown, topic: string, data: string): void {
  if (topic !== TOPIC_MEMORY_PRESSURE || data.startsWith("heap-minimize")) {
    return;
  }
  if (!isMemorySaverEnabled()) {
    return;
  }
  const level = data === "low-memory-ongoing" ? "ongoing" : "low-memory";
  const discards = discardInactiveTabs();
  console.info("[memory-saver]", level, "pressure -> discarded", discards, "inactive tab(s)");
}

const memoryPressureObserver = {
  observe(subject: unknown, topic: string, data: string): void {
    observeMemoryPressure(subject, topic, data);
  },
};

// Kept exported for the test harness: run the discard pass directly.
export function runDiscardPass(): number {
  return discardInactiveTabs();
}
