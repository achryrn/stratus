# Stratus Pre-Release Checklist

One gate per release. Every item must be green before shipping a build.
Last full pass: M8.14 (153.0.3-beta), all green.

## A. Build & bundle
- [x] Overlay + pages production build succeeds (feles-build build --phase before-mach).
- [x] Production bundle carries compiled settings/newtab pages + branding.
- [x] app.update.url points at the release server; channel + update-enabled set.
- [x] package/installer assembled by tools/release/make-installer.ps1 (checksums too).

## B. Installer (Windows, NSIS)
- [x] Installer builds with makensis 3.09+ from the staged bundle.
- [x] Fresh-machine (bare) install test: silent /S /D= to a clean dir, no UAC (per-user).
- [x] Installed layout: stratus.exe (renamed), updater.exe, browser/, application.ini.
- [x] Registration: HKCU Uninstall\Stratus entry (DisplayVersion), Start-Menu + Desktop shortcuts.
- [x] Uninstall test: silent /S removes directory, registry key and shortcuts.

## C. First-run clean profile (default prefs audit)
- [x] stratus.theme.preset default: minimal (minimalist mandate).
- [x] stratus.privacy.tier default 'default'; DoH per-mode (normal mozilla / private off).
- [x] stratus.networkMonitor.enabled on; stratus.adblock.enabled on.
- [x] stratus.vpn.config default off (both modes), activeMode empty.
- [x] stratus.memory.saver ON when unset; agent-control token generated (32 hex).
- [x] Navigation works with no welcome/firstrun tabs (about:blank), console clean.

## D. Feature verification (vision + UI)
- [x] Minimalist UI live: compact chrome, minimal theme, all bars one color
      (color-consistency matrix green x2).
- [x] Traffic overview: /network/summary + settings card live counts (pref bridge).
- [x] VPN: per-mode toggles + relay config set network.proxy.* and activeMode live.
- [x] Newtab: wallpaper slot present, default none.
- [x] Agent control + memory saver reachable and functional.

## E. Tests
- [x] test:smoke green (includes runtime lint).
- [x] test:host green (N/N).
- [x] Browser colocated sweep green: designs 9/9, ipprotection 3/3, theme-gx, network-monitor,
      vpn, extension-activity, release 1/1 each.
- [x] test:release (installer contract) green.

## F. Docs
- [x] RELEASE_NOTES.md current for the version.
- [x] README install section current (installer flags, per-user default, update wiring).
- [x] M8_OPERAGX_VISION_PLANNING.md milestone entries updated.
