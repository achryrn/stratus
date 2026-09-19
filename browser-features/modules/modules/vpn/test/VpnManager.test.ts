// SPDX-License-Identifier: MPL-2.0
// @colocated-env browser

// M8.3: per-mode VPN — mode toggles are independent (private VPN never
// applies to normal browsing), bypass hosts always direct, config
// persists per mode, and applying routing drives the proxy prefs.

import {
  buildNoProxyList,
  cloneConfig,
  DEFAULT_VPN_CONFIG,
  isAlwaysDirectHost,
  isModeProxyEnabled,
  modeOfLoadInfo,
  type VpnConfig,
} from "../VpnCore.ts";
import {
  applyRoutingForMode,
  getActiveVpnMode,
  getVpnConfig,
  initVpnManager,
  setVpnLocation,
  setVpnModeEnabled,
  setVpnProxy,
  VPN_ACTIVE_MODE_PREF,
  VPN_CONFIG_PREF,
  VPN_UPDATED_TOPIC,
} from "../VpnManager.sys.mts";

import { assert, assertEquals, runTests } from "../../../../chrome/test/utils/test_harness.ts";

function cfg(over: Partial<VpnConfig> = {}): VpnConfig {
  const c = cloneConfig(DEFAULT_VPN_CONFIG);
  c.proxy = { host: "127.0.0.1", port: 59123, type: "http" };
  return { ...c, ...over, proxy: { ...c.proxy, ...(over.proxy ?? {}) } };
}

function testModeDecisionIsolation(): void {
  const normalOnly = cfg({ enabled: { normal: true, private: false } });
  assert(isModeProxyEnabled(normalOnly, "normal") === true, "normal on -> proxied");
  assert(isModeProxyEnabled(normalOnly, "private") === false, "private stays direct");
  const privateOnly = cfg({ enabled: { normal: false, private: true } });
  assert(isModeProxyEnabled(privateOnly, "normal") === false, "normal direct");
  assert(isModeProxyEnabled(privateOnly, "private") === true, "private proxied");
}

function testNotConfiguredNeverProxies(): void {
  const c = cloneConfig(DEFAULT_VPN_CONFIG);
  c.enabled.normal = true;
  assert(isModeProxyEnabled(c, "normal") === false, "no proxy host -> direct");
}

function testBypassHosts(): void {
  for (const host of ["localhost", "127.0.0.1", "::1", "10.1.2.3", "172.16.0.9", "192.168.1.1", "nas.local", "updates.floorp.app"]) {
    assert(isAlwaysDirectHost(host) === true, `bypass host ${host}`);
  }
  assert(isAlwaysDirectHost("8.8.8.8") === false, "public IP not bypassed");
  assert(isAlwaysDirectHost("") === true, "empty host direct");
}

function testNoProxyListCoversInfra(): void {
  const list = buildNoProxyList();
  for (const frag of ["localhost", "127.0.0.1", "10.*", "192.168.*", "*.local", "updates.floorp.app"]) {
    assert(list.includes(frag), `no_proxies_on contains ${frag}`);
  }
}

function testModeOfLoadInfo(): void {
  assertEquals(modeOfLoadInfo(null), "normal", "null loadInfo -> normal");
  assertEquals(modeOfLoadInfo({ originAttributes: { privateBrowsingId: 0 } }), "normal", "pb 0 -> normal");
  assertEquals(modeOfLoadInfo({ originAttributes: { privateBrowsingId: 1 } }), "private", "pb 1 -> private");
}

function testConfigRoundTripIsolation(): void {
  setVpnModeEnabled("private", true);
  setVpnProxy({ host: "192.0.2.10", port: 3128, type: "socks" });
  const after = getVpnConfig();
  assertEquals(after.enabled.private, true, "private toggle persisted");
  assertEquals(after.enabled.normal, false, "normal untouched (isolation)");
  assertEquals(after.proxy.host, "192.0.2.10", "proxy host persisted");
  assertEquals(after.proxy.type, "socks", "proxy type persisted");
  setVpnModeEnabled("private", false);
  setVpnProxy({ host: "", port: 0, type: "http" });
}

function testApplyRoutingDrivesPrefs(): void {
  setVpnProxy({ host: "127.0.0.1", port: 59123, type: "http" });
  setVpnModeEnabled("normal", true);
  applyRoutingForMode("normal");
  assertEquals(Services.prefs.getIntPref("network.proxy.type"), 1, "manual proxy for normal");
  assertEquals(Services.prefs.getStringPref("network.proxy.http"), "127.0.0.1", "proxy host pref");
  assertEquals(Services.prefs.getIntPref("network.proxy.http_port"), 59123, "proxy port pref");
  assertEquals(getActiveVpnMode(), "normal", "active mode written");
  setVpnModeEnabled("normal", false);
  applyRoutingForMode("normal");
  assertEquals(Services.prefs.getIntPref("network.proxy.type"), 0, "direct when off");
  assertEquals(getActiveVpnMode(), "", "active mode cleared");
}

function testApplyRoutingBypassList(): void {
  setVpnProxy({ host: "127.0.0.1", port: 59123, type: "http" });
  setVpnModeEnabled("normal", true);
  applyRoutingForMode("normal");
  const list = Services.prefs.getStringPref("network.proxy.no_proxies_on", "");
  assert(list.includes("localhost"), "localhost in no_proxies_on");
  assert(list.includes("192.168.*"), "intranet in no_proxies_on");
  setVpnModeEnabled("normal", false);
  applyRoutingForMode("normal");
}

function testManagerSurface(): void {
  initVpnManager();
  assertEquals(VPN_CONFIG_PREF, "stratus.vpn.config", "config pref");
  assertEquals(VPN_ACTIVE_MODE_PREF, "stratus.vpn.activeMode", "active mode pref");
  assertEquals(VPN_UPDATED_TOPIC, "stratus.vpn.updated", "update topic");
  assert(typeof getVpnConfig === "function", "config getter exposed");
  assert(typeof setVpnLocation === "function", "location setter exposed");
  assert(typeof applyRoutingForMode === "function", "router exposed");
}

export function runAllTests(): void {
  runTests("vpn.test", [
    { name: "mode decision isolation", fn: testModeDecisionIsolation },
    { name: "not configured never proxies", fn: testNotConfiguredNeverProxies },
    { name: "bypass hosts always direct", fn: testBypassHosts },
    { name: "no_proxies_on covers infra", fn: testNoProxyListCoversInfra },
    { name: "mode derived from load info", fn: testModeOfLoadInfo },
    { name: "config round-trip persists per-mode", fn: testConfigRoundTripIsolation },
    { name: "apply routing drives proxy prefs", fn: testApplyRoutingDrivesPrefs },
    { name: "apply routing sets bypass list", fn: testApplyRoutingBypassList },
    { name: "manager surface", fn: testManagerSurface },
  ]);
}
