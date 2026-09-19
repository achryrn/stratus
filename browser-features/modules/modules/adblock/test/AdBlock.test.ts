// @colocated-env browser
import { assert, assertEquals, runTests } from "../../../../chrome/test/utils/test_harness.ts";
import { BUILTIN_AD_LIST, buildRules, matchesAdUrl, parseRule, STUB_GIF } from "../AdBlockCore.ts";
import {
  initAdBlockManager,
  isAdBlockEnabled,
  matchesAnyRule,
  setAdBlockEnabled,
} from "../AdBlockManager.sys.mts";

function testRuleParsing(): void {
  const r = parseRule("https://doubleclick.net/path");
  assert(r !== null, "parse scheme+path");
  assertEquals(r!.host, "doubleclick.net", "host kept");
  assertEquals(r!.port, null, "no port");
  const w = parseRule("*.googlesyndication.com");
  assertEquals(w!.host, "googlesyndication.com", "wildcard stripped");
  const port = parseRule("127.0.0.1:4999");
  assertEquals(port!.host, "127.0.0.1", "port host");
  assertEquals(port!.port, 4999, "port kept");
  assertEquals(parseRule(""), null, "empty rejected");
}

function testMatching(): void {
  const rules = buildRules(BUILTIN_AD_LIST);
  assert(matchesAdUrl(rules, "https://securepubads.g.doubleclick.net/gpt.js"), "ad host matches");
  assert(matchesAdUrl(rules, "https://doubleclick.net/"), "exact host matches");
  assert(matchesAdUrl(rules, "http://pagead2.googlesyndication.com/pagead/js"), "gs host matches");
  assert(!matchesAdUrl(rules, "https://example.com/"), "normal site not matched");
  assert(!matchesAdUrl(rules, "https://notdoubleclick.net/"), "suffix collision avoided");
  assert(!matchesAdUrl(rules, "about:newtab"), "non-http ignored");
  const localRules = buildRules(["127.0.0.1:4999"]);
  assert(matchesAdUrl(localRules, "http://127.0.0.1:4999/ad.gif"), "port rule matches");
  assert(!matchesAdUrl(localRules, "http://127.0.0.1:5999/ad.gif"), "other port not matched");
}

function testStubBody(): void {
  assert(STUB_GIF.startsWith("data:image/gif;base64,"), "stub is a gif data uri");
  assert(STUB_GIF.length > 60, "stub non-empty");
}

function testManagerSurface(): void {
  initAdBlockManager();
  assertEquals(typeof isAdBlockEnabled, "function", "enabled getter");
  const old = isAdBlockEnabled();
  try {
    setAdBlockEnabled(false);
    assert(!isAdBlockEnabled(), "disabled");
    setAdBlockEnabled(true);
    assert(isAdBlockEnabled(), "enabled again");
  } finally {
    setAdBlockEnabled(old);
  }
  assert(matchesAnyRule("https://doubleclick.net/x"), "manager matches");
}

export function runAllTests(): void {
  initAdBlockManager();
  runTests("adblock.test", [
    { name: "rule parsing + normalization", fn: testRuleParsing },
    { name: "host matching semantics", fn: testMatching },
    { name: "stub body shape", fn: testStubBody },
    { name: "manager surface", fn: testManagerSurface },
  ]);
}
