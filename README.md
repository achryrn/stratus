# Stratus Browser

A fully branded, production-quality browser with its own identity — fast, private, and deeply customizable. Built on Mozilla Firefox's rendering engine via the Floorp overlay architecture.

[![License][license-shield]][license-url]

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[license-shield]: https://img.shields.io/github/license/stratus-browser/stratus.svg?style=for-the-badge
[license-url]: https://github.com/stratus-browser/stratus/blob/main/LICENSE

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://stratus-browser.org">
    <img src="https://avatars.githubusercontent.com/u/94953125?s=200&v=4" alt="Logo" width="150" height="150">
  </a>

  <h3 align="center">Stratus Browser</h3>

  <p align="center">
    A fully branded browser with its own identity — fast, private, and deeply customizable. Built on Mozilla Firefox's rendering engine.
    <br />
    <br />
    <a href="https://stratus-browser.org">Official Site</a>
    ・
    <a href="#-download--install">Download</a>
    ・
    <a href="https://blog.stratus-browser.org">Blog & Release Notes</a>
    ・
    <a href="https://docs.stratus-browser.org">Documentation</a>
  </p>
</div>

## 📄 Sponsorship

Stratus Browser is a free and open-source project. If you like Stratus Browser, please consider sponsoring us. Your sponsorship will help us to continue development and pay for the server costs.

