// @colocated-env browser
import { assert, assertEquals, runTests } from "../../../../chrome/test/utils/test_harness.ts";
import {
  applyPreset,
  GX_CYAN,
  GX_FRAME,
  GX_NEON_RED,
  GX_PURPLE,
  GX_THEME,
  initGxThemeManager,
  normalizePreset,
  THEME_PRESET_PREF,
} from "../GxThemeManager.sys.mts";

function testTokenShape(): void {
  assertEquals(GX_NEON_RED, "#ff1e00", "neon red is Opera GX red");
  assertEquals(GX_CYAN, "#00c8ff", "cyan is the GX secondary");
  assertEquals(GX_FRAME, "#120a0b", "near-black warm frame");
  assertEquals(GX_THEME.id, "stratus-gx-dark", "theme id stable");
  const colors = GX_THEME.colors as Record<string, string>;
  assertEquals(colors.tab_line, "#ff1e00", "tab line neon");
  assertEquals(colors.tab_loading, "#00c8ff", "loading cyan");
  assert((colors.toolbar_top_separator as string).includes("linear-gradient"), "magenta-purple gradient");
  assert((colors.toolbar_top_separator as string).includes(GX_PURPLE), "gradient contains purple");
}

function testPresetNormalize(): void {
  assertEquals(normalizePreset("gx"), "gx", "gx kept");
  assertEquals(normalizePreset("classic"), "classic", "classic kept");
  assertEquals(normalizePreset("junk"), "gx", "unknown falls back to gx");
  assertEquals(normalizePreset(null), "gx", "null falls back to gx");
}

function testApplySwitchesLwtTheme(): void {
  const old = Services.prefs.getStringPref(THEME_PRESET_PREF, "gx");
  try {
    Services.prefs.setStringPref(THEME_PRESET_PREF, "gx");
    initGxThemeManager();
    applyPreset("gx");
    const lwt = ChromeUtils.importESModule(
      "resource://gre/modules/LightweightThemeManager.sys.mjs",
    ) as { LightweightThemeManager: { currentTheme: { id?: string; colors?: Record<string, unknown> } } };
    assertEquals(lwt.LightweightThemeManager.currentTheme?.id, "stratus-gx-dark", "gx theme applied live");
    applyPreset("classic");
    const id = lwt.LightweightThemeManager.currentTheme?.id;
    assert(id !== "stratus-gx-dark", "classic no longer gx");
  } finally {
    Services.prefs.setStringPref(THEME_PRESET_PREF, old);
    applyPreset(old as "gx" | "classic");
  }
}

function testWindowAttribute(): void {
  applyPreset("gx");
  const docEl = document.documentElement;
  assertEquals(docEl.getAttribute("gx-theme"), "gx", "root carries gx-theme for CSS skinning");
  applyPreset("classic");
  assertEquals(docEl.getAttribute("gx-theme"), "classic", "flips to classic");
  applyPreset("gx");
}

export function runAllTests(): void {
  initGxThemeManager();
  runTests("theme-gx.test", [
    { name: "design token shape", fn: testTokenShape },
    { name: "preset normalization", fn: testPresetNormalize },
    { name: "lwt theme switching", fn: testApplySwitchesLwtTheme },
    { name: "window attribute skin hook", fn: testWindowAttribute },
  ]);
}
