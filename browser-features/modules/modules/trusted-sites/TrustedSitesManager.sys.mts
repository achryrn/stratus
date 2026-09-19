/**
 * M8.4 TrustedSitesManager — applies trusted-site action grants and keeps the
 * fullscreen-gesture pref in sync with the allowlisted site that is currently
 * focused.
 *
 * Empirical facts (Gecko 153 dev runtime, do not re-derive):
 *  - No per-origin way to allow gesture-free fullscreen: granting the
 *    "fullscreen" nsIPermissionManager type does NOT unlock it. The ONLY
 *    switch is `full-screen-api.allow-trusted-requests-only` (global).
 *  - requestFullscreen from a non-active tab is denied by Gecko regardless,
 *    so a watchdog that holds the pref FALSE only while an allowlisted site is
 *    the focused tab is a safe v1 approximation (Gecko patch for true
 *    per-origin gating is queued with the M2.5/M8.7 patch train).
 *  - window.screenDetails is not exposed on this build even with
 *    dom.window-management.enabled + a window-management grant; the grant is
 *    still issued for future builds, and "window hopping" keeps working via
 *    the classic moveTo/resizeTo surface.
 */
import {
  type HostInfo,
  type TrustedAction,
  type TrustedMatch,
  type TrustedSitesConfig,
  type TrustedSiteEntry,
  hostInfoFromUrl,
  isTrustedActionGranted,
  makeId,
  matchTrustedSite,
  normalizePattern,
  parseTrustedSites,
  serializeTrustedSites,
  validPattern,
} from "./TrustedSitesCore.ts";

export const TRUSTED_SITES_PREF = "stratus.permissions.trustedSites";
export const TRUSTED_SITES_UPDATED_TOPIC = "stratus.trusted-sites.updated";
const FULLSCREEN_PREF = "full-screen-api.allow-trusted-requests-only";

let trustedSites: TrustedSitesConfig = [];
let configDirty = true;
let initialized = false;
let lastFullscreenPref: boolean | null = null;

export const TRUSTED_PERMISSION_TYPES: TrustedAction[] = [
  "window-management",
  "notifications",
  "autoplay",
];

function readConfig(): TrustedSitesConfig {
  if (configDirty) {
    trustedSites = parseTrustedSites(Services.prefs.getStringPref(TRUSTED_SITES_PREF, ""));
    configDirty = false;
  }
  return trustedSites;
}

function writeConfig(cfg: TrustedSitesConfig): void {
  trustedSites = cfg;
  configDirty = false;
  Services.prefs.setStringPref(TRUSTED_SITES_PREF, serializeTrustedSites(cfg));
  notifyUpdated();
  applyPermissionsForAll();
  syncWatchdog();
}

function notifyUpdated(): void {
  Services.obs.notifyObservers(
    { QueryInterface: ChromeUtils.generateQI([]) } as unknown as nsISupports,
    TRUSTED_SITES_UPDATED_TOPIC,
  );
}

/** Current allowlist (copy). */
export function getTrustedSites(): TrustedSitesConfig {
  return structuredClone(readConfig());
}

export function isValidPattern(input: string): boolean {
  return validPattern(input);
}

/** Add a pattern with default actions; returns the new entry or null. */
export function addTrustedSite(pattern: string): TrustedSiteEntry | null {
  const cfg = getTrustedSites();
  const normalized = normalizePattern(pattern);
  if (!normalized || !validPattern(normalized)) {
    return null;
  }
  if (cfg.some((e) => e.pattern === normalized)) {
    return null;
  }
  const entry: TrustedSiteEntry = {
    id: makeId(),
    pattern: normalized,
    actions: defaultActionsForAdd(),
  };
  cfg.push(entry);
  writeConfig(cfg);
  return structuredClone(entry);
}

function defaultActionsForAdd(): Record<TrustedAction, boolean> {
  return {
    fullscreen: true,
    "window-management": true,
    notifications: true,
    autoplay: false,
  };
}

export function removeTrustedSite(id: string): boolean {
  const cfg = getTrustedSites();
  const next = cfg.filter((e) => e.id !== id);
  if (next.length === cfg.length) return false;
  writeConfig(next);
  return true;
}

export function setTrustedSiteAction(
  id: string,
  action: TrustedAction,
  on: boolean,
): boolean {
  const cfg = getTrustedSites();
  const entry = cfg.find((e) => e.id === id);
  if (!entry) return false;
  entry.actions[action] = on;
  writeConfig(cfg);
  return true;
}

