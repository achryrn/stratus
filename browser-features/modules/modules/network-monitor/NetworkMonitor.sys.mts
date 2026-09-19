/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Transparent traffic overview (M8.1).
 *
 * Parent-process HTTP observer that records per-host / per-tab / per-extension
 * request counts and transferred bytes, split by normal vs private browsing
 * mode. Data stays local and session-scoped.
 *
 * NOTE: in this runtime the parent process receives channel notifications for
 * both browser-UI and web-content traffic, so a single parent observer covers
 * the whole browser. Tabs are attributed via loadInfo.browsingContextId and,
 * when the id is missing, via a host->tab fallback over open browser windows.
 *
 * The singleton auto-starts when imported (browser startup via
 * NoranekoStartup). A throttled broadcast on NETWORK_UPDATED_TOPIC lets the
 * chrome panel and os-server SSE stream react without polling the stack.
 */

import {
  NETWORK_MONITOR_DEBUG_PREF,
  NETWORK_MONITOR_ENABLED_PREF,
  NETWORK_MONITOR_MAX_EVENTS_PREF,
  NETWORK_SNAPSHOT_PREF,
  NETWORK_UPDATED_TOPIC,
} from "./types.ts";
import type { NetworkEvent, TrafficBucket } from "./types.ts";
import { DEFAULT_MAX_EVENTS, NetworkMonitorCore } from "./NetworkMonitorCore.ts";

const { setTimeout, clearTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs",
);

const OBSERVED_TOPICS = [
  "http-on-modify-request",
  "http-on-examine-response",
  "http-on-examine-merged-response",
] as const;

const NOTIFY_DEBOUNCE_MS = 300;

type OriginAttributesLike = { privateBrowsingId?: number };
type LoadInfoLike = {
  browsingContextId?: number;
  originAttributes?: OriginAttributesLike;
  triggeringPrincipal?: { scheme?: string; host?: string } | null;
};
type HttpChannelLike = {
  URI?: { scheme?: string; host?: string } | null;
  transferSize?: number;
  contentLength?: number;
  getResponseHeader?(name: string): string | null;
  loadInfo?: LoadInfoLike | null;
};
type BrowsingContextLike = {
  get(id: number): { top?: { embedderElement?: { browserId?: number } | null } | null } | null;
};
type PolicyLike = { getByHost(host: string): { id: string } | null };
type BrowserLike = { browserId: number; currentURI?: { host?: string } | null };

const browsingContextGlobal = (
  globalThis as unknown as { BrowsingContext?: BrowsingContextLike }
).BrowsingContext;
const webExtensionPolicyGlobal = (
  globalThis as unknown as { WebExtensionPolicy?: PolicyLike }
).WebExtensionPolicy;

class NetworkMonitorService {
  private readonly core = new NetworkMonitorCore(this.readMaxEvents());
  private started = false;
  private notifyTimer: number | null = null;

  private readonly observer = {
    observe: (subject: unknown, topic: string): void => {
      if (!this.isEnabled) {
        return;
      }
      switch (topic) {
        case "http-on-modify-request":
          this.handleRequest(subject);
          break;
        case "http-on-examine-response":
        case "http-on-examine-merged-response":
          this.handleResponse(subject);
          break;
      }
    },
  };

  get isEnabled(): boolean {
    try {
      return Services.prefs.getBoolPref(NETWORK_MONITOR_ENABLED_PREF, true);
    } catch {
      return true;
    }
  }

  get isRunning(): boolean {
    return this.started;
  }

  start(): void {
    if (this.started) {
      return;
    }
    for (const topic of OBSERVED_TOPICS) {
      Services.obs.addObserver(this.observer, topic);
    }
    this.started = true;
  }

