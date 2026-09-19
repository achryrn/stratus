/**
 * M8.5a PrivacyManager — tiers, per-mode DNS routing, tracker counting/removal.
 *
 * Empirical baseline (Gecko 153 dev runtime): ECH prefs already on
 * (network.dns.echconfig.enabled + network.dns.use_https_rr_as_altsvc = true);
 * DoH is off (network.trr.mode=0) so the ECH stack is dormant until a resolver
 * is enabled — the per-mode DNS below activates it. Total Cookie Protection is
 * the current cookie behavior (5). ETP strict components are split prefs.
 */
import {
  type DnsConfig,
  type PrivacyTier,
  type TrackerCategory,
  type TrackerState,
  DEFAULT_DNS_CONFIG,
  classifyMatchedList,
  dnsUriFor,
  emptyTrackerState,
  parseDnsConfig,
  recordTracker,
  serializeDnsConfig,
} from "./PrivacyCore.ts";

export const PRIVACY_TIER_PREF = "stratus.privacy.tier";
export const DNS_CONFIG_PREF = "stratus.dns.config";
export const TRACKERS_MIRROR_PREF = "stratus.privacy.trackers";
export const TRACKERS_CLEAR_PREF = "stratus.privacy.trackersClear";
export const PRIVACY_UPDATED_TOPIC = "stratus.privacy.updated";

let tier: PrivacyTier = "default";
let tierDirty = true;
let dnsConfig: DnsConfig = structuredClone(DEFAULT_DNS_CONFIG);
let dnsDirty = true;
let initialized = false;

// Tracker session counters (mirrored via tracers topic; cleared on demand).
let trackerState: TrackerState = emptyTrackerState();
let lastBroadcast = 0;

function readTier(): PrivacyTier {
  if (tierDirty) {
    tierDirty = false;
    const raw = Services.prefs.getStringPref(PRIVACY_TIER_PREF, "default");
    tier = raw === "strict" || raw === "maximum" ? raw : "default";
  }
  return tier;
}

function readDns(): DnsConfig {
  if (dnsDirty) {
    dnsDirty = false;
    dnsConfig = parseDnsConfig(Services.prefs.getStringPref(DNS_CONFIG_PREF, ""));
  }
  return dnsConfig;
}

function notifyUpdated(): void {
  Services.obs.notifyObservers(
    { QueryInterface: ChromeUtils.generateQI([]) } as unknown as nsISupports,
    PRIVACY_UPDATED_TOPIC,
  );
}

/**
 * Apply the tier pref group. Individual prefs are simply set; user custom
 * values for OTHER privacy prefs are untouched.
 */
export function applyTier(next: PrivacyTier): void {
  const t = next === "strict" || next === "maximum" ? next : "default";
  // Shared posture (default): ETP Strict + TCP + fingerprinting protection.
  Services.prefs.setBoolPref("privacy.trackingprotection.enabled", t === "default" || t === "strict" || t === "maximum");
  Services.prefs.setBoolPref("privacy.trackingprotection.pbmode.enabled", true);
  Services.prefs.setBoolPref("privacy.trackingprotection.fingerprinting.enabled", true);
  Services.prefs.setBoolPref("privacy.trackingprotection.cryptomining.enabled", true);
  Services.prefs.setBoolPref("privacy.trackingprotection.emailtracking.enabled", true);
  Services.prefs.setBoolPref("privacy.trackingprotection.socialtracking.enabled", true);
  Services.prefs.setBoolPref("privacy.fingerprintingProtection", true);
  // strict: keep RFP off but full FPP categories + timer precision (already on).
  const rfp = t === "maximum";
  Services.prefs.setBoolPref("privacy.resistFingerprinting", rfp);
  Services.prefs.setBoolPref("privacy.resistFingerprinting.reduceTimerPrecision.jitter", true);
  Services.prefs.setBoolPref("privacy.resistFingerprinting.autoDeclineNoUserInputCanvasPrompts", rfp);
  Services.prefs.setStringPref("privacy.fingerprintingProtection.overrides", rfp ? "" : "+canvas, -canvas");
  Services.prefs.setStringPref(PRIVACY_TIER_PREF, t);
  tier = t;
  tierDirty = false;
  notifyUpdated();
}

export function getPrivacyTier(): PrivacyTier {
  return readTier();
}

/**
 * Apply DNS prefs for one mode (called by the focus watchdog).
 */
export function applyDnsForMode(mode: "normal" | "private"): void {
  const cfg = readDns();
  const m = cfg[mode];
  if (m.mode <= 0) {
    Services.prefs.setIntPref("network.trr.mode", 0);
    return;
  }
  const fallback = Services.prefs.getStringPref("network.trr.default_provider_uri", "https://mozilla.cloudflare-dns.com/dns-query");
  const uri = dnsUriFor(m, fallback);
  if (!uri) {
    Services.prefs.setIntPref("network.trr.mode", 0);
    return;
  }
  if (m.provider === "custom") {
    Services.prefs.setStringPref("network.trr.custom_uri", uri);
  }
  Services.prefs.setStringPref("network.trr.uri", uri);
  Services.prefs.setIntPref("network.trr.mode", m.mode);
}

export function getDnsConfig(): DnsConfig {
  return structuredClone(readDns());
}

export function setDnsConfig(next: DnsConfig): void {
  dnsConfig = structuredClone(next);
  dnsDirty = false;
  Services.prefs.setStringPref(DNS_CONFIG_PREF, serializeDnsConfig(dnsConfig));
  applyDnsForMode("normal");
  applyDnsForMode("private");
  notifyUpdated();
}

