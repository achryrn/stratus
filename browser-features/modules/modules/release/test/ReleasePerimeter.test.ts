// @colocated-env browser
// M8.7 release-perimeter gate: privacy defaults + fresh-profile defaults (Gate 9).
import { assertEquals, assert, runTests } from "../../../../chrome/test/utils/test_harness.ts";
import { isAdBlockEnabled } from "../../adblock/AdBlockManager.sys.mts";
import { readPreset } from "../../theme-gx/GxThemeManager.sys.mts";
import { getDnsConfig } from "../../privacy/PrivacyManager.sys.mts";
import { getVpnConfig } from "../../vpn/VpnManager.sys.mts";

const SAVE: Array<[string, string]> = [];
function saveStrPref(name: string): void {
  try { SAVE.push([name, Services.prefs.getStringPref(name)]); } catch { SAVE.push([name, "__unset__"]); }
}
function restorePrefs(): void {
  for (const [name, val] of SAVE) {
    if (val === "__unset__") { try { Services.prefs.clearUserPref(name); } catch { /* already clear */ } }
    else { Services.prefs.setStringPref(name, val); }
  }
  SAVE.length = 0;
}

function testTelemetryOff(): void {
  assert(!Services.prefs.getBoolPref("datareporting.policy.dataSubmissionEnabled", true), "data submission off");
  assert(!Services.prefs.getBoolPref("toolkit.telemetry.enabled", true), "telemetry off");
  assertEquals(Services.prefs.getIntPref("datareporting.policy.dataSubmissionPolicyAcceptedVersion", 0), 0, "no accepted-data policy");
}

function testVpnDisabledByDefault(): void {
  saveStrPref("stratus.vpn.config");
  try {
    try { Services.prefs.clearUserPref("stratus.vpn.config"); } catch { /* already clear */ }
    const cfg = getVpnConfig();
    assertEquals(cfg.enabled.normal, false, "vpn off for normal windows on fresh profile");
    assertEquals(cfg.enabled.private, false, "vpn off for private windows");
  } finally { restorePrefs(); }
}

function testTrustedSitesEmptyByDefault(): void {
  saveStrPref("stratus.permissions.trustedSites");
  try {
    try { Services.prefs.clearUserPref("stratus.permissions.trustedSites"); } catch { /* already clear */ }
    const raw = Services.prefs.getStringPref("stratus.permissions.trustedSites", "[]");
    assertEquals(JSON.parse(raw).length, 0, "site-actions allowlist empty by default");
  } finally { restorePrefs(); }
}

function testFeatureDefaults(): void {
  saveStrPref("stratus.adblock.enabled");
  saveStrPref("stratus.theme.preset");
  saveStrPref("stratus.dns.config");
  try {
    try { Services.prefs.clearUserPref("stratus.adblock.enabled"); } catch { /* already clear */ }
    assert(isAdBlockEnabled(), "ad blocker default ON");
    try { Services.prefs.clearUserPref("stratus.theme.preset"); } catch { /* already clear */ }
    assertEquals(readPreset(), "gx", "gx theme default");
    try { Services.prefs.clearUserPref("stratus.dns.config"); } catch { /* already clear */ }
    assertEquals(getDnsConfig().normal.mode, 0, "DoH off by default (normal)");
    assertEquals(getDnsConfig().private.mode, 0, "DoH off by default (private)");
  } finally { restorePrefs(); }
}

function testFullscreenPrefSecure(): void {
  assert(Services.prefs.getBoolPref("full-screen-api.allow-trusted-requests-only", true), "no-gesture fullscreen requires trusted site watchdog");
}

export function runAllTests(): void {
  runTests("release.test", [
    { name: "telemetry + data policy off", fn: testTelemetryOff },
    { name: "vpn disabled on fresh profile", fn: testVpnDisabledByDefault },
    { name: "trusted sites allowlist empty", fn: testTrustedSitesEmptyByDefault },
    { name: "feature defaults (adblock/gx/dns)", fn: testFeatureDefaults },
    { name: "fullscreen pref secure", fn: testFullscreenPrefSecure },
  ]);
}
