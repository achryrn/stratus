// SPDX-License-Identifier: MPL-2.0
// @colocated-env browser

// M8.2: live add-on registry feeds the transparent extension activity panel.

import {
  initExtensionRegistry,
  listExtensions,
  getExtensionInfo,
  setExtensionEnabled,
  EXTENSIONS_UPDATED_TOPIC,
} from "../ExtensionRegistry.sys.mts";

import { assert, assertEquals, runTests } from "../../../../chrome/test/utils/test_harness.ts";

function testRegistryInitializesAndLists(): void {
  initExtensionRegistry();
  const list = listExtensions();
  assert(Array.isArray(list), "listExtensions returns an array");
  for (const ext of list) {
    assert(typeof ext.id === "string" && ext.id.length > 0, "addon has an id");
    assert(typeof ext.name === "string" && ext.name.length > 0, "addon has a name");
    assert(typeof ext.enabled === "boolean", "addon enabled state readable");
  }
}

function testRegistryInfoLookup(): void {
  initExtensionRegistry();
  const list = listExtensions();
  for (const ext of list) {
    const info = getExtensionInfo(ext.id);
    assertEquals(info?.id, ext.id, "getExtensionInfo resolves installed addons");
  }
  assertEquals(getExtensionInfo("does-not-exist@stratus.test"), null, 
    "unknown addon resolves to null");
}

function testSetEnabledUnknownAddonFails(): void {
  initExtensionRegistry();
  void setExtensionEnabled("does-not-exist@stratus.test", false).then((ok) => {
    assert(ok === false, "unknown addon toggle reports failure");
  });
}

function testTopicConstant(): void {
  assertEquals(EXTENSIONS_UPDATED_TOPIC, "stratus.extensions.updated", 
    "registry update topic constant");
}


const PROBE_DIR = "C:\\Users\\Zachary\\Documents\\Project\\browser-dev\\floorp\\tools\\test-fixtures\\activity-probe";

async function testDisableEnableCycle(): Promise<void> {
  initExtensionRegistry();
  const { AddonManager } = ChromeUtils.importESModule(
    "resource://gre/modules/AddonManager.sys.mjs",
  );
  const dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  dir.initWithPath(PROBE_DIR);
  const addon = await AddonManager.installTemporaryAddon(dir);
  assert(addon.id === "activity-probe@stratus.test", "probe installed");
  const okDisable = await setExtensionEnabled(addon.id, false);
  assert(okDisable === true, "disable reports success");
  assert(getExtensionInfo(addon.id)?.enabled === false, "registry reflects disabled");
  const okEnable = await setExtensionEnabled(addon.id, true);
  assert(okEnable === true, "enable reports success");
  assert(getExtensionInfo(addon.id)?.enabled === true, "registry reflects enabled");
  await addon.uninstall();
}

export function runAllTests(): void {
  runTests("extension-activity.test", [
    { name: "registry initializes and lists add-ons", fn: testRegistryInitializesAndLists },
    { name: "registry info lookup resolves installed add-ons", fn: testRegistryInfoLookup },
    { name: "toggle unknown add-on reports failure", fn: testSetEnabledUnknownAddonFails },
    { name: "registry update topic constant", fn: testTopicConstant },
    { name: "enable/disable cycle drives the add-on state", fn: testDisableEnableCycle },
  ]);
}