// Tracker observer. nsIClassifiedChannel exposes matched lists on the channel;
// the same http-on-modify-request tap used by the traffic monitor.
function trackerObserver(): void {
  Services.obs.addObserver(
    (channel: unknown): void => {
      try {
        const q = channel as unknown as {
          QueryInterface(iid: unknown): unknown;
          matchedLists?: string[];
          URI?: { asciiHost?: string };
        };
        const classified = q.QueryInterface(Ci.nsIClassifiedChannel) as unknown as {
          matchedLists: string[];
        };
        const lists = classified.matchedLists;
        if (!lists || lists.length === 0) return;
        const host = (q.URI?.asciiHost ?? "unknown").replace(/^www\./, "");
        let st = trackerState;
        for (const list of lists) {
          const cat: TrackerCategory = classifyMatchedList(list);
          st = recordTracker(st, cat, host);
        }
        trackerState = st;
        const now = Date.now();
        if (now - lastBroadcast > 1000) {
          lastBroadcast = now;
          writeTrackerMirror();
          notifyUpdated();
        }
      } catch {
        /* channel shapes vary; skip unclassifiable channels */
      }
    },
    "http-on-modify-request",
  );
}

function writeTrackerMirror(): void {
  try {
    Services.prefs.setStringPref(TRACKERS_MIRROR_PREF, JSON.stringify(trackerState.counts));
  } catch {
    /* best effort */
  }
}

export function getTrackerState(): TrackerState {
  return {
    counts: { ...trackerState.counts },
    domains: { tracking: [...trackerState.domains.tracking], fingerprinting: [...trackerState.domains.fingerprinting], cryptomining: [...trackerState.domains.cryptomining], email: [...trackerState.domains.email], social: [...trackerState.domains.social] },
  };
}

const CLEAR_FLAGS = ((Number(Ci.nsIClearDataService.CLEAR_COOKIES) |
  Number(Ci.nsIClearDataService.CLEAR_DOM_STORAGES) |
  Number(Ci.nsIClearDataService.CLEAR_HSTS))) >>> 0;

function clearData(flags: number, principal: unknown | null): void {
  const cds = Cc["@mozilla.org/clear-data-service;1"].getService(Ci.nsIClearDataService) as unknown as {
    deleteData(flags: number, cb: { onDataDeleted(failed: number): void }): void;
    deleteDataFromPrincipal(p: unknown, userData: boolean, flags: number, cb: { onDataDeleted(failed: number): void }): void;
  };
  const cb = { onDataDeleted(): void { /* fire-and-forget */ } };
  if (principal) {
    cds.deleteDataFromPrincipal(principal, true, flags, cb);
  } else {
    cds.deleteData(flags, cb);
  }
}

export function removeTrackerData(host: string | null): string {
  try {
    let principal: unknown = null;
    if (host) {
      const uri = Services.io.newURI("https://" + host + "/");
      principal = Services.scriptSecurityManager.createContentPrincipal(uri, {});
    }
    clearData(CLEAR_FLAGS, principal);
    trackerState = emptyTrackerState();
    lastBroadcast = 0;
    notifyUpdated();
    return "ok";
  } catch (e) {
    return "err:" + String(e);
  }
}

// Focus watchdog for per-mode DNS (same pattern as the VPN router; the timer
// must be module-held or GC stops it on this runtime).
const dnsTimerBox: { current: { initWithCallback(fn: () => void, ms: number, type: number): void } | null } = { current: null };

export function syncDnsForFocusedWindow(): void {
  try {
    const { PrivateBrowsingUtils } = ChromeUtils.importESModule("resource://gre/modules/PrivateBrowsingUtils.sys.mjs") as { PrivateBrowsingUtils: { isWindowPrivate(w: unknown): boolean } };
    const win = Services.focus.activeWindow as
      | (Window & { gBrowser?: unknown })
      | null
      | undefined;
    if (!win) return;
    applyDnsForMode(PrivateBrowsingUtils.isWindowPrivate(win) ? "private" : "normal");
  } catch (e) {
    console.error("[PrivacyManager] dns focus sync failed:", e);
  }
}

export function initPrivacyManager(): void {
  if (initialized) return;
  try {
    tierDirty = true;
    dnsDirty = true;
    applyTier(readTier());
    readDns();
    trackerObserver();
    // pref observers: direct settings-page writes stay in sync — a tier value
    // change re-applies the whole tier pref group.
    Services.prefs.addObserver(PRIVACY_TIER_PREF, (): void => {
      tierDirty = true;
      applyTier(readTier());
      notifyUpdated();
    });
    Services.prefs.addObserver(DNS_CONFIG_PREF, (): void => {
      dnsDirty = true;
      readDns();
      syncDnsForFocusedWindow();
      notifyUpdated();
    });
    // settings-page "Remove all" trigger;
    Services.prefs.addObserver(TRACKERS_CLEAR_PREF, (): void => {
      void removeTrackerData(null);
    });
    try {
      const timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer) as { initWithCallback(fn: () => void, ms: number, type: number): void };
      dnsTimerBox.current = timer; void dnsTimerBox.current;
      timer.initWithCallback(
        (): void => syncDnsForFocusedWindow(),
        1500,
        (Ci.nsITimer.TYPE_REPEATING_SLACK as number) ?? 3,
      );
    } catch (e) {
      console.error("[PrivacyManager] dns timer failed:", e);
    }
    initialized = true;
  } catch (e) {
    console.error("[PrivacyManager] init failed:", e);
  }
}

export const PrivacyManager = {
  init: initPrivacyManager,
  applyTier,
  getTier: getPrivacyTier,
  getDns: getDnsConfig,
  setDns: setDnsConfig,
  applyDnsMode: applyDnsForMode,
  trackers: getTrackerState,
  removeTrackerData,
};

export type { PrivacyTier, DnsConfig } from "./PrivacyCore.ts";
