// SPDX-License-Identifier: MPL-2.0
// @colocated-env browser

import {
  assert,
  assertEquals,
  runTests,
  type TestCase,
} from "../../../../chrome/test/utils/test_harness.ts";

// ---------------------------------------------------------------------------
// Remote-control production regression tests.
//
// The RemoteControl server is startup-hooked, so in the test browser it is
// ALREADY listening on http://127.0.0.1:58263 with a boot-generated bearer
// token (production security stance). These tests drive the real wire
// contract: auth enforcement, origin policy, settings/prefs round-trip,
// audit trail, payload cap and content eval.
// ---------------------------------------------------------------------------

const PORT = 58263;
const BASE = "http://127.0.0.1:" + PORT;

function readToken(): string {
  const g = globalThis as unknown as {
    Services?: {
      prefs?: { getStringPref(name: string, def: string): string };
    };
  };
  return g.Services?.prefs?.getStringPref("stratus.remote.token", "") ?? "";
}

async function http(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: Record<string, unknown> | null = null;
  try { json = (await res.json()) as Record<string, unknown>; } catch { /* no body */ }
  return { status: res.status, json };
}

function bearer(): Record<string, string> {
  return { authorization: "Bearer " + readToken() };
}

async function testServerUpWithBootToken(): Promise<void> {
  const token = readToken();
  assert(token.length >= 32, "boot should have generated a 32-char token (never silently open)");
  const res = await http("GET", "/status", undefined, bearer());
  assertEquals(res.status, 200, "/status with bearer token → 200");
  const app = res.json?.app as string | undefined;
  assert(typeof app === "string" && app.length > 0, "/status reports the app name");
  assert(Array.isArray(res.json?.windows), "/status returns a windows array");
}

async function testAuthRequiredByDefault(): Promise<void> {
  const res = await http("GET", "/status");
  assertEquals(res.status, 401, "missing bearer token → 401");
  const bad = await http("GET", "/status", undefined, { authorization: "Bearer wrongtoken" });
  assertEquals(bad.status, 401, "wrong bearer token → 401");
}

// fetch() cannot send an Origin header (forbidden header name), so the
// drive-by defence is probed with a raw socket request, exactly like a
// malicious page's fetch would hit the wire.
async function rawRequest(extraHeaders: string[], bodyBytes = 0): Promise<string> {
  const sts = Cc["@mozilla.org/network/socket-transport-service;1"].getService(
    Ci.nsISocketTransportService,
  );
  const transport = sts.createTransport([], "127.0.0.1", PORT, null, null);
  const out = transport.openOutputStream(0, 0, 0);
  const inStream = transport.openInputStream(0, 0, 0);
  const headLines = [
    "GET /status HTTP/1.1",
    "Host: 127.0.0.1:" + PORT,
    "Authorization: Bearer " + readToken(),
    ...extraHeaders,
    "Connection: close",
  ];
  if (bodyBytes > 0) headLines.push("Content-Length: " + bodyBytes);
  const head = headLines.join("\r\n") + "\r\n\r\n";
  out.write(head, head.length);
  if (bodyBytes > 0) {
    const filler = "x";
    out.write(filler, 1);
  }
  const sis = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
    Ci.nsIScriptableInputStream,
  );
  sis.init(inStream);
  let all = "";
  const deadline = Date.now() + 5000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let avail = 0;
    try {
      avail = sis.available();
    } catch {
      break; // stream closed by the server
    }
    if (avail > 0) {
      all += sis.read(avail);
      if (all.includes("HTTP/1.1 ")) {
        const line = all.split("\r\n")[0] ?? "";
        if (/^HTTP\/1\.1 (2|3|4)\d\d/.test(line)) break;
      }
    }
    if (Date.now() > deadline) break;
    await new Promise((res) => setTimeout(res, 25));
  }
  try {
    out.close();
    inStream.close();
  } catch {
    /* ignore */
  }
  return all;
}

async function testOriginPolicyBlocksDriveBy(): Promise<void> {
  const evil = await rawRequest(["Origin: https://evil.example"]);
  assert(evil.includes("HTTP/1.1 403"), "webpage-origin request → 403 (drive-by blocked), got: " + evil.slice(0, 60));
  const self = await rawRequest(["Origin: http://127.0.0.1:" + PORT]);
  assert(self.includes("HTTP/1.1 200"), "self-origin request still allowed, got: " + self.slice(0, 60));
}

async function testSettingsPrefsRoundTrip(): Promise<void> {
  const set = await http("POST", "/settings", { name: "stratus.remote.testrt", type: "bool", value: true }, bearer());
  assertEquals(set.status, 200, "POST /settings → 200");
  const get = await http("GET", "/prefs?name=stratus.remote.testrt", undefined, bearer());
  assertEquals(get.status, 200, "GET /prefs → 200");
  assertEquals(get.json?.value, true, "pref round-trips as true");
  await http("POST", "/settings", { name: "stratus.remote.testrt", type: "bool", value: false }, bearer());
}

async function testAuditTrailRecordsOperations(): Promise<void> {
  const res = await http("GET", "/audit", undefined, bearer());
  assertEquals(res.status, 200, "GET /audit → 200");
  const entries = res.json?.entries as Array<{ method: string; path: string; status: number }> | undefined;
  assert(Array.isArray(entries) && entries.length > 0, "audit has recorded operations");
  const hasStatus = entries.some((e) => e.path === "/status");
  assert(hasStatus, "audit contains a /status entry");
}

async function testPayloadCapRejectsHugeBody(): Promise<void> {
  const res = await rawRequest([], 5 * 1024 * 1024 + 1);
  assert(res.includes("HTTP/1.1 413"), "advertised payload over 4 MiB → 413, got: " + res.slice(0, 60));
}

async function testContentEvalRoundTrip(): Promise<void> {
  const res = await http("POST", "/eval", { expression: "1 + 1", context: "content" }, bearer());
  assertEquals(res.status, 200, "POST /eval content → 200");
  assertEquals(res.json?.ok, true, "content eval ok");
}

const tests: TestCase[] = [
  { name: "server up with boot-generated token", fn: testServerUpWithBootToken },
  { name: "auth required by default (401)", fn: testAuthRequiredByDefault },
  { name: "origin policy blocks drive-by (403)", fn: testOriginPolicyBlocksDriveBy },
  { name: "settings → prefs round-trip", fn: testSettingsPrefsRoundTrip },
  { name: "audit trail records operations", fn: testAuditTrailRecordsOperations },
  { name: "payload cap rejects huge body (413)", fn: testPayloadCapRejectsHugeBody },
  { name: "content eval round-trip", fn: testContentEvalRoundTrip },
];

export async function runAllTests(): Promise<void> {
  await runTests("RemoteControl.test.ts", tests);
}
