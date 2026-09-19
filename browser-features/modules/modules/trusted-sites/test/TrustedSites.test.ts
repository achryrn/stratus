// @colocated-env browser
import { assert, assertEquals, runTests } from "../../../../chrome/test/utils/test_harness.ts";
import {
  addTrustedSite,
  getTrustedSites,
  initTrustedSitesManager,
  isActionActive,
  isValidPattern,
  removeTrustedSite,
  setTrustedSiteAction,
  syncWatchdog,
} from "../TrustedSitesManager.sys.mts";
import {
  hostInfoFromUrl,
  matchTrustedSite,
  normalizePattern,
  parseTrustedSites,
  serializeTrustedSites,
} from "../TrustedSitesCore.ts";

function testPatternValidation(): void {
  assert(isValidPattern("example.com"), "bare host ok");
  assertEquals(normalizePattern("https://Example.COM/path"), "example.com", "normalize strips scheme+path");
  assertEquals(normalizePattern("*.example.com"), "*.example.com", "wildcard kept");
  assert(isValidPattern("*.example.com"), "wildcard ok");
  assert(isValidPattern("127.0.0.1:5999"), "host:port ok");
  assert(isValidPattern("localhost"), "localhost ok");
  assert(!isValidPattern(""), "empty rejected");
  assert(!isValidPattern("*bad"), "bare star rejected");
  assert(!isValidPattern("bad host"), "space rejected");
}

function testParseRoundTrip(): void {
  const cfg = [{ id: "a", pattern: "*.example.com", actions: { fullscreen: true, "window-management": false, notifications: true, autoplay: false } }];
  const back = parseTrustedSites(serializeTrustedSites(cfg));
  assertEquals(back.length, 1, "round trip length");
  assertEquals(back[0].pattern, "*.example.com", "pattern kept");
  assert(back[0].actions.fullscreen, "fullscreen kept");
  assert(!back[0].actions["window-management"], "wm kept false");
  assertEquals(parseTrustedSites("not json").length, 0, "garbage -> empty");
  assertEquals(parseTrustedSites(null).length, 0, "null -> empty");
  assertEquals(parseTrustedSites(JSON.stringify({ nope: 1 })).length, 0, "object -> empty");
}

function testMatching(): void {
  const cfg = [
    { id: "a", pattern: "*.example.com", actions: { fullscreen: true, "window-management": true, notifications: true, autoplay: false } },
    { id: "b", pattern: "127.0.0.1:5999", actions: { fullscreen: false, "window-management": true, notifications: false, autoplay: false } },
    { id: "c", pattern: "example.net", actions: { fullscreen: false, "window-management": false, notifications: true, autoplay: true } },
  ];
  const m1 = matchTrustedSite(cfg, hostInfoFromUrl("https://shop.example.com/x"));
  assert(m1 !== null, "wildcard subdomain matches");
  assert(m1?.allowed.fullscreen, "subdomain fullscreen granted");
  const m0 = matchTrustedSite(cfg, hostInfoFromUrl("https://example.org/"));
  assertEquals(m0, null, "outside list -> null");
  const mL = matchTrustedSite(cfg, hostInfoFromUrl("http://127.0.0.1:5999/"));
  assert(mL !== null, "host:port matches");
  assert(!mL?.allowed.fullscreen, "port entry fullscreen off");
  assert(mL?.allowed["window-management"], "port entry wm on");
  const mN = matchTrustedSite(cfg, hostInfoFromUrl("http://example.net/"));
  assert(mN !== null, "exact host matches");
  const mW = matchTrustedSite(cfg, hostInfoFromUrl("https://evil-example.com/"));
  assertEquals(mW, null, "hyphen prefix does not match wildcard");
  const mWild = matchTrustedSite(cfg, hostInfoFromUrl("https://a.b.example.com/"));
  assert(mWild !== null, "deep subdomain matches wildcard");
}

function testManagerAddRemoveToggle(): void {
  const before = getTrustedSites().length;
  const entry = addTrustedSite("https://trusted.local:8100/");
  assert(entry !== null, "add ok");
  assertEquals(normalizePattern(entry?.pattern ?? ""), "trusted.local:8100", "pattern normalized");
  assertEquals(addTrustedSite("trusted.local:8100"), null, "duplicate rejected");
  assertEquals(addTrustedSite(""), null, "empty rejected");
  assert(setTrustedSiteAction(entry!.id, "fullscreen", false), "toggle ok");
  const after = getTrustedSites();
  const mine = after.find((e) => e.id === entry!.id);
  assert(mine !== undefined, "entry persisted");
  assert(!mine!.actions.fullscreen, "fullscreen turned off");
  assert(removeTrustedSite(entry!.id), "remove ok");
  assertEquals(getTrustedSites().length, before, "back to original count");
  assert(!isActionActive(hostInfoFromUrl("http://trusted.local:8100/"), "fullscreen"), "removed -> inactive");
}

function testWatchdogPrefSync(): void {
  // Never leave the strict fullscreen pref false when nothing trusted is focused.
  const old = Services.prefs.getBoolPref("full-screen-api.allow-trusted-requests-only", true);
  try {
    addTrustedSite("localhost");
    // force a loose state, then sync with non-matching focus (empty URI)
    Services.prefs.setBoolPref("full-screen-api.allow-trusted-requests-only", false);
    syncWatchdog();
    const strict = Services.prefs.getBoolPref("full-screen-api.allow-trusted-requests-only");
    assert(strict === true, "watchdog restores strict pref when not trusted-focused");
  } finally {
    Services.prefs.setBoolPref("full-screen-api.allow-trusted-requests-only", old);
    Services.prefs.setStringPref("stratus.permissions.trustedSites", "[]");
  }
}

export function runAllTests(): void {
  initTrustedSitesManager();
  runTests("trusted-sites.test", [
    { name: "pattern validation + normalization", fn: testPatternValidation },
    { name: "config parse/serialize round trip", fn: testParseRoundTrip },
    { name: "host matching semantics", fn: testMatching },
    { name: "manager add/remove/toggle", fn: testManagerAddRemoveToggle },
    { name: "watchdog pref sync", fn: testWatchdogPrefSync },
  ]);
}
