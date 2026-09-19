// @colocated-env browser
import { assert, assertEquals, runTests } from "../../../../chrome/test/utils/test_harness.ts";
import {
  classifyMatchedList,
  dnsConfigFor,
  dnsUriFor,
  emptyTrackerState,
  mergeTracker,
  parseDnsConfig,
  recordTracker,
  serializeDnsConfig,
  type DnsConfig,
} from "../PrivacyCore.ts";
import {
  applyDnsForMode,
  applyTier,
  getPrivacyTier,
  initPrivacyManager,
  PRIVACY_TIER_PREF,
  setDnsConfig,
} from "../PrivacyManager.sys.mts";

function testDnsMapping(): void {
  const off = dnsConfigFor("off", "fallback", "");
  assertEquals(off.mode, 0, "off -> mode 0");
  const mozFallback = dnsConfigFor("mozilla", "fallback", "");
  assertEquals(mozFallback.mode, 2, "mozilla fallback -> 2");
  const cfStrict = dnsConfigFor("cloudflare", "strict", "");
  assertEquals(cfStrict.mode, 3, "cloudflare strict -> 3");
  const custom = dnsConfigFor("custom", "strict", "  https://dns.example.com/dns-query " );
  assertEquals(custom.customUri, "https://dns.example.com/dns-query", "custom uri trimmed");
  assertEquals(dnsUriFor(off, "x"), null, "off -> no uri");
  assertEquals(dnsUriFor(custom, "x"), "https://dns.example.com/dns-query", "custom uri used");
  assertEquals(dnsUriFor(mozFallback, "fallback-uri"), "fallback-uri", "provider uses fallback");
}

function testDnsRoundTrip(): void {
  const cfg: DnsConfig = {
    normal: { provider: "mozilla", mode: 2, customUri: "" },
    private: { provider: "custom", mode: 3, customUri: "https://d.example/q" },
  };
  const back = parseDnsConfig(serializeDnsConfig(cfg));
  assertEquals(back.normal.provider, "mozilla", "normal provider");
  assertEquals(back.normal.mode, 2, "normal mode");
  assertEquals(back.private.customUri, "https://d.example/q", "private custom uri");
  assertEquals(parseDnsConfig("junk").normal.mode, 0, "junk -> default");
  assertEquals(parseDnsConfig(null).private.provider, "off", "null -> default");
}

function testTrackerAccounting(): void {
  assertEquals(classifyMatchedList("-ads-trackers"), "tracking", "ads -> tracking");
  assertEquals(classifyMatchedList("-fingerprinting"), "fingerprinting", "fp list");
  assertEquals(classifyMatchedList("-cryptomining"), "cryptomining", "crypto list");
  assertEquals(classifyMatchedList("-emailtracking"), "email", "email list");
  assertEquals(classifyMatchedList("-socialtracking"), "social", "social list");
  let st = emptyTrackerState();
  st = recordTracker(st, "tracking", "doubleclick.net");
  st = recordTracker(st, "tracking", "doubleclick.net");
  st = recordTracker(st, "fingerprinting", "fingerprintjs.example");
  assertEquals(st.counts.tracking, 2, "tracking counted twice");
  assertEquals(st.counts.fingerprinting, 1, "fp counted once");
  assertEquals(st.domains.tracking.length, 1, "domain deduped");
  const merged = mergeTracker(st, recordTracker(emptyTrackerState(), "social", "x.example"));
  assertEquals(merged.counts.social, 1, "merge adds category");
  assertEquals(merged.counts.tracking, 2, "merge keeps existing");
}

function testTierApplication(): void {
  const old = Services.prefs.getStringPref(PRIVACY_TIER_PREF, "default");
  const oldFpp = Services.prefs.getBoolPref("privacy.fingerprintingProtection", false);
  const oldRfp = Services.prefs.getBoolPref("privacy.resistFingerprinting", false);
  const oldTp = Services.prefs.getBoolPref("privacy.trackingprotection.enabled", false);
  try {
    applyTier("maximum");
    assertEquals(getPrivacyTier(), "maximum", "tier read back");
    assert(Services.prefs.getBoolPref("privacy.resistFingerprinting"), "rfp on at maximum");
    assert(Services.prefs.getBoolPref("privacy.trackingprotection.enabled"), "etp strict on");
    assert(Services.prefs.getBoolPref("privacy.fingerprintingProtection"), "fpp on");
    applyTier("default");
    assert(!Services.prefs.getBoolPref("privacy.resistFingerprinting"), "rfp off at default");
  } finally {
    applyTier(old === "strict" || old === "maximum" ? old : "default");
    Services.prefs.setBoolPref("privacy.fingerprintingProtection", oldFpp);
    Services.prefs.setBoolPref("privacy.resistFingerprinting", oldRfp);
    Services.prefs.setBoolPref("privacy.trackingprotection.enabled", oldTp);
  }
}

function testDnsPrefApply(): void {
  const oldMode = Services.prefs.getIntPref("network.trr.mode", 0);
  const oldUri = Services.prefs.getStringPref("network.trr.uri", "");
  try {
    setDnsConfig({
      normal: { provider: "mozilla", mode: 2, customUri: "" },
      private: { provider: "off", mode: 0, customUri: "" },
    });
    applyDnsForMode("normal");
    assertEquals(Services.prefs.getIntPref("network.trr.mode"), 2, "trr mode applied");
    assert(Services.prefs.getStringPref("network.trr.uri", "").includes("dns-query"), "trr uri applied");
    applyDnsForMode("private");
    assertEquals(Services.prefs.getIntPref("network.trr.mode"), 0, "private off -> mode 0");
  } finally {
    Services.prefs.setIntPref("network.trr.mode", oldMode);
    Services.prefs.setStringPref("network.trr.uri", oldUri);
  }
}

export function runAllTests(): void {
  initPrivacyManager();
  runTests("privacy.test", [
    { name: "dns provider mapping", fn: testDnsMapping },
    { name: "dns config round trip", fn: testDnsRoundTrip },
    { name: "tracker accounting", fn: testTrackerAccounting },
    { name: "tier application", fn: testTierApplication },
    { name: "dns pref apply", fn: testDnsPrefApply },
  ]);
}