- [GitHub Sponsors](https://github.com/sponsors)

<h2> 💕 Special Sponsors </h2>
<div align="left" style="display: flex; flex-wrap: wrap;">
  <a href="https://www.cube-soft.jp/" style="margin: 10px; overflow: hidden; padding: 0px 30px;">
    <img src="https://avatars.githubusercontent.com/u/346808?s=200&v=4" alt="CubeSoft, Inc." width="100" height="100">
    <h4 style="text-align: center;">CubeSoft, Inc.</h4>
  </a>
  <a href="https://1password.com/" style="margin: 10px; overflow: hidden; padding: 0px 30px;">
    <img src="https://avatars.githubusercontent.com/1Password?s=200&v=4" alt="1Password" width="100" height="100">
    <h4 style="text-align: center;">1Password</h4>
  </a>
  <a href="https://signpath.io/" style="margin: 10px; overflow: hidden; padding: 0px 30px;">
    <img src="https://avatars.githubusercontent.com/u/34448643?s=200&v=4" alt="SignPath" width="100" height="100">
    <h4 style="text-align: center;">SignPath</h4>
  </a>
</div>

> Note: The sponsor list above is retained from the upstream Floorp project. It will be replaced as Stratus builds its own sponsorship program.

## ⚡ Get Started

### 💻 Supported Operating Systems & Requirements

Stratus Browser is available for Windows, macOS, and Linux. You can install it by running the installer or by extracting the archive.

#### Windows

- Windows 10 or later. (Windows 7 and 8 are not supported)

- x86_64 CPU architecture. AArch64 is not supported.

- Stratus provides a `.exe` installer.

**Note: Package-manager install options (winget, Scoop) are inherited from the upstream Floorp project until Stratus publishes its own packages.**

#### macOS

- macOS 10.15 or later.

- x86_64 CPU & ARM64 CPU architecture.

**Note: Code signing and notarization for Stratus releases are part of the release pipeline.**

#### Linux

- Debian-based distributions (such as Ubuntu and Linux Mint) and Arch-based distributions (such as Manjaro) are supported.

- x86_64 & AArch64 CPU architecture.

- Stratus Browser Requirements: [Firefox system requirements](https://www.mozilla.org/firefox/system-requirements/)

Supported package managers:

- Tarball (most Linux distributions): https://github.com/stratus-browser/stratus/releases/latest
- AUR bin (Arch-based distributions): https://aur.archlinux.org/packages/floorp-bin/ **Unofficial (upstream)**
- AUR (Arch-based distributions): https://aur.archlinux.org/packages/floorp/ **Unofficial (upstream)**
- SBo bin (Slackware-based distributions): https://slackbuilds.org/repository/15.0/network/floorp-bin/ **Unofficial (upstream)**

### 📥 Download & 📦 Install

You can download the latest version of Stratus Browser from the official website: [Stratus Browser](https://stratus-browser.org/download) or from the [GitHub Releases](https://github.com/stratus-browser/stratus/releases) page. Windows users get a signed-capable NSIS installer (`stratus-browser-installer.exe`) built by the release pipeline (`tools/release/make-installer.ps1`).

**Windows installer (QA-verified flow):**

- Default install is **per-user** (no admin/UAC): `%LOCALAPPDATA%\Programs\Stratus`.
- Silent install: `stratus-browser-installer.exe /S /D=<dir>` (the `/D` target must be the last argument and unquoted).
- Silent uninstall: `"<install dir>\Uninstall.exe" /S` — removes the install directory, the Start-Menu/Desktop shortcuts and the HKCU (and best-effort HKLM) uninstall registration.
- The installed browser binary is `stratus.exe` with `updater.exe` alongside; auto-update is wired through `app.update.url` (beta channel) and enabled by default.
- Pre-release QA checklist: `tools/release/RELEASE_CHECKLIST.md`; per-version notes: `RELEASE_NOTES.md`.

---

## 📖 Documentation

For more detailed information and guidance, check out our [Stratus Documentation](https://docs.stratus-browser.org).

### 📝 License

[Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/)

- Stratus Browser is based on Mozilla Firefox and the Floorp overlay architecture. Stratus Browser is not affiliated with Mozilla, Mozilla Firefox, or the Floorp project.

- Stratus uses Mozilla Firefox's source code and other open-source projects. See [Stratus License Notices](#-Stratus-License-Notices-)

### 📧 Contact

- [Stratus Browser on X (Twitter)](https://twitter.com/)

### 📜 Privacy Policy

- [Stratus Privacy Policy](https://stratus-browser.org/privacy)

### 📜 About Forks

- Stratus Browser is independent of Mozilla Firefox. Stratus is not affiliated with Mozilla or Mozilla Firefox.

- Stratus builds on the Floorp overlay architecture but is developed independently as its own browser project.

---

## 🌟 Contributing

### 🧰 How to Start Development

Stratus's dev workflow is orchestrated by `feles-build` (a Deno task).

To build and run Stratus, follow the [Building section of the documentation](https://docs.stratus-browser.org/docs/building/).

#### Useful commands

- `deno task feles-build stage` (build production assets, run browser in dev mode)
- `deno task feles-build build --phase before-mach` (production assets step)
- `deno task feles-build build --phase after-mach` (post-build injection step)

### 🐛 Reporting Bugs

- If you find a bug, please report it to the [Issues](https://github.com/stratus-browser/stratus/issues) page.

---

## 📄 Stratus License Notices 📄

Stratus utilizes various open-source projects. Below is a comprehensive list of the open-source projects used in Stratus.

Please note that while some of the software listed below is not included in Stratus itself, it is instead downloaded from the internet. Additionally, Stratus provides a list of recommended add-ons for users to install.

### 🦊 Mozilla Firefox

- [Mozilla Firefox](https://www.mozilla.org/en-US/firefox/new/)
- [Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/)
- Authors: [Mozilla & Contributors](https://www.mozilla.org/credits/)

### 🐈 NyanRus Noraneko (Testhead of Floorp 12)

- [Noraneko](https://github.com/nyanrus/noraneko-runtime)
- [Mozilla Public License 2.0](https://github.com/nyanrus/noraneko-runtime/blob/main/LICENSE)
- Author: [NyanRus](https://github.com/nyanrus)

### 🎨 Firefox UI FIX (Lepton)

- [Firefox UI FIX (Lepton)](https://github.com/black7375/Firefox-UI-Fix)
- [Mozilla Public License 2.0](https://github.com/black7375/Firefox-UI-Fix/blob/master/LICENSE)
- Author: [black7375](https://github.com/black7375)

### 📦 userChromeCSS Loader

- [userChromeCSS Loader](floorp/browser/base/content/browser-chromeCSS.js)
- [MIT](floorp/browser/base/content/browser-chromeCSS.js)
- Author: Griever

Notice: if you are a developer of "userChromeCSS Loader", please contact us so that we can add your name and website to the list.

### 📦 Paxmod

- [Paxmod](https://github.com/numirias/paxmod)
- [MIT](https://github.com/numirias/paxmod/blob/master/LICENSE)
- Author: [numirias](https://github.com/numirias/)

Notice: If you are a maintainer of any listed component and your name or license is missing or incorrect, please contact us.

### 📦 Fushra Pulse

- [Fushra Pulse](https://pulsebrowser.app/)
- [Mozilla Public License 2.0](https://github.com/pulse-browser/browser/blob/main/LICENSE)
- Author: [Fushra](https://github.com/Fushra)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Floorp-Projects/Floorp&type=date&legend=top-left)](https://www.star-history.com/#Floorp-Projects/Floorp&type=date&legend=top-left)
