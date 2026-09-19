/**
 * M8.6 "GX" theme pack — Opera GX-inspired design tokens for Stratus.
 *
 * Applies a lightweight-theme (LWT) template through the mechanism the fork
 * already feeds chrome tokens from (--lwt-accent-color etc. consumed by the
 * lepton compat layer), so one preset re-skins the whole chrome: near-black
 * frame, neon red #FF1E00 tab line and icons, cyan #00C8FF tab loading,
 * magenta-purple gradient separators.
 *
 * Navigable via stratus.theme.preset ("gx" | "classic" | "minimal", minimal default).
 */

export type ThemePreset = "gx" | "classic" | "minimal";
export const THEME_PRESET_PREF = "stratus.theme.preset";
export const THEME_UPDATED_TOPIC = "stratus.theme.updated";

export const GX_NEON_RED = "#ff1e00";
export const GX_CYAN = "#00c8ff";
export const GX_PURPLE = "#b04cff";
export const GX_FRAME = "#120a0b";
export const GX_TOOLBAR = "#0d0708";
export const GX_TEXT = "#f2f0f5";

/**
 * Lightweight-theme object. Colors map to LWT CSS variables the existing
 * chrome already consumes; gradients are legal LWT color values.
 */
export const GX_THEME: Record<string, unknown> = {
  id: "stratus-gx-dark",
  name: "Stratus GX",
  colors: {
    frame: GX_FRAME,
    tab_background_text: GX_TEXT,
    toolbar: GX_TOOLBAR,
    toolbar_field: "#1c1114",
    toolbar_field_text: GX_TEXT,
    toolbar_field_border: "transparent",
    icons: GX_TEXT,
    tab_line: GX_NEON_RED,
    tab_loading: GX_CYAN,
    toolbar_top_separator: "linear-gradient(90deg, #ff1e00, #b04cff, #00c8ff)",
    toolbar_bottom_separator: "#ff1e00",
    tab_selected: GX_FRAME,
  },
};

export function normalizePreset(raw: unknown): ThemePreset {
  return raw === "gx" || raw === "classic" || raw === "minimal" ? raw : "minimal";
}

let pollTimer: nsITimer | null = null;

export function readPreset(): ThemePreset {
  return normalizePreset(Services.prefs.getStringPref(THEME_PRESET_PREF, "minimal"));
}

export function setThemePreset(preset: ThemePreset): void {
  Services.prefs.setStringPref(THEME_PRESET_PREF, normalizePreset(preset));
}

export function applyPreset(preset: ThemePreset): void {
  try {
    const lwt = ChromeUtils.importESModule(
      "resource://gre/modules/LightweightThemeManager.sys.mjs",
    ) as { LightweightThemeManager: { currentTheme: unknown } };
    if (preset === "gx") {
      lwt.LightweightThemeManager.currentTheme = GX_THEME;
    } else if (preset === "minimal") {
      lwt.LightweightThemeManager.currentTheme = MINIMAL_THEME;
    } else {
      try {
        lwt.LightweightThemeManager.currentTheme =
          (lwt.LightweightThemeManager as unknown as {
            getBuiltInTheme?(id: string): unknown;
          }).getBuiltInTheme?.("firefox-compact-dark") ?? null;
      } catch {
        lwt.LightweightThemeManager.currentTheme = null;
      }
    }
  } catch (e) {
    console.error("[GxThemeManager] apply failed:", e);
  }
  for (const win of Services.wm.getEnumerator("navigator:browser")) {
    try {
      paintWindow(win as unknown as nsIDOMWindow, preset);
    } catch {
      /* window raced away */
    }
  }
  Services.obs.notifyObservers(
    { QueryInterface: ChromeUtils.generateQI([]) } as unknown as nsISupports,
    THEME_UPDATED_TOPIC,
  );
}

/**
 * Chrome token surface the fork ACTUALLY consumes (the lepton compat layer
 * neutralizes LWT CSS vars on this build, so the palette is driven from these
 * custom properties + the gx-theme attribute instead).
 */
