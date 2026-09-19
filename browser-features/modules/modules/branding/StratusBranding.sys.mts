// SPDX-License-Identifier: MPL-2.0

// Stratus-branded prefs + legal URLs (M8.1b). Replaces Floorp placeholder
// surfaces (release-notes blog tab, third-party privacy tab) with our own.

// Legal pages are served by the local OS server (content principal; a
// chrome:// static HTML doc would trip the dev-runtime CSP assertion).
export const LEGAL_BASE_URL = "http://127.0.0.1:58261/legal/";
export const PRIVACY_POLICY_URL = `${LEGAL_BASE_URL}privacy-policy`;
export const RELEASE_NOTES_URL = `${LEGAL_BASE_URL}release-notes`;
export const BRAND_HOME_URL = "https://stratus-browser.org";
export const BRAND_DOCS_BASE_URL = "https://stratus-browser.org/docs/";
// Auto-update endpoint. The release pipeline (tools/release/make-update-manifest.ps1)
// publishes an updater-compatible update.xml here; swap the domain when a real
// update host is provisioned. The channel is mirrored in the manifest.
export const UPDATE_BASE_URL = "https://stratus-browser.org/updates/beta/";
export const UPDATE_CHANNEL = "beta";

const BRAND_PREFS: Record<string, string | boolean> = {
  // The runtime's welcome/override flow (startup.homepage_welcome_url =
  // "about:welcome | https://blog.floorp.app" + .additional =
  // "https://floorp.app/privacy") opens Floorp blog + privacy tabs on
  // first run / version changes. Suppress it: no placeholder tabs at boot.
  "startup.homepage_welcome_url": "about:blank",
  "startup.homepage_welcome_url.additional": "",
  "browser.startup.homepage_override.mstone": "ignore",
  "browser.aboutwelcome.enabled": false,
  // Branded internal surfaces.
  "app.releaseNotesURL": RELEASE_NOTES_URL,
  "app.releaseNotesURL.aboutDialog": RELEASE_NOTES_URL,
  "app.update.url.manual": BRAND_HOME_URL,
  "app.update.url.details": `${BRAND_DOCS_BASE_URL}release-notes`,
  // Auto-update wiring (M8.12 release pipeline): the updater polls this
  // manifest; make-update-manifest.ps1 publishes it at build time.
  "app.update.url": `${UPDATE_BASE_URL}update.xml`,
  "app.update.channel": UPDATE_CHANNEL,
  "app.update.enabled": true,
  "app.update.auto": true,
  "app.update.log": false,
  "app.feedback.baseURL": BRAND_DOCS_BASE_URL,
};

export function applyStratusBrandPrefs(): void {
  for (const [name, value] of Object.entries(BRAND_PREFS)) {
    try {
      const type = Services.prefs.getPrefType(name);
      if (typeof value === "string") {
        if (type !== 32 || Services.prefs.getStringPref(name) !== value) {
          Services.prefs.setStringPref(name, value);
        }
      } else if (typeof value === "boolean") {
        if (type !== 128 || Services.prefs.getBoolPref(name) !== value) {
          Services.prefs.setBoolPref(name, value);
        }
      }
    } catch (e) {
      console.error("[StratusBranding] Failed to apply pref", name, e);
    }
  }
  console.info("[StratusBranding] Brand prefs applied");
}
