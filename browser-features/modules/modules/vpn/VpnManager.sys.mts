// SPDX-License-Identifier: MPL-2.0

/**
 * M8.3: built-in VPN manager — strictly per-mode proxy routing.
 *
 * Mechanism research on this Gecko revision (ESR 153 overlay):
 *  - nsIProtocolProxyService.registerFilter / registerChannelFilter: JS
 *    filters are ACCEPTED but NEVER consulted. Dead end.
 *  - WebExtension browser.proxy.onRequest: listeners never fire. Dead end.
 *  - Assigning channel.proxyInfo from http-on-modify-request: ignored;
 *    the connection layer re-resolves. Dead end.
 *  - network.proxy.* prefs: the ONLY routing that actually works live.
 *
 * Therefore the manager routes globally, per the mode of the ACTIVE
 * browser window, re-applied on: config change, window activation, any
 * window open, and a 1.5 s poll (belt-and-suspenders focus tracking).
 * While a private window is active its toggle rules; when you switch to a
 * normal window the normal-mode toggle rules — so "VPN on in private
 * mode" never applies to normal browsing and vice versa. Background-
 * window traffic follows the mode currently applied (v1 limitation,
 * documented in the settings page).
 *
 * Bypass targets (loopback, intranet, .local, update endpoints, local
 * dev servers) are in network.proxy.no_proxies_on and always direct.
 */

import {
  buildNoProxyList,
  cloneConfig,
  DEFAULT_VPN_CONFIG,
  isModeProxyEnabled,
  type VpnConfig,
  type VpnMode,
  type VpnProxyConfig,
} from "./VpnCore.ts";

export type { VpnConfig, VpnMode, VpnProxyConfig } from "./VpnCore.ts";

export const VPN_CONFIG_PREF = "stratus.vpn.config";
export const VPN_ACTIVE_MODE_PREF = "stratus.vpn.activeMode";
export const VPN_UPDATED_TOPIC = "stratus.vpn.updated";

function safeParse(raw: string): VpnConfig | null {
  try {
    const data = JSON.parse(raw) as {
      enabled?: { normal?: boolean; private?: boolean };
      proxy?: { host?: string; port?: number; type?: string };
      location?: string;
    };
    if (!data || typeof data !== "object") {
      return null;
    }
    return {
      enabled: {
        normal: data.enabled?.normal === true,
        private: data.enabled?.private === true,
      },
      proxy: {
        host: typeof data.proxy?.host === "string" ? data.proxy.host : "",
        port: Number.isFinite(data.proxy?.port)
          ? (data.proxy?.port as number)
          : 0,
        type: data.proxy?.type === "socks" ? ("socks" as const) : ("http" as const),
      },
      location: typeof data.location === "string" ? data.location : "auto",
    };
  } catch {
    return null;
  }
}

let cachedConfig: VpnConfig = cloneConfig(DEFAULT_VPN_CONFIG);
let configDirty = false;

function readConfig(): VpnConfig {
  if (configDirty) {
    try {
      const raw = Services.prefs.getStringPref(VPN_CONFIG_PREF, "");
      cachedConfig = safeParse(raw) ?? cloneConfig(DEFAULT_VPN_CONFIG);
    } catch (e) {
      console.error("[VpnManager] readConfig failed:", e);
      cachedConfig = cloneConfig(DEFAULT_VPN_CONFIG);
    }
    configDirty = false;
  }
  return cachedConfig;
}

function notifyUpdated(): void {
  try {
    Services.obs.notifyObservers(
      { QueryInterface: ChromeUtils.generateQI([]) } as unknown as nsISupports,
      VPN_UPDATED_TOPIC,
    );
  } catch (e) {
    console.error("[VpnManager] notifyUpdated failed:", e);
  }
}

function writeConfig(cfg: VpnConfig): void {
  cachedConfig = cfg;
  Services.prefs.setStringPref(VPN_CONFIG_PREF, JSON.stringify(cfg));
  applyToFocusedWindow();
  notifyUpdated();
}

export function getVpnConfig(): VpnConfig {
  return readConfig();
}

export function setVpnModeEnabled(mode: VpnMode, on: boolean): VpnConfig {
  const cfg = readConfig();
  cfg.enabled[mode] = on;
  writeConfig(cfg);
  return cloneConfig(readConfig());
}

export function setVpnProxy(proxy: VpnProxyConfig): VpnConfig {
  const cfg = readConfig();
  cfg.proxy = { host: proxy.host, port: proxy.port, type: proxy.type };
  writeConfig(cfg);
  return cloneConfig(readConfig());
}

export function setVpnLocation(location: string): VpnConfig {
  const cfg = readConfig();
  cfg.location = location || "auto";
  writeConfig(cfg);
  return cloneConfig(readConfig());
}

export function setActiveVpnMode(mode: VpnMode | ""): void {
  Services.prefs.setStringPref(VPN_ACTIVE_MODE_PREF, mode);
}

