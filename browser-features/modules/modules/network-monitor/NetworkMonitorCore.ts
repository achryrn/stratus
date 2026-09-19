// SPDX-License-Identifier: MPL-2.0
import type {
  ExtensionStat,
  HostStat,
  NetworkEvent,
  NetworkRecordInput,
  NetworkSnapshot,
  NetworkSummary,
  TabStat,
} from "./types.ts";

export const DEFAULT_MAX_EVENTS = 400;
const MAX_EXTENSION_HOSTS = 12;

function emptySummary(): NetworkSummary {
  return { requests: 0, bytes: 0, privateRequests: 0, privateBytes: 0 };
}

function toBytes(input: NetworkRecordInput): number {
  return input.bytes > 0 ? input.bytes : 0;
}

/**
 * Framework-free aggregation core for the traffic overview. Kept pure so
 * unit tests can run without real network channels; the .sys singleton
 * feeds it from HTTP observers.
 */
export class NetworkMonitorCore {
  private seq = 0;
  private readonly events: NetworkEvent[] = [];
  private readonly hostMap = new Map<string, HostStat>();
  private readonly tabMap = new Map<number, TabStat>();
  private readonly extMap = new Map<string, ExtensionStat>();
  private summary: NetworkSummary = emptySummary();

  constructor(private readonly maxEvents: number = DEFAULT_MAX_EVENTS) {}

  record(input: NetworkRecordInput): void {
    const isRequest = input.kind === "request";
    const bytes = isRequest ? 0 : toBytes(input);
    const ts = Date.now();
    if (isRequest) {
      this.summary.requests++;
      if (input.bucket === "private") {
        this.summary.privateRequests++;
      }
    } else {
      this.summary.bytes += bytes;
      if (input.bucket === "private") {
        this.summary.privateBytes += bytes;
      }
    }
    this.bumpHost(input.host, bytes, isRequest, ts);
    if (input.browserId > 0) {
      this.bumpTab(input.browserId, bytes, isRequest, ts);
    }
    if (input.extensionId) {
      this.bumpExtension(input.extensionId, input.host, bytes, isRequest, ts);
    }
    this.pushEvent(input, ts);
  }

  snapshot(): NetworkSnapshot {
    return {
      summary: { ...this.summary },
      hosts: this.sortedHosts(),
      tabs: this.sortedTabs(),
      extensions: this.sortedExtensions(),
      events: this.events.slice(),
    };
  }

  reset(): void {
    this.hostMap.clear();
    this.tabMap.clear();
    this.extMap.clear();
    this.events.length = 0;
    this.summary = emptySummary();
  }

  get eventCount(): number {
    return this.events.length;
  }

  report(limit = 400): NetworkEvent[] {
    return this.events.slice(-limit);
  }

  private bumpHost(
    host: string,
    bytes: number,
    isRequest: boolean,
    ts: number,
  ): void {
    let stat = this.hostMap.get(host);
    if (!stat) {
      stat = { host, requests: 0, bytes: 0, lastActive: ts };
      this.hostMap.set(host, stat);
    }
    if (isRequest) {
      stat.requests++;
    }
    stat.bytes += bytes;
    stat.lastActive = ts;
  }

  private bumpTab(
    browserId: number,
    bytes: number,
    isRequest: boolean,
    ts: number,
  ): void {
    let stat = this.tabMap.get(browserId);
    if (!stat) {
      stat = { browserId, requests: 0, bytes: 0, lastActive: ts };
      this.tabMap.set(browserId, stat);
    }
    if (isRequest) {
      stat.requests++;
    }
    stat.bytes += bytes;
    stat.lastActive = ts;
  }

  private bumpExtension(
    extensionId: string,
    host: string,
    bytes: number,
    isRequest: boolean,
    ts: number,
  ): void {
    let stat = this.extMap.get(extensionId);
    if (!stat) {
      stat = { extensionId, requests: 0, bytes: 0, hosts: [], lastActive: ts };
      this.extMap.set(extensionId, stat);
    }
    if (isRequest) {
      stat.requests++;
    }
    stat.bytes += bytes;
    stat.lastActive = ts;
    if (!stat.hosts.includes(host) && stat.hosts.length < MAX_EXTENSION_HOSTS) {
      stat.hosts.push(host);
    }
  }

  private pushEvent(input: NetworkRecordInput, ts: number): void {
    this.seq++;
    const ev: NetworkEvent = {
      id: this.seq,
      timestamp: ts,
      host: input.host,
      kind: input.kind,
      browserId: input.browserId,
      bucket: input.bucket,
      extensionId: input.extensionId,
      bytes: toBytes(input),
    };
    this.events.push(ev);
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  private sortedHosts(): HostStat[] {
    return [...this.hostMap.values()].sort((a, b) => b.requests - a.requests);
  }

  private sortedTabs(): TabStat[] {
    return [...this.tabMap.values()].sort((a, b) => b.requests - a.requests);
  }

  private sortedExtensions(): ExtensionStat[] {
    return [...this.extMap.values()].sort((a, b) => b.requests - a.requests);
  }
}
