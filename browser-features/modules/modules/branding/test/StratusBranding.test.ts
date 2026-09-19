// SPDX-License-Identifier: MPL-2.0
// @colocated-env browser

// M8.1b: Stratus-branded pref layer suppresses Floorp welcome/override tabs
// and points internal release-notes/update surfaces at our own legal pages.

import { applyStratusBrandPrefs } from "../StratusBranding.sys.mts";

import { assert, assertEquals, runTests } from "../../../../chrome/test/utils/test_harness.ts";

function expectString(name: string, value: string): void {
  try {
    assertEquals(Services.prefs.getStringPref(name), value, name);
  } catch (e) {
    throw new Error(`${name}: expected ${value} but got pref error: ${String(e)}`);
  }
}

function testBrandPrefsKillFloorpWelcomeTabs(): void {
  applyStratusBrandPrefs();
  expectString("startup.homepage_welcome_url", "about:blank");
  expectString("startup.homepage_welcome_url.additional", "");
  expectString("browser.startup.homepage_override.mstone", "ignore");
  assert(
    !Services.prefs.getBoolPref("browser.aboutwelcome.enabled", true),
    "about:welcome should be disabled",
  );
}

function testBrandPrefsPointAtOwnLegalPages(): void {
  applyStratusBrandPrefs();
  const rn = Services.prefs.getStringPref("app.releaseNotesURL", "");
  assert(
    rn.startsWith("http://127.0.0.1:58261/legal/"),
    `release notes should point at our local legal pages, got ${rn}`,
  );
  assertEquals(
    Services.prefs.getStringPref("app.releaseNotesURL.aboutDialog"),
    rn,
    "about dialog release notes match",
  );
  assert(
    Services.prefs.getStringPref("app.update.url.details", "").includes(
      "stratus-browser.org",
    ),
    "update details should reference the Stratus site",
  );
}

function testBrandPrefsWireAutoUpdate(): void {
  applyStratusBrandPrefs();
  assertEquals(
    Services.prefs.getStringPref("app.update.url", ""),
    "https://stratus-browser.org/updates/beta/update.xml",
    "auto-update polls the release manifest endpoint (app.update.url)",
  );
  assertEquals(Services.prefs.getStringPref("app.update.channel", ""), "beta", "update channel is beta");
  assert(Services.prefs.getBoolPref("app.update.enabled", false), "auto-update enabled by default");
  assert(Services.prefs.getBoolPref("app.update.auto", false), "auto-download enabled by default");
}

export function runAllTests(): void {
  runTests("stratus-branding.test", [
      {
        name: "brand prefs suppress Floorp welcome/override tabs",
        fn: testBrandPrefsKillFloorpWelcomeTabs,
      },
      {
        name: "brand prefs point at our own legal pages",
        fn: testBrandPrefsPointAtOwnLegalPages,
      },
      {
        name: "brand prefs wire the auto-update pipeline",
        fn: testBrandPrefsWireAutoUpdate,
      },
  ]);
}
