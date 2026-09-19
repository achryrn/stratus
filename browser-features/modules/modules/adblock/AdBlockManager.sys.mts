/**
 * M8.5b AdBlockManager — stub-based network layer blocking.
 *
 * http-on-modify-request observer redirects matched SUBRESOURCE requests to a
 * 1x1 GIF data: URI so the page sees a successful load — anti-adblock probes
 * cannot distinguish "stubbed" from "empty response". Top-level navigations
 * are never touched (matches AdBlockCore / user intent).
 */
import { BUILTIN_AD_LIST, buildRules, matchesAdUrl, STUB_GIF, type AdBlockRule } from "./AdBlockCore.ts";

export const ADBLOCK_ENABLED_PREF = "stratus.adblock.enabled";
export const ADBLOCK_CLEAR_PREF = "stratus.adblock.clear";
export const ADBLOCK_COUNT_PREF = "stratus.adblock.count";
export const ADBLOCK_UPDATED_TOPIC = "stratus.adblock.updated";

let rules: AdBlockRule[] = buildRules(BUILTIN_AD_LIST);
let enabled = true;
let initialized = false;
let lastBroadcast = 0;

function notifyUpdated(): void {
  Services.obs.notifyObservers(
    { QueryInterface: ChromeUtils.generateQI([]) } as unknown as nsISupports,
    ADBLOCK_UPDATED_TOPIC,
  );
}

export function isAdBlockEnabled(): boolean {
  try {
    enabled = Services.prefs.getBoolPref(ADBLOCK_ENABLED_PREF, false);
  } catch {
    enabled = false;
  }
  return enabled;
}

export function setAdBlockEnabled(on: boolean): void {
  enabled = on;
  Services.prefs.setBoolPref(ADBLOCK_ENABLED_PREF, on);
  notifyUpdated();
}

export function getAdBlockCount(): number {
  return Services.prefs.getIntPref(ADBLOCK_COUNT_PREF, 0);
}

export function clearAdBlockCount(): void {
  Services.prefs.setIntPref(ADBLOCK_COUNT_PREF, 0);
  notifyUpdated();
}

export function matchesAnyRule(rawUrl: string): boolean {
  return matchesAdUrl(rules, rawUrl);
}

/**
 * Dev/test only: extend the rule set (e.g. local fixture hosts). Never used by
 * the shipped list itself.
 */
export function setDevRules(extra: string[]): void {
  rules = buildRules([...BUILTIN_AD_LIST, ...extra]);
}

const TYPE_DOCUMENT = 6; // nsIContentPolicy TYPE_DOCUMENT

export function onModifyRequest(channel: unknown): void {
  if (!enabled) return;
  try {
    const http = channel as unknown as {
      QueryInterface(iid: unknown): unknown;
      URI: nsIURI;
      redirectTo?(uri: nsIURI): void;
      loadInfo?: { externalContentPolicyType?: number } | null;
    };
    const ch = http.QueryInterface(Ci.nsIHttpChannel) as unknown as nsIHttpChannel;
    if (!ch) return;
    // Parent-side loadInfo on this runtime reports isTopLevelLoad=true for every
    // channel, so gate on the policy type instead: only skip real document
    // navigations (TYPE_DOCUMENT); subresources (image/script/xhr/media/...) and
    // nested documents are fair game.
    const ext = Number(http.loadInfo?.externalContentPolicyType);
    if (ext === TYPE_DOCUMENT) return;
    const spec = ch.URI.spec;
    if (!matchesAdUrl(rules, spec)) return;
    const stubUri = Services.io.newURI(STUB_GIF);
    ch.redirectTo(stubUri);
    Services.prefs.setIntPref(ADBLOCK_COUNT_PREF, getAdBlockCount() + 1);
    const now = Date.now();
    if (now - lastBroadcast > 1000) {
      lastBroadcast = now;
      notifyUpdated();
    }
  } catch {
    /* skip unredirectable channels */
  }
}

export function initAdBlockManager(): void {
  if (initialized) return;
  try {
    if (!Services.prefs.prefHasUserValue(ADBLOCK_ENABLED_PREF)) {
      Services.prefs.setBoolPref(ADBLOCK_ENABLED_PREF, true);
    }
    isAdBlockEnabled();
    Services.obs.addObserver(
      (chan: unknown): void => onModifyRequest(chan),
      "http-on-modify-request",
    );
    Services.prefs.addObserver(ADBLOCK_ENABLED_PREF, (): void => {
      isAdBlockEnabled();
      notifyUpdated();
    });
    Services.prefs.addObserver(ADBLOCK_CLEAR_PREF, (): void => {
      clearAdBlockCount();
    });
    initialized = true;
  } catch (e) {
    console.error("[AdBlockManager] init failed:", e);
  }
}

export const AdBlockManager = {
  init: initAdBlockManager,
  isEnabled: isAdBlockEnabled,
  setEnabled: setAdBlockEnabled,
  count: getAdBlockCount,
  clearCount: clearAdBlockCount,
  matches: matchesAnyRule,
  setDevRules,
};