/** Grant Services.perms entries for an allowlisted pattern. */
function applyGrantsForEntry(entry: TrustedSiteEntry, allow: boolean): void {
  const { host } = splitHostPort(entry.pattern);
  let uri: nsIURI | null = null;
  try {
    uri = Services.io.newURI("https://" + host + "/");
  } catch {
    return;
  }
  const principal = Services.scriptSecurityManager.createContentPrincipal(uri, {});
  for (const type of TRUSTED_PERMISSION_TYPES) {
    if (!entry.actions[type]) continue;
    try {
      Services.perms.addFromPrincipal(
        principal,
        type,
        allow ? Services.perms.ALLOW_ACTION : Services.perms.DENY_ACTION,
      );
    } catch (e) {
      console.error("[TrustedSitesManager] grant failed", type, e);
    }
  }
}

function splitHostPort(pattern: string): { host: string; port: string | null } {
  const p = pattern.replace(/^\*\./, "");
  const m = /^(\[?[^:]+\]?)(?::(\d+))?$/.exec(p);
  return m ? { host: m[1]!, port: m[2] ?? null } : { host: p, port: null };
}

function applyPermissionsForAll(): void {
  const cfg = readConfig();
  for (const entry of cfg) applyGrantsForEntry(entry, true);
}

/**
 * Resolve the allowlist entry for a host (from the focused tab URL).
 */
export function activeMatchFor(info: HostInfo): TrustedMatch | null {
  const m = matchTrustedSite(readConfig(), info);
  return m ? { entry: m.entry, allowed: { ...m.allowed } } : null;
}

export function isActionActive(
  info: HostInfo,
  action: TrustedAction,
): boolean {
  return isTrustedActionGranted(readConfig(), info, action);
}

/**
 * Watchdog: hold the global fullscreen-gesture pref FALSE only while the
 * focused normal-mode window has an allowlisted fullscreen site active.
 * Private windows always keep the strict pref.
 */
export function syncWatchdog(): void {
  const cfg = readConfig();
  let wantLoose = false;
  try {
    const win = Services.focus.activeWindow as
      | (Window & { gBrowser?: { selectedBrowser?: { currentURI?: nsIURI } } })
      | null
      | undefined;
    if (win && win.gBrowser?.selectedBrowser?.currentURI) {
      const { PrivateBrowsingUtils } = ChromeUtils.importESModule(
        "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
      ) as { PrivateBrowsingUtils: { isWindowPrivate(w: unknown): boolean } };
      const isPrivate = PrivateBrowsingUtils.isWindowPrivate(win);
      if (!isPrivate) {
        const info = hostInfoFromUrl(win.gBrowser.selectedBrowser.currentURI.spec);
        wantLoose = isTrustedActionGranted(cfg, info, "fullscreen");
      }
    }
  } catch (e) {
    console.error("[TrustedSitesManager] watchdog focus lookup failed:", e);
  }
  if (wantLoose !== lastFullscreenPref) {
    lastFullscreenPref = wantLoose;
    Services.prefs.setBoolPref(FULLSCREEN_PREF, !wantLoose);
  }
}

// Held module ref: unreferenced nsITimers get GC'd and stop on this runtime.
const watchdogTimerBox: { current: { initWithCallback(fn: () => void, ms: number, type: number): void } | null } =
  { current: null };

export function initTrustedSitesManager(): void {
  if (initialized) return;
  try {
    configDirty = true;
    readConfig();
    applyPermissionsForAll();
    // keep grants + cache in sync with direct pref writes (settings page)
    Services.prefs.addObserver(TRUSTED_SITES_PREF, (): void => {
      configDirty = true;
      readConfig();
      applyPermissionsForAll();
      syncWatchdog();
      notifyUpdated();
    });
    try {
      const timer = Cc["@mozilla.org/timer;1"].createInstance(
        Ci.nsITimer,
      ) as { initWithCallback(fn: () => void, ms: number, type: number): void };
      watchdogTimerBox.current = timer; void watchdogTimerBox.current;
      timer.initWithCallback(
        (): void => syncWatchdog(),
        1000,
        (Ci.nsITimer.TYPE_REPEATING_SLACK as number) ?? 3,
      );
    } catch (e) {
      console.error("[TrustedSitesManager] watchdog timer failed:", e);
    }
    initialized = true;
  } catch (e) {
    console.error("[TrustedSitesManager] init failed:", e);
  }
}

export const TrustedSitesManager = {
  init: initTrustedSitesManager,
  getSites: getTrustedSites,
  addSite: addTrustedSite,
  removeSite: removeTrustedSite,
  setAction: setTrustedSiteAction,
  isValidPattern,
  match: activeMatchFor,
  isActionActive,
  syncWatchdog,
};

export type { TrustedSiteEntry } from "./TrustedSitesCore.ts";
export type { TrustedAction } from "./TrustedSitesCore.ts";
