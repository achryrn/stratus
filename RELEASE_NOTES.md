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

## Known limitations (documented)

- Byte counts remain zero for HTTP/2 and chunked transfers because
  content length is not exposed on this Gecko revision.
- Renderer-to-os-server loopback fetches hang on this build; privileged
  user interfaces use the pref snapshot bridge instead. External API
  clients are unaffected.
