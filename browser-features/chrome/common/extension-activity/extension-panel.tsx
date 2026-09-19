// SPDX-License-Identifier: MPL-2.0
/**
 * M8.2 extension-activity arrow panel: installed extensions with their live
 * session traffic (requests, bytes, recently-accessed origins, last active)
 * and enable/disable controls. Data source: ExtensionRegistry (add-on set)
 * merged with NetworkMonitor (per-extension traffic, keyed by addon id).
 */
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
// (createMemo used for the reactive row snapshot)
import type { JSX } from "solid-js";
import i18next from "i18next";

export const EXTENSION_PANEL_ID = "extension-activity-panel";

type ExtensionLike = {
  extensionId: string;
  requests: number;
  bytes: number;
  hosts: string[];
  lastActive: number;
};
type MonitorLike = { snapshot(): { extensions: ExtensionLike[] } };
type AddonLike = {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  iconUrl: string | null;
};
type RegistryLike = {
  listExtensions(): AddonLike[];
  setExtensionEnabled(id: string, enabled: boolean): Promise<boolean>;
};

type Row = {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  iconUrl: string | null;
  requests: number;
  bytes: number;
  hosts: string[];
  lastActive: number;
  known: boolean;
};

export const t = (key: string): string =>
  i18next.t("extension-activity." + key, { defaultValue: key }) as string;

function loadModules(): { monitor: MonitorLike | null; registry: RegistryLike | null } {
  let monitor: MonitorLike | null = null;
  let registry: RegistryLike | null = null;
  try {
    const m = ChromeUtils.importESModule(
      "resource://noraneko/modules/network-monitor/NetworkMonitor.sys.mjs",
    ) as { NetworkMonitor: MonitorLike };
    monitor = m.NetworkMonitor;
  } catch (error) {
    console.error("[extension-activity] cannot load NetworkMonitor:", error);
  }
  try {
    const r = ChromeUtils.importESModule(
      "resource://noraneko/modules/extension-activity/ExtensionRegistry.sys.mjs",
    ) as { ExtensionRegistry: RegistryLike };
    registry = r.ExtensionRegistry ?? null;
  } catch (error) {
    console.error("[extension-activity] cannot load ExtensionRegistry:", error);
  }
  return { monitor, registry };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return bytes + " B";
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatAgo(ts: number): string {
  if (!ts) {
    return "—";
  }
  const delta = Math.max(0, Date.now() - ts);
  const sec = Math.floor(delta / 1000);
  if (sec < 60) {
    return sec + "s";
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return min + "m";
  }
  const hr = Math.floor(min / 60);
  return hr + "h " + (min % 60) + "m";
}

function buildRows(monitor: MonitorLike | null, registry: RegistryLike | null): Row[] {
  const byId = new Map<string, ExtensionLike>();
  if (monitor) {
    for (const ext of monitor.snapshot().extensions) {
      byId.set(ext.extensionId, ext);
    }
  }
  const rows: Row[] = [];
  const addons = registry?.listExtensions() ?? [];
  for (const addon of addons) {
    const stat = byId.get(addon.id);
    rows.push({
      id: addon.id,
      name: addon.name,
      version: addon.version,
      enabled: addon.enabled,
      iconUrl: addon.iconUrl,
      requests: stat?.requests ?? 0,
      bytes: stat?.bytes ?? 0,
      hosts: stat?.hosts ?? [],
      lastActive: stat?.lastActive ?? 0,
      known: true,
    });
  }
  // Extensions with traffic that are no longer installed (still in the ring).
  for (const [id, stat] of byId) {
    if (!registry || !addons.some((a) => a.id === id)) {
      rows.push({
        id,
        name: id,
        version: "",
        enabled: false,
        iconUrl: null,
        requests: stat.requests,
        bytes: stat.bytes,
        hosts: stat.hosts,
        lastActive: stat.lastActive,
        known: false,
      });
    }
  }
  return rows.sort((a, b) => b.lastActive - a.lastActive || b.requests - a.requests);
}

export function MountedExtensionPanel(_props: { marker?: Element | null; hotCtx?: unknown }): JSX.Element {
  const [rows, setRows] = createSignal<Row[]>([]);
  const [busyId, setBusyId] = createSignal<string | null>(null);

  const list = createMemo(() => rows());

  const totalRequests = createMemo(() =>
    rows().reduce((sum, row) => sum + row.requests, 0),
  );

  const refresh = (): void => {
    const { monitor, registry } = loadModules();
    setRows(buildRows(monitor, registry));
  };

  onMount(() => {
    refresh();
    const id = globalThis.setInterval(refresh, 1500);
    onCleanup(() => globalThis.clearInterval(id));
  });

  const toggle = async (row: Row): Promise<void> => {
    const { registry } = loadModules();
    if (!registry) {
      return;
    }
    // Derive the target from the live registry so a stale row snapshot
    // (captured at render time) can never flip the wrong way.
    const live = registry.getExtensionInfo(row.id);
    const target = !(live?.enabled ?? row.enabled);
    setBusyId(row.id);
    const ok = await registry.setExtensionEnabled(row.id, target);
    console.error("[extension-activity] toggle", row.id, "->", target, "ok=", ok);
    setBusyId(null);
    refresh();
  };

  return (
    <xul:panel id={EXTENSION_PANEL_ID} type="arrow" position="after_start" class="stratus-extension-panel">
      <div class="exp-header">
        <span class="exp-title">{t("panel-title")}</span>
        <span class="exp-count">{list().length + " " + t("extensions-count") + " · " + totalRequests() + " " + t("requests-label")}</span>
      </div>
      <div class="exp-list">
        <For each={list()}>
          {(row) => (
            <div class={"exp-row" + (row.enabled ? "" : " exp-row-disabled")}>
              <span class="exp-icon">
                <Show when={row.iconUrl} fallback={<span class="exp-icon-fallback">“E”</span>}>
                  <img src={row.iconUrl!} alt="" width="20" height="20" />
                </Show>
              </span>
              <div class="exp-main">
                <div class="exp-name">{row.name} <span class="exp-version">{row.version}</span></div>
                <div class="exp-stat">
                  {row.requests + " " + t("requests-label") + "" + (row.bytes ? " · " + formatBytes(row.bytes) : "") + " · " + t("last-active") + " " + formatAgo(row.lastActive)}
                </div>
                <Show when={row.hosts.length > 0}>
                  <div class="exp-hosts">
                    <For each={row.hosts.slice(0, 5)}>
                      {(host) => <span class="exp-host">{host}</span>}
                    </For>
                  </div>
                </Show>
                <Show when={!row.known}>
                  <div class="exp-removed">{t("removed-hint")}</div>
                </Show>
              </div>
              <Show when={row.known}>
                <button
                  type="button"
                  class={"exp-toggle" + (row.enabled ? "" : " exp-toggle-off")}
                  disabled={busyId() === row.id || undefined}
                  onclick={() => toggle(row)}
                  title={row.enabled ? t("disable-tooltip") : t("enable-tooltip")}
                >
                  {row.enabled ? t("disable") : t("enable")}
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>
      <div class="exp-footer">{t("footer-hint")}</div>
    </xul:panel>
  );
}
