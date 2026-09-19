// SPDX-License-Identifier: MPL-2.0
import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { JSX } from "solid-js";
import i18next from "i18next";

type SummaryLike = {
  requests: number;
  bytes: number;
  privateRequests: number;
  privateBytes: number;
};
type HostLike = { host: string; requests: number; bytes: number };
type TabLike = { browserId: number; requests: number; bytes: number };
type ExtensionLike = {
  extensionId: string;
  requests: number;
  bytes: number;
  hosts: string[];
};
type SnapshotLike = {
  summary: SummaryLike;
  hosts: HostLike[];
  tabs: TabLike[];
  extensions: ExtensionLike[];
};
type MonitorLike = { snapshot(): SnapshotLike; reset(): void };

const t = (key: string): string =>
  i18next.t("network-monitor." + key, { defaultValue: key }) as string;

function loadMonitor(): MonitorLike | null {
  try {
    const mod = ChromeUtils.importESModule(
      "resource://noraneko/modules/network-monitor/NetworkMonitor.sys.mjs",
    ) as { NetworkMonitor: MonitorLike };
    return mod.NetworkMonitor;
  } catch (error) {
    console.error("[network-monitor] cannot load module:", error);
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return bytes + " B";
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }
  if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

const fmtCount = (n: number): string => n.toLocaleString();

export const NETWORK_PANEL_ID = "network-monitor-panel";

/** JSX-free mount point so the feature entry (.ts, no JSX) can render it. */
export function MountedNetworkPanel(): JSX.Element {
  return <NetworkPanel id={NETWORK_PANEL_ID} />;
}

export function NetworkPanel(props: { id: string }): JSX.Element {
  const [summary, setSummary] = createSignal<SummaryLike | null>(null);
  const [hosts, setHosts] = createSignal<HostLike[]>([]);
  const [tabs, setTabs] = createSignal<TabLike[]>([]);
  const [extensions, setExtensions] = createSignal<ExtensionLike[]>([]);
  const [activeTabId, setActiveTabId] = createSignal(0);
  const [resetFlash, setResetFlash] = createSignal(false);
  let timer: ReturnType<typeof setInterval> | undefined;
  let flashTimer: ReturnType<typeof setTimeout> | undefined;

  const refresh = (): void => {
    const mon = loadMonitor();
    if (!mon) {
      return;
    }
    try {
      const snap = mon.snapshot();
      setSummary(snap.summary);
      setHosts(snap.hosts.slice(0, 8));
      setTabs(snap.tabs.slice(0, 5));
      setExtensions(snap.extensions.slice(0, 5));
      const g = (globalThis as unknown as {
        gBrowser?: { selectedBrowser?: { browserId?: number } };
      }).gBrowser;
      setActiveTabId(g?.selectedBrowser?.browserId ?? 0);
    } catch (error) {
      console.error("[network-monitor] refresh failed:", error);
    }
  };

  const handleReset = (): void => {
    const mon = loadMonitor();
    if (!mon) {
      return;
    }
    mon.reset();
    refresh();
    setResetFlash(true);
    if (flashTimer) {
      clearTimeout(flashTimer);
    }
    flashTimer = setTimeout(() => setResetFlash(false), 1500);
  };

  onMount(() => {
    refresh();
    timer = setInterval(refresh, 1000);
    onCleanup(() => {
      if (timer) {
        clearInterval(timer);
      }
      if (flashTimer) {
        clearTimeout(flashTimer);
      }
    });
  });

  const activeTab = createMemo(
    () => tabs().find((tab) => tab.browserId === activeTabId()) ?? null,
  );

  return (
    <xul:panel
      id={props.id}
      type="arrow"
      position="after_start"
      class="network-monitor-panel"
    >
      <div class="network-monitor-inner">
        <div class="network-monitor-header">
          <span class="network-monitor-title">{t("panel-title")}</span>
          <button
            type="button"
            class="network-monitor-reset"
            onClick={handleReset}
          >
            {t("reset")}
          </button>
        </div>
        <Show when={resetFlash()}>
          <div class="network-monitor-flash">{t("resetting")}</div>
        </Show>
        <div class="network-monitor-totals">
          <div class="network-monitor-total">
            <span class="network-monitor-total-value">
              {fmtCount(summary()?.requests ?? 0)}
            </span>
            <span class="network-monitor-total-label">
              {t("session-requests")}
            </span>
          </div>
          <div class="network-monitor-total">
            <span class="network-monitor-total-value">
              {formatBytes(summary()?.bytes ?? 0)}
            </span>
            <span class="network-monitor-total-label">{t("session-bytes")}</span>
          </div>
        </div>
        <div class="network-monitor-modes">
          <span>{t("normal")}: {fmtCount(summary()?.requests ?? 0)}</span>
          <span class="network-monitor-mode--private">
            {t("private")}: {fmtCount(summary()?.privateRequests ?? 0)}
          </span>
        </div>
        <Show when={activeTab()}>
          <div class="network-monitor-section">
            <span class="network-monitor-section-title">
              {t("active-tab")}
            </span>
            <div class="network-monitor-row">
              <span class="network-monitor-row-host">{activeTab()?.browserId}</span>
              <span class="network-monitor-row-reqs">
                {fmtCount(activeTab()?.requests ?? 0)}
              </span>
              <span class="network-monitor-row-bytes">
                {formatBytes(activeTab()?.bytes ?? 0)}
              </span>
            </div>
          </div>
        </Show>
        <div class="network-monitor-section">
          <span class="network-monitor-section-title">{t("top-hosts")}</span>
          <Show
            when={hosts().length > 0}
            fallback={<span class="network-monitor-empty">{t("no-data")}</span>}
          >
            <div class="network-monitor-rows">
              <For each={hosts()}>
                {(host) => (
                  <div class="network-monitor-row">
                    <span class="network-monitor-row-host">{host.host}</span>
                    <span class="network-monitor-row-reqs">
                      {fmtCount(host.requests)}
                    </span>
                    <span class="network-monitor-row-bytes">
                      {formatBytes(host.bytes)}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
        <Show when={extensions().length > 0}>
          <div class="network-monitor-section">
            <span class="network-monitor-section-title">
              {t("extensions")}
            </span>
            <div class="network-monitor-rows">
              <For each={extensions()}>
                {(ext) => (
                  <div class="network-monitor-row">
                    <span class="network-monitor-row-host">
                      {ext.extensionId}
                    </span>
                    <span class="network-monitor-row-reqs">
                      {fmtCount(ext.requests)}
                    </span>
                    <span class="network-monitor-row-bytes">
                      {formatBytes(ext.bytes)}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </xul:panel>
  );
}
