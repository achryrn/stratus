// Host-layer regression tests for the M8.12 release pipeline.
// @no-browser — pure file-contract checks (deno task test:host).

import { assert } from "@std/assert";

const ROOT = new URL("../../", import.meta.url);
const read = (p: string): string => Deno.readTextFileSync(new URL(p, ROOT));
const exists = (p: string): boolean => { try { Deno.statSync(new URL(p, ROOT)); return true; } catch { return false; } };

Deno.test("installer script is a complete NSIS contract", () => {
  const nsi = read("installer/stratus.nsi");
  for (const token of [
    "OutFile \"stratus-browser-installer.exe\"",
    "WriteUninstaller",
    "SectionEnd",
    "File /oname=stratus.exe",
    "File /r",
    "RequestExecutionLevel user",
    "UninstallString",
  ]) {
    assert(nsi.includes(token), "stratus.nsi must contain: " + token);
  }
  assert(!nsi.includes("Floorp") || nsi.includes("Stratus"), "no Floorp placeholder branding");
  if (exists("_dist/bin/floorp/updater.exe")) {
    const dist = read("_dist/bin/floorp/updater.exe");
    assert(dist.length > 0, "dist updater.exe present for packaging");
  }
});

Deno.test("release scripts exist and share the artifact contract", () => {
  for (const f of [
    "tools/release/make-installer.ps1",
    "tools/release/make-checksums.ps1",
    "tools/release/make-update-manifest.ps1",
    ".github/workflows/release.yml",
    "tools/release/release-workflow.yml",
    "tools/signing/sign.ps1",
    "tools/signing/verify.ps1",
  ]) {
    assert(exists(f), "release file missing: " + f);
  }
  const checksums = read("tools/release/make-checksums.ps1");
  assert(checksums.includes("SHA256"), "checksums use SHA256");
  const manifest = read("tools/release/make-update-manifest.ps1");
  assert(manifest.includes("SHA512"), "updater manifest uses SHA512 (balrog contract)");
  assert(manifest.includes("<patch type=\"complete\""), "manifest emits complete patches");
  const sign = read("tools/signing/sign.ps1");
  assert(sign.includes("/fd SHA256"), "signing uses SHA256 digest");
  assert(sign.includes("CERTIFICATE_BASE64"), "signing supports CI cert secret");
  const wf = read("tools/release/release-workflow.yml");
  assert(wf.includes("tags: [\"v*\"]"), "workflow triggers on version tags");
  assert(wf.includes("feles-build build"), "workflow runs the production build");
});

Deno.test("branding wires the auto-update endpoint", () => {
  const branding = read("browser-features/modules/modules/branding/StratusBranding.sys.mts");
  assert(branding.includes("app.update.url"), "app.update.url is set");
  assert(branding.includes("UPDATE_BASE_URL"), "update base URL is exported");
  assert(branding.includes("app.update.enabled"), "auto-update is enabled by default");
});
