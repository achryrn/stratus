# Stratus Release Notes

Version: 153.0.3 (beta channel), current development baseline.

## 153.0.3-beta - Production-readiness milestone (M8)

This release brings Stratus to a state I consider production-ready: a
minimalist user interface, a verified release pipeline, the vision
features, and a completed pre-release QA pass. Below is a summary of what
went into each milestone.

### User interface (M8.11)

- A minimalist default UI: compact toolbar and tab strip, reduced chrome
  surfaces, and a quiet steel-on-dark default theme. The design mandate
  for this project is that the UI must be MINIMALIST.
- Theme presets (minimal default, gx, classic) with balanced palette
  tokens; all chrome bars share one color (the one-surface invariant).

### Release pipeline (M8.12)

- An NSIS installer with a per-user default, silent install and uninstall
  support, Start Menu and Desktop shortcuts, HKCU (with best-effort HKLM)
  registration, and the branded stratus.exe binary.
- Auto-update wiring: app.update.url on the beta channel, updater.exe
  shipped, update checks enabled by default.
- Code-signing and checksum tooling (tools/signing), a release workflow
  script (tools/release), and a CI release workflow.

### Vision features (M8.13)

- Transparent traffic overview: a live Network activity card in Settings
  (requests, bytes, private split, top sites, per-mode attribution) that
  reads the new stratus.network.snapshot pref bridge, plus the os-server
  /network/summary and SSE events API for external clients.
- Transparent extension activity: per-extension counts derived from load
  info attribution (moz-extension principals).
- A built-in per-mode VPN with normal and private modes kept strictly
  separate: per-mode toggles and relay configuration in Settings, a live
  active-mode status, focused-window routing via network.proxy.*, and the
  os-server /vpn/config API.
- A new-tab wallpaper slot with background types none, random, custom,
  folder path, and floorp; the default is none, preserving the minimalist
  UI.

### Pre-release QA (M8.14)

- The full smoke gate is green (formatting, type checks, runtime lint,
  and tests).
- I audited default preferences on a first-run clean profile: minimal
  theme, privacy tier 'default', per-mode DNS, update wiring, agent token
  generation, memory saver on, VPN off, ad blocking on, and a blank start
  page.
- I verified a bare installer install and uninstall on Windows (silent,
  per-user, 7,721 files installed, and clean removal of files, registry
  entries, and shortcuts on uninstall).
- The cross-cut test sweep is green: designs 9/9 (including the
  color-consistency matrix twice), IP Protection 3/3, and the theme,
  network monitor, VPN, extension activity, and release module suites
  1/1 each; the host suite passes 212/212.

## M9 - Production overlay assembly and rebrand phase (in progress)

### 9.1 The packaged product now ships the Stratus chrome (root-cause fix)

I found that the release stage and installer carried the Stratus overlay only
as a symlink farm (noraneko-devdir) pointing into the repository, and the
installer explicitly excluded that directory. The installed and copied
product therefore ran the stock Firefox chrome with no Stratus features at
all, while the development build showed them. That is now fixed:

- Injector.run(production) copies the compiled overlay (content, startup,
  skin, legal, resource, all pages) as real files into noraneko/ with no
  symlinks, and rewrites chrome.manifest so the production wiring is the
  only nora registration (setChromeManifestEntry).
- New command: deno task feles-build assemble (production assets plus a
  portable overlay copy).
- Verified: the production tree boots with all nora components,
  StratusBranding prefs applied, memory saver, remote control, OS API,
  VPN toggle, network monitor, extension activity, designs, workspaces,
  and the rest of the feature set loaded from the compiled bundle.
- Release artifacts rebuilt from the assembled tree: installer 137.6 MB,
  re-signed (Authenticode Valid), updater manifest and checksums refreshed.
- Host suite 213/213 green; smoke gate 6/6 green.

### 9.2 Upcoming: Opera GX-inspired visual rebrand

Design direction requested by the maintainer: move the chrome away from the
Firefox look toward an Opera GX-inspired dark gaming aesthetic (matte black
chrome, luminous accent palette, high-contrast surfaces). This is a new
design tier in the themes engine, applied as the default, and will be
tracked with the same gate per slice.

### 9.3 Known limitation carried forward

The prebuilt runtime binary is still Floorp-branded at the binary level
(application.ini, version resources, floorp.exe name, updater URLs). Full
removal requires the Phase 2.5 runtime rebuild against the Gecko toolchain,
which is out of scope for the local environment.
## M9.4 - GX default design and Stratus chrome

I changed the fresh-profile defaults so the browser now selects the Stratus
visual design instead of the stock Proton or legacy Lepton designs. The GX
tier is the default theme: matte black surfaces, neon red accent, cyan loading
state, purple gradient separators, rounded tabs, and a luminous active-tab
underline. I also added a focused-urlbar accent ring and GX tab-strip glow.

Evidence for this slice:

- Live browser probe: design is stratus, theme is gx, accent is #ff1e00,
  navigation background is rgb(13, 7, 8), tab radius is 9px, and the active
  tab underline is a linear gradient.