export const GX_TOKENS: Record<string, string> = {
  "--stratus-accent": GX_NEON_RED,
  "--tab-loading-fill": GX_CYAN,
  "--toolbar-bgcolor": GX_TOOLBAR,
  "--toolbar-color": GX_TEXT,
  "--toolbar-non-lwt-bgcolor": GX_TOOLBAR,
  "--toolbar-non-lwt-textcolor": GX_TEXT,
  "--lwt-accent-color": GX_NEON_RED,
  "--lwt-text-color": GX_TEXT,
};

export const MINIMAL_FRAME = "#151517";
export const MINIMAL_TOOLBAR = "#1b1b1e";
export const MINIMAL_TEXT = "#e8e8ea";
export const MINIMAL_ACCENT = "#8a94a6";
export const MINIMAL_LINE = "#2c2c31";

/**
 * Minimal preset — flat neutral dark chrome, 1px flat separators, no
 * gradients; a quiet steel accent. This is the DEFAULT theme.
 */
export const MINIMAL_THEME: Record<string, unknown> = {
  id: "stratus-minimal-dark",
  name: "Stratus Minimal",
  colors: {
    frame: MINIMAL_FRAME,
    tab_background_text: MINIMAL_TEXT,
    toolbar: MINIMAL_TOOLBAR,
    toolbar_field: "#232327",
    toolbar_field_text: MINIMAL_TEXT,
    toolbar_field_border: "transparent",
    icons: "#cfcfd4",
    tab_line: MINIMAL_ACCENT,
    tab_loading: MINIMAL_ACCENT,
    toolbar_top_separator: MINIMAL_LINE,
    toolbar_bottom_separator: MINIMAL_LINE,
    tab_selected: "#232327",
  },
};

export const MINIMAL_TOKENS: Record<string, string> = {
  "--stratus-accent": MINIMAL_ACCENT,
  "--tab-loading-fill": MINIMAL_ACCENT,
  "--toolbar-bgcolor": MINIMAL_TOOLBAR,
  "--toolbar-color": MINIMAL_TEXT,
  "--toolbar-non-lwt-bgcolor": MINIMAL_TOOLBAR,
  "--toolbar-non-lwt-textcolor": MINIMAL_TEXT,
  "--lwt-accent-color": MINIMAL_ACCENT,
  "--lwt-text-color": MINIMAL_TEXT,
};

export const CLASSIC_TOKENS: Record<string, string> = {
  "--stratus-accent": "#6c5ce7",
};

function paintWindow(win: nsIDOMWindow, preset: ThemePreset): void {
  const root = win.document?.documentElement;
  if (!root) return;
  root.setAttribute("gx-theme", preset);
  const tokens = preset === "gx" ? GX_TOKENS : preset === "minimal" ? MINIMAL_TOKENS : CLASSIC_TOKENS;
  for (const name of Object.keys(GX_TOKENS)) {
    root.style.setProperty(name, tokens[name] ?? "");
  }
}


export function initGxThemeManager(): void {
  try {
    applyPreset(readPreset());
    // First paint is deferred: at startup the first browser window may not
    // exist yet (and may miss toplevel-window-ready), so re-paint shortly
    // after startup and whenever a new window appears.
    const wake = (): void => {
      for (const win of Services.wm.getEnumerator("navigator:browser")) {
        try {
          paintWindow(win as unknown as nsIDOMWindow, readPreset());
        } catch {
          /* racing */
        }
      }
    };
    wake();
    pollTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    void pollTimer;
    pollTimer.init(
      { observe: (): void => wake() } as unknown as nsIObserver,
      500,
      Ci.nsITimer.TYPE_REPEATING_SLACK as number ?? 3,
    );
    // Windows created later (private windows, popups) must inherit the skin.
    Services.obs.addObserver(
      (win: unknown): void => {
        try {
          const w = win as nsIDOMWindow;
          if (w?.document?.documentElement) {
            paintWindow(w, readPreset());
          }
        } catch {
          /* not a browser window yet */
        }
      },
      "toplevel-window-ready",
    );
    Services.prefs.addObserver(THEME_PRESET_PREF, (): void => {
      applyPreset(readPreset());
    });
  } catch (e) {
    console.error("[GxThemeManager] init failed:", e);
  }
}


export const GxThemeManager = {
  init: initGxThemeManager,
  apply: applyPreset,
  preset: readPreset,
};