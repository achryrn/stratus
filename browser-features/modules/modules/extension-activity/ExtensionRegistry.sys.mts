// SPDX-License-Identifier: MPL-2.0

/**
 * M8.2: live extension registry for the transparent extension activity UI.
 *
 * Tracks installed add-ons (id, name, version, icon, enabled state) via
 * AddonManager so the extension-activity panel can pair traffic from the
 * NetworkMonitor (keyed by extension id) with something a user recognizes.
 * Broadcasts `stratus.extensions.updated` when the add-on set changes.
 */

export const EXTENSIONS_UPDATED_TOPIC = "stratus.extensions.updated";

export interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  iconUrl: string | null;
}

interface GeckoAddon {
  id: string;
  name: string;
  version: string;
  isActive?: boolean;
  isEnabled?: boolean;
  type?: string;
  getIconURL?(size?: number): string | null;
  uninstall?(): Promise<void>;
  disable?(): Promise<void>;
  enable?(): Promise<void>;
  setEnabled?(enabled: boolean): Promise<void>;
}

const lazy: { AddonManager?: unknown } = {};

try {
  ChromeUtils.defineESModuleGetters(lazy, {
    AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
  });
} catch (e) {
  console.error("[ExtensionRegistry] AddonManager unavailable:", e);
}

const addons = new Map<string, ExtensionInfo>();

/** Produce a stable snapshot-friendly view of an add-on. */
function toInfo(addon: GeckoAddon): ExtensionInfo {
  let iconUrl: string | null = null;
  try {
    iconUrl = addon.getIconURL?.(32) ?? null;
  } catch (e) {
    console.error("[ExtensionRegistry] Failed to read icon:", e);
  }
  return {
    id: addon.id,
    name: addon.name || addon.id,
    version: addon.version || "",
    enabled: addon.isActive ?? addon.isEnabled ?? true,
    iconUrl,
  };
}

async function refreshAll(): Promise<void> {
  try {
    const manager = lazy.AddonManager as {
      getAllAddons?(options?: { types?: string[] }): Promise<GeckoAddon[]>;
      addAddonListener?(listener: unknown): void;
    } | undefined;
    if (!manager || !manager.getAllAddons) {
      return;
    }
    const list = await manager.getAllAddons({ types: ["extension"] });
    addons.clear();
    for (const addon of list) {
      addons.set(addon.id, toInfo(addon));
    }
    notifyUpdated();
  } catch (e) {
    console.error("[ExtensionRegistry] refreshAll failed:", e);
  }
}

function notifyUpdated(): void {
  try {
    Services.obs.notifyObservers(
      { QueryInterface: ChromeUtils.generateQI([]) } as unknown as nsISupports,
      EXTENSIONS_UPDATED_TOPIC,
    );
  } catch (e) {
    console.error("[ExtensionRegistry] notifyUpdated failed:", e);
  }
}

function onAddonChanged(addon: GeckoAddon | null, reason: string): void {
  if (reason === "onUninstalled") {
    if (addon) {
      addons.delete(addon.id);
    }
  } else if (addon) {
    const first = !addons.has(addon.id);
    addons.set(addon.id, toInfo(addon));
    void first;
  }
  notifyUpdated();
}

/** Start tracking the add-on set (idempotent). */
export function initExtensionRegistry(): void {
  const manager = lazy.AddonManager as { addAddonListener?(l: unknown): void } | undefined;
  if (!manager || !manager.addAddonListener) {
    console.warn("[ExtensionRegistry] AddonManager listener API missing");
    return;
  }
  const listener = {
    onInstalled: (addon: GeckoAddon) => onAddonChanged(addon, "onInstalled"),
    onEnabled: (addon: GeckoAddon) => onAddonChanged(addon, "onEnabled"),
    onDisabled: (addon: GeckoAddon) => onAddonChanged(addon, "onDisabled"),
    onUninstalled: (addon: GeckoAddon) => onAddonChanged(addon, "onUninstalled"),
    onEnabling: (addon: GeckoAddon) => onAddonChanged(addon, "onEnabling"),
    onDisabling: (addon: GeckoAddon) => onAddonChanged(addon, "onDisabling"),
  } as const;
  manager.addAddonListener(listener);
  void refreshAll();
}

export function listExtensions(): ExtensionInfo[] {
  return [...addons.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getExtensionInfo(id: string): ExtensionInfo | null {
  return addons.get(id) ?? null;
}

export const ExtensionRegistry = {
  init: initExtensionRegistry,
  listExtensions,
  getExtensionInfo,
  setExtensionEnabled,
};

export async function setExtensionEnabled(id: string, enabled: boolean): Promise<boolean> {
  try {
    const manager = lazy.AddonManager as {
      getAddonByID?(id: string): Promise<GeckoAddon | null>;
      disableAddon?(id: string): Promise<void>;
      enableAddon?(id: string): Promise<void>;
    } | undefined;
    if (!manager?.getAddonByID) {
      return false;
    }
    const addon = await manager.getAddonByID(id);
    if (!addon) {
      return false;
    }
    if (enabled) {
      if (typeof addon.enable === "function") {
        await addon.enable();
      } else if (typeof manager.enableAddon === "function") {
        await manager.enableAddon(id);
      }
    } else {
      if (typeof addon.disable === "function") {
        await addon.disable();
      } else if (typeof manager.disableAddon === "function") {
        await manager.disableAddon(id);
      }
    }
    const fresh = await manager.getAddonByID(id);
    addons.set(id, toInfo(fresh ?? addon));
    notifyUpdated();
    return true;
  } catch (e) {
    console.error("[ExtensionRegistry] setExtensionEnabled failed:", id, e);
    return false;
  }
}
