# Stratus Browser Release Notes

Version 153.0.3 (beta channel) - current dev baseline.

## 153.0.3-beta - Production-readiness milestone (M8)

### UI (M8.11)
- Minimalist default UI: compact toolbar + tab strip, reduced chrome surfaces
  and noise; quiet steel-on-dark minimal theme (stratus-minimal-dark) with
  the design mandate that the UI must be MINIMALIST.
- Built-in theme presets (minimal default / gx / classic) with balanced
  palette tokens; one-surface chrome invariant (all bars share one color).

### Release pipeline (M8.12)
- NSIS installer (per-user default, silent install/uninstall, Start-Menu +
  desktop shortcuts, HKCU/HKLM registration, branded stratus.exe).
- Auto-update wiring: app.update.url (beta channel), updater.exe shipped,
  update checks enabled by default.
- Code-signing + checksum tooling (tools/signing), release workflow script
  tools/release and CI workflow (.github/workflows/release.yml).

### Vision features (M8.13)
- Transparent traffic overview: live Network activity card in Settings
  (requests/bytes, private split, top sites, per-mode attribution) via the
  new stratus.network.snapshot pref bridge; os-server /network/summary + SSE
  events API for external clients.
- Transparent extension activity: per-extension counts surfaced from loadInfo
  attribution (moz-extension principals).
- Built-in per-mode VPN (normal vs private strictly separate): per-mode
  toggles + relay config in Settings; live 'Active in' status; focused-window
  routing via network.proxy.*; os-server /vpn/config API.
- New-tab wallpaper slot (minimal): background types none/random/custom/
  folderPath/floorp, default none.

### Pre-release QA (M8.14)
- Full smoke gate green (fmt/check/lint/tests incl. runtime lint).
- First-run clean-profile screening: default prefs audited (minimal theme,
  privacy tier 'default', per-mode DNS, update wiring, remote token,
  memory saver ON, VPN off, ad block on, blank start page).
- Bare installer install/uninstall verified on Windows (silent, per-user,
  7721 files, registry + shortcuts cleaned on uninstall).
- Cross-cut test sweep green: designs 9/9 (incl. color-consistency 2x
  deterministic), ipprotection 3/3, theme-gx, network-monitor, vpn,
  extension-activity, release modules 1/1 each, host suite 212/212.

## Known limitations (documented)
- Byte counts stay 0 for HTTP/2 / chunked transfers (contentLength not
  exposed on this Gecko revision).
- Renderer-to-os-server loopback fetch hangs on this build; privileged UIs
  use the pref snapshot bridge instead (external API clients unaffected).
