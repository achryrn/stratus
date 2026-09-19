// SPDX-License-Identifier: MPL-2.0
/**
 * M8.8 memory saver: knob table + apply/restore logic for the memory-
 * optimized pref set. Pure / pref-only functions so tests can drive the
 * whole lifecycle without touching browser windows.
 */

export type KnobType = "bool" | "int";

export interface MemoryKnob {
  /** Full pref name, live-verified on ESR 153. */
  name: string;
  type: KnobType;
  /** Value applied while the memory saver is enabled. */
  saver: boolean | number;
  /** Short human label used in the saved-defaults snapshot. */
  label: string;
}

export const MEMORY_SAVER_PREF = "stratus.memory.saver";
export const MEMORY_DEFAULTS_PREF = "stratus.memory.savedDefaults";
export const MEMORY_DISCARDS_PREF = "stratus.memory.discards";

export const SAVER_KNOBS: ReadonlyArray<MemoryKnob> = [
  { name: "browser.tabs.unloadOnLowMemory", type: "bool", saver: true, label: "native unload" },
  { name: "browser.sessionhistory.max_entries", type: "int", saver: 20, label: "history entries" },
  { name: "browser.sessionhistory.contentViewerTimeout", type: "int", saver: 180, label: "viewer timeout" },
  { name: "browser.sessionstore.max_tabs_undo", type: "int", saver: 10, label: "undo tabs" },
  { name: "browser.sessionstore.max_windows_undo", type: "int", saver: 3, label: "undo windows" },
  { name: "browser.cache.memory.capacity", type: "int", saver: 49152, label: "memory cache KB" },
  { name: "browser.cache.disk.capacity", type: "int", saver: 153600, label: "disk cache KB" },
  { name: "dom.ipc.processCount", type: "int", saver: 4, label: "content processes" },
];

export type SavedDefaults = Record<string, boolean | number>;

/**
 * Snapshot the engine's current values for every knob we manage. Call this
 * BEFORE first apply so disabling the saver returns the build's original
 * values (e.g. dom.ipc.processCount=8 on this machine, cache auto -1).
 */
export function readSavedDefaults(): SavedDefaults {
  const out: SavedDefaults = {};
  for (const knob of SAVER_KNOBS) {
    if (Services.prefs.getPrefType(knob.name) === Services.prefs.PREF_INVALID) {
      continue;
    }
    out[knob.name] = knob.type === "bool"
      ? Services.prefs.getBoolPref(knob.name)
      : Services.prefs.getIntPref(knob.name);
  }
  return out;
}

export function persistSavedDefaults(snapshot: SavedDefaults): void {
  Services.prefs.setStringPref(MEMORY_DEFAULTS_PREF, JSON.stringify(snapshot));
}

export function loadSavedDefaults(): SavedDefaults | null {
  try {
    const raw = Services.prefs.getStringPref(MEMORY_DEFAULTS_PREF, "");
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as SavedDefaults;
  } catch {
    return null;
  }
}

export function wipeDefaultsSnapshot(): void {
  try {
    Services.prefs.clearUserPref(MEMORY_DEFAULTS_PREF);
  } catch { /* already clear */ }
}

export function applySaverKnobs(): void {
  for (const knob of SAVER_KNOBS) {
    if (knob.type === "bool") {
      Services.prefs.setBoolPref(knob.name, knob.saver as boolean);
    } else {
      Services.prefs.setIntPref(knob.name, knob.saver as number);
    }
  }
}

export function isSnapshotTainted(snapshot: SavedDefaults | null): boolean {
  // Self-healing guard: if every captured value equals the saver value (or
  // is missing), the snapshot was taken AFTER an apply (dev/test profiles,
  // mid-session resets). Restoring from it would silently keep the saver
  // values, so treat it as invalid and fall back to clearing the user prefs
  // (the engine defaults).
  if (!snapshot) {
    return true;
  }
  for (const knob of SAVER_KNOBS) {
    const saved = snapshot[knob.name];
    if (saved !== undefined && saved !== knob.saver) {
      return false;
    }
  }
  return true;
}

export function restoreBuildDefaults(): void {
  const snapshot = loadSavedDefaults() ?? readSavedDefaults();
  if (isSnapshotTainted(snapshot)) {
    for (const knob of SAVER_KNOBS) {
      try {
        Services.prefs.clearUserPref(knob.name);
      } catch { /* not set */ }
    }
    return;
  }
  for (const knob of SAVER_KNOBS) {
    const saved = snapshot[knob.name];
    if (saved === undefined) {
      try {
        Services.prefs.clearUserPref(knob.name);
      } catch { /* not set */ }
      continue;
    }
    if (knob.type === "bool") {
      Services.prefs.setBoolPref(knob.name, Boolean(saved));
    } else {
      Services.prefs.setIntPref(knob.name, Number(saved));
    }
  }
}

export function isMemorySaverEnabled(): boolean {
  // Not user-modified yet -> saver is ON (our default for fresh profiles).
  return Services.prefs.getBoolPref(MEMORY_SAVER_PREF, true);
}

export function readDiscardCount(): number {
  return Services.prefs.getIntPref(MEMORY_DISCARDS_PREF, 0);
}
