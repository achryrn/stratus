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

## Known limitations (documented)

- Byte counts remain zero for HTTP/2 and chunked transfers because
  content length is not exposed on this Gecko revision.
- Renderer-to-os-server loopback fetches hang on this build; privileged
  user interfaces use the pref snapshot bridge instead. External API
  clients are unaffected.
