// SPDX-License-Identifier: MPL-2.0

/** Network monitor shared types (module <-> os-server <-> chrome UI). */

export type TrafficBucket = "normal" | "private";

export interface NetworkEvent {
  id: number;
  timestamp: number;
  host: string;
  kind: "request" | "response";
  browserId: number;
  bucket: TrafficBucket;
  extensionId: string | null;
  bytes: number;
}

export interface HostStat {
  host: string;
  requests: number;
  bytes: number;
  /** Unix ms of the most recent recorded event for this host. */
  lastActive: number;
}

export interface TabStat {
  browserId: number;
  requests: number;
  bytes: number;
  /** Unix ms of the most recent recorded event for this tab. */
  lastActive: number;
}

export interface ExtensionStat {
  extensionId: string;
  requests: number;
  bytes: number;
  hosts: string[];
  /** Unix ms of the most recent recorded event from this extension. */
  lastActive: number;
}

export interface NetworkSummary {
  requests: number;
  bytes: number;
  privateRequests: number;
  privateBytes: number;
}

export interface NetworkSnapshot {
  summary: NetworkSummary;
  hosts: HostStat[];
  tabs: TabStat[];
  extensions: ExtensionStat[];
  events: NetworkEvent[];
}

export interface NetworkRecordInput {
  host: string;
  kind: "request" | "response";
  browserId: number;
  bucket: TrafficBucket;
  extensionId: string | null;
  bytes: number;
}

/** Observer topic broadcast (throttled) whenever new traffic is recorded. */
export const NETWORK_UPDATED_TOPIC = "stratus.network.updated";
/** Pref: master switch for collecting traffic telemetry (default on). */
export const NETWORK_MONITOR_ENABLED_PREF = "stratus.networkMonitor.enabled";
/** Pref: event ring-buffer size (default 400). */
export const NETWORK_MONITOR_MAX_EVENTS_PREF = "stratus.networkMonitor.maxEvents";
/** Pref: verbose debugging of which path recorded a request. */
export const NETWORK_MONITOR_DEBUG_PREF = "stratus.networkMonitor.debug";