export function getActiveVpnMode(): VpnMode | "" {
  try {
    const mode = Services.prefs.getStringPref(VPN_ACTIVE_MODE_PREF, "");
    return mode === "normal" || mode === "private" ? mode : "";
  } catch {
    return "";
  }
}

function modeOfWindow(win: unknown): VpnMode | null {
  try {
    if (!win) {
      return null;
    }
    // PrivateBrowsingUtils is the reliable private-window detector on
    // this build — reading gBrowser.browsingContext.originAttributes
    // throws for private windows on some revisions.
    const { PrivateBrowsingUtils } = ChromeUtils.importESModule(
      "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
    ) as { PrivateBrowsingUtils: { isWindowPrivate(win: unknown): boolean } };
    return PrivateBrowsingUtils.isWindowPrivate(win) ? "private" : "normal";
  } catch (e) {
    console.error("[VpnManager] window mode detection failed:", e);
    return null;
  }
}

function focusedWindowMode(): VpnMode | null {
  try {
    const win = Services.focus.activeWindow;
    return modeOfWindow(win);
  } catch (e) {
    console.error("[VpnManager] focus lookup failed:", e);
    return null;
  }
}


/** Apply network.proxy.* prefs for the given mode. */
export function applyRoutingForMode(mode: VpnMode): void {
  const cfg = readConfig();
  const on = isModeProxyEnabled(cfg, mode);
  if (on) {
    Services.prefs.setIntPref("network.proxy.type", 1);
    Services.prefs.setStringPref("network.proxy.http", cfg.proxy.host);
    Services.prefs.setIntPref("network.proxy.http_port", cfg.proxy.port);
    Services.prefs.setStringPref("network.proxy.ssl", cfg.proxy.host);
    Services.prefs.setIntPref("network.proxy.ssl_port", cfg.proxy.port);
    const isSocks = cfg.proxy.type === "socks";
    Services.prefs.setStringPref("network.proxy.socks", cfg.proxy.host);
    Services.prefs.setIntPref("network.proxy.socks_port", cfg.proxy.port);
    Services.prefs.setIntPref("network.proxy.socks_version", isSocks ? 5 : 0);
    Services.prefs.setStringPref("network.proxy.no_proxies_on", buildNoProxyList());
  } else {
    Services.prefs.setIntPref("network.proxy.type", 0);
  }
  setActiveVpnMode(on ? mode : "");
}

function applyToFocusedWindow(): void {
  const mode = focusedWindowMode();
  if (mode) {
    applyRoutingForMode(mode);
  }
}

function onWindowOpened(): void {
  applyToFocusedWindow();
}

function onWindowActivated(subject: unknown): void {
  const mode = modeOfWindow(subject);
  if (mode) {
    applyRoutingForMode(mode);
  }
}

let initialized = false;
// Holding the repeating timer is REQUIRED on this build: an unreferenced
// nsITimer is garbage-collected and silently stops firing.
const pollTimerBox: { current: { initWithCallback(fn: () => void, ms: number, type: number): void } | null } = { current: null };

/** Install the VPN router (idempotent). */
export function initVpnManager(): void {
  if (initialized) {
    return;
  }
  try {
    configDirty = true;
    readConfig();
    // The settings page writes stratus.vpn.config directly; keep the
    // cache and routing in sync with every change.
    Services.prefs.addObserver(VPN_CONFIG_PREF, (): void => {
      configDirty = true;
      readConfig();
      applyToFocusedWindow();
      notifyUpdated();
    });
    Services.obs.addObserver(
      (): void => onWindowOpened(),
      "domwindowopened",
    );
    Services.obs.addObserver(
      (subject: unknown): void => onWindowActivated(subject),
      "Browser:WindowActivated",
    );
    // Focus tracking fallback: some window switches on this build never
    // emit activation observers, so poll the focused window (1.5 s).
    try {
      const timer = Cc["@mozilla.org/timer;1"].createInstance(
        Ci.nsITimer,
      ) as { initWithCallback(fn: () => void, ms: number, type: number): void };
      pollTimerBox.current = timer; void pollTimerBox.current;
      timer.initWithCallback(
        (): void => applyToFocusedWindow(),
        1500,
        (Ci.nsITimer.TYPE_REPEATING_SLACK as number) ?? 3,
      );
    } catch (e) {
      console.error("[VpnManager] focus poll timer failed:", e);
    }
    applyToFocusedWindow();
    initialized = true;
  } catch (e) {
    console.error("[VpnManager] failed to install router:", e);
  }
}

export const VpnManager = {
  init: initVpnManager,
  getConfig: getVpnConfig,
  setModeEnabled: setVpnModeEnabled,
  setProxy: setVpnProxy,
  setLocation: setVpnLocation,
  setActiveMode: setActiveVpnMode,
  getActiveMode: getActiveVpnMode,
  applyRouting: applyRoutingForMode,
};
