# Stratus

I develop Stratus, a production-oriented browser built on Mozilla Firefox's
rendering engine through the Floorp overlay architecture. The goals I hold
for this project are a clean, minimalist interface, strong privacy
defaults, transparent insight into what the browser is doing, and a
release pipeline I can verify end to end.

This repository contains the full Stratus customization layer (overlay
modules, chrome UI, settings and new-tab pages), the release tooling, and
the documentation that accompanies each build.

[![License](https://img.shields.io/github/license/achryrn/stratus.svg?style=for-the-badge)](LICENSE)

## What Stratus provides

- Minimalist UI: a deliberately reduced browser chrome with a compact
  toolbar and tab strip, and a quiet steel-on-dark default theme.
- Privacy toolkit: per-mode DNS configuration (DoH for normal browsing,
  off in private windows), per-mode VPN routing (normal and private are
  strictly separate), built-in ad blocking, and a memory saver.
- Transparency: a live network activity overview and extension activity
  reporting in Settings, plus a local integration server (os-server) for
  traffic summaries and VPN configuration.
- Agent control: a remote-control API for automated use and testing.
- Release pipeline: an NSIS installer with verified silent install and
  uninstall flows, auto-update wiring, checksum and signing tooling, and a
  CI release workflow.

Every feature is covered by colocated browser-integrated tests, a host test
suite, and a smoke gate, and I run all three before each release.

## Requirements

The current release pipeline targets Windows 10 or later on x86_64.
macOS and Linux packaging is on the roadmap but not yet published. A
complete picture of platform behavior is inherited from the Firefox
system requirements.

## Install

Download the latest Windows installer from the Releases page. The
installer is built by tools/release/make-installer.ps1 and has been
verified through clean install and uninstall runs.

Verified Windows install flow:

- The installer installs per-user by default (no administrator or UAC)
  to %LOCALAPPDATA%\Programs\Stratus.
- Silent install: stratus-browser-installer.exe /S /D=<dir> (the /D
  target must be the last argument and unquoted).
- Silent uninstall: "<install dir>\Uninstall.exe" /S; this removes the
  install directory, the Start Menu and Desktop shortcuts, and the
  uninstall registration.
- The installed application is stratus.exe with updater.exe alongside;
  auto-update points at the beta channel and is enabled by default.

## Building and testing

Development is orchestrated through Deno tasks:

- deno task feles-build dev - run the browser in development mode with HMR
- deno task feles-build build --phase before-mach - build overlay assets
- deno task feles-build build --phase after-mach - post-build injection
  (requires the upstream Firefox object output)
- deno task feles-build assemble - build production assets and copy the
  portable production overlay (noraneko/) into the runtime
- deno task test - browser-integrated colocated tests
- deno task test:host - host test suite
- deno task test:smoke - smoke gate
- deno task dev-tool - browser inspection CLI (Marionette)

## Documentation

- ARCHITECTURE.md - repository structure and the five-layer model
- RELEASE_NOTES.md - per-version notes
- tools/release/RELEASE_CHECKLIST.md - the pre-release gate I run

## License

Stratus is licensed under the Mozilla Public License 2.0.

Stratus builds on Mozilla Firefox and the Floorp overlay architecture. It
is not affiliated with Mozilla, Mozilla Firefox, or the Floorp project. I
retain upstream license notices below for the components Stratus uses.

### Open-source notices

Stratus uses the following open-source projects:

- Mozilla Firefox - Mozilla Public License 2.0 - Mozilla and contributors
- Noraneko (NyanRus) - Mozilla Public License 2.0 -
  github.com/nyanrus/noraneko-runtime
- Firefox UI Fix (Lepton) - Mozilla Public License 2.0 -
  github.com/black7375/Firefox-UI-Fix
- userChromeCSS Loader - MIT - author Griever
- Paxmod - MIT - github.com/numirias/paxmod

If you maintain one of these components and your attribution is missing or
incorrect, please open an issue.

## Contact

Please use the GitHub Issues page for bug reports and questions.