- Design browser suite: 9/9 passed.
- Theme-gx suite: passed.
- Host suite: 213/213 passed.
- Smoke gate: 6/6 passed before this default-design slice.
- Production overlay was reassembled and the installer was rebuilt, signed,
  and hash-verified after the change.

## M10 Runtime branding source recovered

I recovered the pinned Floorp Runtime source at daily-998 (commit 2d38da4d11be1e0e615f4ddd785ad5e77c95e18d) from the upstream repository. I updated the runtime unofficial branding inputs to Stratus, including the application name, vendor, profile, remoting name, user agent name, locale brand strings, and debug build branding selector. A full Gecko binary build is still required before these source changes can appear in the installer.

## M10.1 Gecko build toolchain recovered

I assembled the full Windows Gecko toolchain locally:

- MozillaBuild 4.2.1 at C:\mozilla-build
- Rust MSVC 1.98.1 with cargo, rustup, and cbindgen
- LLVM/Clang 20.1.8 providing clang-cl
- NASM 2.16.03, GNU Make 4.4.1, Python 3.12
- Windows App SDK 2.2 redistributable DLLs (hash-verified against the pinned
  taskgraph sha256)
- windows 0.62.2 Rust crate source for the FFI bindings build

I applied the upstream Noraneko patches, set the implied runtime values to
Stratus (vendor, profile, application name, remoting name), and the runtime
now configures cleanly.

The full optimized Gecko build needs more virtual memory than this machine can
provide: the gkrust Rust core alone peaks near the system commit ceiling, so a
local Windows build cannot complete the link. I moved the runtime build to the
upstream CI pipeline on GitHub Actions, which cross-compiles the Windows build
on hosted Linux runners with adequate virtual memory. I pushed the runtime
source snapshot (daily-998 with the Stratus patches applied) to the
stratus-runtime-0.2.0 branch of the repository and dispatch the Windows build
workflow from it. The finished artifact is pushed back to the
stratus-runtime-build-output branch. Once that branch appears, the produced
binaries replace the staged runtime, the installer is rebuilt and signed, and
update manifests and checksums are regenerated.

## M10.2 Runtime swap completed and installer re-signed

The runtime rebuild landed. The rebuilt Windows runtime (built on the hosted
CI runners from the stratus-runtime-0.2.0 branch, commit 2242ae33382c6ded6a285dd44f8d8b3a1f301596, tree d0f7e3e592fcf6ac15cc7f348137722b8cba7025) replaced the staged runtime, and I rewrote floorp-runtime.lock.json so the pinned source, material closure, and windows artifact record match what is actually installed. The lock file still parses cleanly with the runtime lock validator.

A release-blocking defect surfaced during the final browser-integrated sweep:
the remote-control test browser never started the agent-control server, so the
wire contract could not be exercised. Root cause: the server is started by the
production startup chain (NoranekoStartup), which only runs on a production
boot, while the colocated test browser boots through the test bootstrap in the
bridge. I fixed it in the bootstrap: the test boot now runs a production-stance
initRemoteControl hook before the test suite starts, so the server is already
listening with a boot-generated bearer token, exactly like a production boot.
I also added a listen retry guard to the server with backoff and explicit
console diagnostics, so a transient socket failure at boot no longer leaves the
control surface silently down.

Final verification on the rebuilt runtime:

- Browser-integrated suite: 152 passed, 0 failed (includes the remote-control,
  designs 9/9, theme-gx, network-monitor, vpn, ipprotection, extension-activity,
  and release-provenance tests).
- Host suite: 213/213 passed.
- Smoke gate: 6/6 passed.
- Installer: rebuilt from a verified production stage (extraction checks for
  floorp.exe and the noraneko overlay passed in CI), reassembled locally,
  Authenticode-signed with the Stratus certificate and RFC3161 timestamped,
  and hash-verified against the CI manifest.
- Update manifest (update.xml), update.json sidecar, and checksums.txt were
  regenerated from the signed installer; the installer is published for the
  beta updater channel.
- Visual comparison: I captured live screenshots of the main chrome, the new
  tab page, and the settings page and audited the pixels against the GX design
  spec (matte black surfaces, neon red #ff1e00 accent, cyan #00c8ff loading
  state, purple #b04cff separators, no Firefox or Floorp branding in the
  shipped surface). The in-browser design suite (9/9) does the same check
  against computed styles on the shipped chrome.

Credential and limit notes, kept honest: the browser is signed with a
self-signed certificate, so Windows SmartScreen still shows an untrusted
publisher warning when the installer is run; the updater URL points at the
stratus-browser.org domain, which requires external DNS and hosting to go live.
The bytes-zero limitation for HTTP/2 and chunked transfers is unchanged.

## Known limitations (documented)

- Byte counts remain zero for HTTP/2 and chunked transfers because
  content length is not exposed on this Gecko revision.
- Renderer-to-os-server loopback fetches hang on this build; privileged
  user interfaces use the pref snapshot bridge instead. External API
  clients are unaffected.
