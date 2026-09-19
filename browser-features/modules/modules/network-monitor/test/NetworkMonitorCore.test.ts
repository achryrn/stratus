// SPDX-License-Identifier: MPL-2.0
// @colocated-env browser

import { NetworkMonitorCore } from "../NetworkMonitorCore.ts";
import type { NetworkRecordInput } from "../types.ts";
import {
  NetworkMonitor,
  NETWORK_UPDATED_TOPIC,
} from "../NetworkMonitor.sys.mts";

import {
  assert,
  assertEquals,
  runTests,
} from "../../../../chrome/test/utils/test_harness.ts";

function req(host: string, over: Partial<NetworkRecordInput> = {}): NetworkRecordInput {
  return {
    host,
    kind: "request",
    browserId: 0,
    bucket: "normal",
    extensionId: null,
    bytes: 0,
    ...over,
  };
}

function res(host: string, bytes: number, over: Partial<NetworkRecordInput> = {}): NetworkRecordInput {
  return {
    host,
    kind: "response",
    browserId: 0,
    bucket: "normal",
    extensionId: null,
    bytes,
    ...over,
  };
}

function testRequestIncrementsCounts(): void {
  const core = new NetworkMonitorCore();
  core.record(req("example.com", { browserId: 7 }));
  const snap = core.snapshot();
  assertEquals(snap.summary.requests, 1, "summary requests should increment");
  assertEquals(snap.hosts.length, 1, "one host recorded");
  assertEquals(snap.hosts[0].requests, 1, "host request count");
  assertEquals(snap.tabs.length, 1, "one tab recorded");
  assertEquals(snap.tabs[0].browserId, 7, "browserId attributed");
  assertEquals(snap.extensions.length, 0, "no extensions recorded");
}

function testResponseBytesAccumulate(): void {
  const core = new NetworkMonitorCore();
  core.record(res("example.com", 1200, { browserId: 7 }));
  core.record(req("example.com", { browserId: 7 }));
  core.record(res("example.com", 800, { browserId: 7 }));
  const snap = core.snapshot();
  assertEquals(snap.summary.bytes, 2000, "bytes should accumulate");
  assertEquals(snap.hosts[0].bytes, 2000, "host bytes");
  assertEquals(snap.tabs[0].bytes, 2000, "tab bytes");
  assertEquals(snap.summary.requests, 1, "responses do not count as requests");
  assertEquals(
    snap.hosts[0].requests,
    1,
    "host request counter increments only on request kind",
  );
  assertEquals(snap.tabs[0].requests, 1, "tab request counter identical");
}

function testPrivateBucketSeparated(): void {
  const core = new NetworkMonitorCore();
  core.record(req("normal.test", { bucket: "normal" }));
  core.record(req("private.test", { bucket: "private" }));
  core.record(res("private.test", 500, { bucket: "private" }));
  const snap = core.snapshot();
  assertEquals(snap.summary.privateRequests, 1, "private request counted");
  assertEquals(snap.summary.privateBytes, 500, "private bytes counted");
  assertEquals(snap.summary.requests, 2, "public+private requests total");
}

function testExtensionAttribution(): void {
  const core = new NetworkMonitorCore();
  core.record(req("api.example.com", { extensionId: "ext-id-1" }));
  core.record(res("cdn.example.com", 9000, { extensionId: "ext-id-1" }));
  core.record(res("api.example.com", 100, { extensionId: "ext-id-1" }));
  const snap = core.snapshot();
  assertEquals(snap.extensions.length, 1, "extension recorded");
  assertEquals(snap.extensions[0].requests, 3, "extension request count");
  assertEquals(snap.extensions[0].bytes, 9100, "extension bytes");
  assertEquals(
    snap.extensions[0].hosts.includes("api.example.com"),
    true,
    "extension touches api host",
  );
  assertEquals(
    snap.extensions[0].hosts.includes("cdn.example.com"),
    true,
    "extension touches cdn host",
  );
}

function testUnattributedChannelNotInTabs(): void {
  const core = new NetworkMonitorCore();
  core.record(req("system.test", { browserId: 0 }));
  assertEquals(core.snapshot().tabs.length, 0, "browserId 0 should not create a tab entry");
}

function testEventRingCapped(): void {
  const core = new NetworkMonitorCore(3);
  core.record(req("a.com"));
  core.record(req("b.com"));
  core.record(req("c.com"));
  core.record(req("d.com"));
  const snap = core.snapshot();
  assertEquals(snap.events.length, 3, "ring keeps only maxEvents");
  assertEquals(snap.events[0].host, "b.com", "oldest kept event");
  assertEquals(core.eventCount, 3, "eventCount matches ring");
}

function testSnapshotSortedByRequests(): void {
  const core = new NetworkMonitorCore();
  core.record(req("low.com"));
  core.record(req("high.com"));
  core.record(req("high.com"));
  core.record(req("high.com"));
  const hosts = core.snapshot().hosts;
  assertEquals(hosts[0].host, "high.com", "top host first");
  assertEquals(hosts[0].requests, 3, "top host request count");
}

function testResetClearsEverything(): void {
  const core = new NetworkMonitorCore();
  core.record(req("a.com"));
  core.record(res("a.com", 1234));
  core.reset();
  const snap = core.snapshot();
  assertEquals(snap.summary.requests, 0, "requests cleared");
  assertEquals(snap.summary.bytes, 0, "bytes cleared");
  assertEquals(snap.hosts.length, 0, "hosts cleared");
  assertEquals(snap.events.length, 0, "events cleared");
}

function testNegativeBytesClamped(): void {
  const core = new NetworkMonitorCore();
  core.record(res("a.com", -5));
  assertEquals(core.snapshot().summary.bytes, 0, "negative bytes ignored");
}

function testReportReturnsTrailingEvents(): void {
  const core = new NetworkMonitorCore(10);
  core.record(req("a.com"));
  core.record(req("b.com"));
  const reported = core.report(1);
  assertEquals(reported.length, 1, "limit respected");
  assertEquals(reported[0].host, "b.com", "most recent host");
}

function testSingletonExposesRuntimeApi(): void {
  assert(typeof NetworkMonitor.snapshot === "function", "singleton snapshot API");
  assert(typeof NetworkMonitor.recentEvents === "function", "singleton events API");
  assertEquals(NETWORK_UPDATED_TOPIC, "stratus.network.updated", "topic constant");
  assert(typeof NetworkMonitor.isRunning === "boolean", "running state exposed");
}

export function runAllTests(): void {
  runTests("network-monitor.test", [
    { name: "request increments counts", fn: testRequestIncrementsCounts },
    { name: "response bytes accumulate", fn: testResponseBytesAccumulate },
    { name: "private bucket separated", fn: testPrivateBucketSeparated },
    { name: "extension attribution", fn: testExtensionAttribution },
    { name: "unattributed channel skipped in tabs", fn: testUnattributedChannelNotInTabs },
    { name: "event ring capped", fn: testEventRingCapped },
    { name: "snapshot sorted by requests", fn: testSnapshotSortedByRequests },
    { name: "reset clears everything", fn: testResetClearsEverything },
    { name: "negative bytes clamped", fn: testNegativeBytesClamped },
    { name: "report returns trailing events", fn: testReportReturnsTrailingEvents },
    { name: "singleton exposes runtime api", fn: testSingletonExposesRuntimeApi },
  ]);
}