  stop(): void {
    if (!this.started) {
      return;
    }
    for (const topic of OBSERVED_TOPICS) {
      try {
        Services.obs.removeObserver(this.observer, topic);
      } catch {
        // ignore
      }
    }
    if (this.notifyTimer !== null) {
      clearTimeout(this.notifyTimer);
      this.notifyTimer = null;
    }
    this.started = false;
  }

  reset(): void {
    this.core.reset();
    this.notify();
  }

  snapshot() {
    return this.core.snapshot();
  }

  recentEvents(limit: number): NetworkEvent[] {
    return this.core.report(limit);
  }

  private handleRequest(subject: unknown): void {
    const channel = subject as HttpChannelLike;
    const host = this.extractHost(channel);
    if (!host) {
      return;
    }
    const loadInfo = channel?.loadInfo ?? null;
    const browserId = this.resolveBrowserId(loadInfo, host);
    this.core.record({
      host,
      kind: "request",
      browserId,
      bucket: this.resolveBucket(loadInfo),
      extensionId: this.resolveExtensionId(loadInfo?.triggeringPrincipal ?? null),
      bytes: 0,
    });
    this.scheduleNotify();
  }

  private handleResponse(subject: unknown): void {
    const channel = subject as HttpChannelLike;
    const host = this.extractHost(channel);
    if (!host) {
      return;
    }
    const loadInfo = channel?.loadInfo ?? null;
    const transferSize = typeof channel?.transferSize === "number"
      ? channel.transferSize
      : -1;
    const contentLength = typeof channel?.contentLength === "number"
      ? channel.contentLength
      : -1;
    // transferSize is not exposed on Gecko channels and contentLength is -1
    // for chunked (gzip) responses; fall back to the Content-Length response
    // header so non-chunked transfers contribute real byte totals.
    let headerLength = -1;
    try {
      const raw = (channel as HttpChannelLike)?.getResponseHeader?.(
        "Content-Length",
      );
      if (typeof raw === "string" && raw.trim() !== "") {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) headerLength = n;
      }
    } catch {
      // no header on this response
    }
    const bytes = transferSize >= 0
      ? transferSize
      : contentLength > 0
        ? contentLength
        : headerLength > 0
          ? headerLength
          : 0;
    const browserId = this.resolveBrowserId(loadInfo, host);
    this.core.record({
      host,
      kind: "response",
      browserId,
      bucket: this.resolveBucket(loadInfo),
      extensionId: this.resolveExtensionId(loadInfo?.triggeringPrincipal ?? null),
      bytes,
    });
    this.scheduleNotify();
  }

  private extractHost(channel: HttpChannelLike): string | null {
    const uri = channel?.URI;
    if (!uri) {
      return null;
    }
    const scheme = String(uri.scheme ?? "");
    if (scheme !== "http" && scheme !== "https") {
      return null;
    }
    const host = String(uri.host ?? "");
    return host ? host : null;
  }

  private resolveBucket(loadInfo: LoadInfoLike | null): TrafficBucket {
    return loadInfo?.originAttributes?.privateBrowsingId ? "private" : "normal";
  }

  private resolveBrowserId(loadInfo: LoadInfoLike | null, host: string): number {
    const bcId = loadInfo?.browsingContextId ?? 0;
    if (bcId > 0) {
      const viaBc = this.browserIdFromContext(bcId);
      if (viaBc > 0) {
        return viaBc;
      }
    }
    // loadInfo carries no usable browsing context id (common for parent-side
    // content channels we observed); attribute to a tab showing this host.
    return this.browserIdByHost(host);
  }

  private browserIdFromContext(browsingContextId: number): number {
    if (browsingContextId <= 0) {
      return 0;
    }
    try {
      const bc = browsingContextGlobal?.get(browsingContextId);
      const embedder = bc?.top?.embedderElement as
        | { browserId?: number }
        | null
        | undefined;
      return typeof embedder?.browserId === "number" ? embedder.browserId : 0;
    } catch {
      return 0;
    }
  }

  private browserIdByHost(host: string): number {
    try {
      const wm = Services.wm as unknown as {
        getEnumerator(winType: string): Iterable<{
          gBrowser?: {
            tabs: Array<{
              linkedBrowser?: BrowserLike;
            }>;
          } | null;
        }>;
      };
      for (const win of wm.getEnumerator("navigator:browser")) {
        const gBrowser = win.gBrowser;
        if (!gBrowser) {
          continue;
        }
        for (const tab of gBrowser.tabs) {
          const browser = tab.linkedBrowser;
          if (browser && browser.currentURI?.host === host) {
            return browser.browserId;
          }
        }
      }
    } catch {
      // fall through
    }
    return 0;
  }

  private resolveExtensionId(
    principal: { scheme?: string; host?: string } | null | undefined,
  ): string | null {
    if (!principal || principal.scheme !== "moz-extension") {
      return null;
    }
    const extHost = String(principal.host ?? "");
    if (!extHost) {
      return null;
    }
    // Resolve the moz-extension host UUID to the add-on id. This dev runtime
    // lacks WebExtensionPolicy.getByHost; prefer it when present (newer
    // Gecko) and fall back to matching mozExtensionHostname over active
    // policies. Never throw: a resolution failure degrades to the UUID.
    try {
      const policyType = webExtensionPolicyGlobal as {
        getByHost?(host: string): { id?: string } | null;
        getActiveExtensions?(): Array<{ id?: string; mozExtensionHostname?: string }>;
      } | undefined;
      if (typeof policyType?.getByHost === "function") {
        return policyType.getByHost(extHost)?.id ?? extHost;
      }
      if (typeof policyType?.getActiveExtensions === "function") {
        for (const policy of policyType.getActiveExtensions()) {
          if (String(policy.mozExtensionHostname ?? "") === extHost) {
            return policy.id ?? extHost;
          }
        }
      }
    } catch {
      // fall back to the UUID below
    }
    return extHost;
  }

  private get isDebug(): boolean {
    try {
      return Services.prefs.getBoolPref(NETWORK_MONITOR_DEBUG_PREF, false);
    } catch {
      return false;
    }
  }

  private scheduleNotify(): void {
    if (this.notifyTimer !== null) {
      return;
    }
    this.notifyTimer = setTimeout(() => {
      this.notifyTimer = null;
      this.notify();
    }, NOTIFY_DEBOUNCE_MS);
  }

  private notify(): void {
    try {
      Services.obs.notifyObservers(
        null as unknown as nsISupports,
        NETWORK_UPDATED_TOPIC,
      );
    } catch {
      // ignore notification failures during shutdown
    }
    this.publishPrefSnapshot();
  }

  /**
   * Mirror a compact snapshot into a pref so privileged pages (Settings)
   * can consume live traffic through the standard pref bridge without
   * depending on HTTP loopback from renderer content.
   */
  private publishPrefSnapshot(): void {
    try {
      const snap = this.core.snapshot();
      Services.prefs.setStringPref(
        NETWORK_SNAPSHOT_PREF,
        JSON.stringify({
          summary: snap.summary,
          hosts: snap.hosts.slice(0, 8),
          extensions: snap.extensions.slice(0, 8),
          updatedAt: Date.now(),
        }),
      );
    } catch {
      // keep telemetry collection unaffected by pref failures
    }
  }

  private readMaxEvents(): number {
    try {
      const value = Services.prefs.getIntPref(
        NETWORK_MONITOR_MAX_EVENTS_PREF,
        DEFAULT_MAX_EVENTS,
      );
      return value > 0 ? value : DEFAULT_MAX_EVENTS;
    } catch {
      return DEFAULT_MAX_EVENTS;
    }
  }
}

export { NETWORK_UPDATED_TOPIC };
export const NetworkMonitor = new NetworkMonitorService();

// Start collecting as soon as this module is imported (browser startup).
NetworkMonitor.start();
