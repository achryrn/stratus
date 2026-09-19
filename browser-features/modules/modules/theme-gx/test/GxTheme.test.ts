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
  MINIMAL_ACCENT,
  MINIMAL_LINE,
  MINIMAL_THEME,
  MINIMAL_TOKENS,
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
  assertEquals(normalizePreset("minimal"), "minimal", "minimal kept");
  assertEquals(normalizePreset("junk"), "minimal", "unknown falls back to minimal (default)");
  assertEquals(normalizePreset(null), "minimal", "null falls back to minimal (default)");
}

function testMinimalTokenShape(): void {
  const colors = MINIMAL_THEME.colors as Record<string, string>;
  assertEquals(MINIMAL_THEME.id, "stratus-minimal-dark", "minimal theme id stable");
  assertEquals(colors.tab_line, MINIMAL_ACCENT, "minimal tab line uses quiet accent");
  assertEquals(colors.tab_loading, MINIMAL_ACCENT, "minimal loading uses quiet accent");
  assert(!colors.toolbar_top_separator.includes("linear-gradient"), "minimal separators are FLAT (no gradient)");
  assertEquals(colors.toolbar_top_separator, MINIMAL_LINE, "minimal top separator is the flat 1px line token");
  assertEquals(MINIMAL_TOKENS["--stratus-accent"], MINIMAL_ACCENT, "minimal accent feeds the chrome contract");
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
    applyPreset("minimal");
    assertEquals(lwt.LightweightThemeManager.currentTheme?.id, "stratus-minimal-dark", "minimal theme applied live");
    applyPreset("classic");
    const id = lwt.LightweightThemeManager.currentTheme?.id;
    assert(id !== "stratus-gx-dark" && id !== "stratus-minimal-dark", "classic is neither gx nor minimal");
  } finally {
    Services.prefs.setStringPref(THEME_PRESET_PREF, old);
    applyPreset(old as "gx" | "classic" | "minimal");
  }
}

function testWindowAttribute(): void {
  applyPreset("minimal");
  const docEl = document.documentElement;
  assertEquals(docEl.getAttribute("gx-theme"), "minimal", "root carries gx-theme for CSS skinning");
  applyPreset("gx");
  assertEquals(docEl.getAttribute("gx-theme"), "gx", "flips to gx");
  applyPreset("minimal");
}

export function runAllTests(): void {
  initGxThemeManager();
  runTests("theme-gx.test", [
    { name: "design token shape", fn: testTokenShape },
    { name: "minimal design token shape", fn: testMinimalTokenShape },
    { name: "preset normalization", fn: testPresetNormalize },
    { name: "lwt theme switching", fn: testApplySwitchesLwtTheme },
    { name: "window attribute skin hook", fn: testWindowAttribute },
  ]);
}
