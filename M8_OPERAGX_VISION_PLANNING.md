# M8 — Opera GX Vision, Production Readiness & Privacy Telemetry (Planning)

**Date:** 2026-08-09 (session ver)
**Status:** Assessment + Research Complete — Implementation Ready for Kickoff
**Branch:** `stratus-main`
**Goal:** Turn the current Stratus development browser into a stable, user-ready,
own-brand browser with an **Opera GX-grade look**, **transparent traffic overview**,
**transparent extension activity**, a **built-in VPN that is strictly separated
between normal and private mode**, and an **opt-in "trusted-site actions"**
allowlist (force fullscreen / window-hopping for whitelisted sites) — while
keeping the browser deeply **modifiable**.

---

## Part 0 — Executive Summary

Stratus is a real, working Firefox fork. It boots, navigates, opens private
windows, and passes its unit suites. What it is **not yet** is a *shipped*
product: the runtime is still branded "Floorp Daylight", the smoke gate is red,
several cosmetic/l10n defects exist, and the requested headline features
(traffic overview, extension activity, per-mode VPN, site-action allowlist,
Opera GX look) are not implemented.

This document is the single source of truth for the next milestone (M8). It
contains:

1. **Live assessment** — what exists and what I verified by actually running
   the browser (evidence-based, date-stamped).
2. **Research** — what a production user-ready Firefox fork requires, with
   sources.
3. **Design spec** — the Opera GX visual direction mapped onto Stratus's own
   design tokens.
4. **Feature specifications** — traffic overview, extension activity, per-mode
   VPN, trusted-site actions, modifiability. Each with implementation approach,
   files, prefs, tests.
5. **Release gate checklist** — exactly what must be green before any user
   installs a build.

---

## Part 1 — Current State Assessment (verified live, 2026-08-09)

### 1.1 What Stratus is today

| Layer | Technology | Evidence |
|---|---|---|
| Engine | Gecko ESR **153.0.3.3** ("daily-998") via Floorp Noraneko overlay | Services.appinfo.version -> 153.0.3 live |
| Browser chrome | SolidJS -> XUL via @nora/solid-xul | browser-features/chrome/common/* |
| Pages (settings/newtab/welcome/...) | React + Tailwind | browser-features/pages-* |
| Build | Deno 2.9.4 + feles-build (Vite, tsdown, injector, patcher) | tools/feles-build.ts, deno.json |
| Automation | Marionette-based dev-tool CLI (start/status/eval/console/navigate/screenshot/dom) | tools/dev-tool.ts |
| Local control surface | os-server HTTP API (tabs/history/downloads/workspaces/events) | browser-features/modules/modules/os-server/ |
| VPN-related | ipprotection gate module wrapping Mozilla IP Protection pref | browser-features/modules/modules/ipprotection/ |
| Privacy-ish | Private container, telemetry off in override.ini | static/gecko/pref/override.ini |

**29 chrome features** are auto-discovered (workspaces, split-view, vertical
tabs, zen mode, mouse gesture, command palette, panel sidebar, tab sleep
exclusion, PWA, private container, hub, external browser, ...). Feature
auto-discovery means a new feature = a new folder under
browser-features/chrome/common/<name>/ with an index.ts.

### 1.2 Live test evidence (this session)

I launched the dev environment, exercised the browser like a user, and ran the
official suites:

| Check | Result |
|---|---|
| dev-tool start (browser + 9 Vite dev servers) | OK — Browser ready, Marionette on port 2828 |
| dev-tool status | OK — Connected; 3 tabs; active tab "Example Domain" |
| Navigate to example.com (content context) | OK — Loaded, h1 present |
| Navigate to en.wikipedia.org | OK — Title "Wikipedia — Floorp Daylight" |
| Open private window | OK — OpenBrowserWindow({private:true}) works |
| deno task test:host | OK — **209 passed / 0 failed (7s)** |
| deno task test:smoke | FAIL — **RED** — 2 steps fail (see 1.4) |
| Console error audit | WARN — 2 classes of console errors (see 1.3) |
| Screenshot | OK — 165 KB PNG captured (test_shot.png) |

### 1.3 Defects found (user-visible or gate-breaking)

1. **Branding not applied to runtime.** Window title is "... — Floorp Daylight".
   M2.5 (runtime fork + rebrand) is planned but not done. Required for any
   public/"own brand" identity.
2. **Fluent/l10n errors** (error level, repeat on every window open):
   "[fluent] Missing message in locale en-US: workspaces-toolbar-button" and
   "profile-manager-button". Verified in DOM: the buttons **do** render with
   label attributes ("New Workspace (0)", "Profile Manager"), so this is a
   localization fallback gap, not a broken button — but it spams the error
   console and would break localization entirely. Fix: add the two Fluent
   messages to i18n/en-US (and ja-JP) or drop the data-l10n-id attributes.
3. **Upstream warnings**: Window.fullScreen attribute is deprecated
   (browser-customtitlebar.js — adopt the replacement API at rebase time) and
   an "unreachable code after return statement" in patched SearchService.
4. **Smoke gate is RED**, which blocks CI:
   - deno check fails because
     browser-features/chrome/common/split-view/ACCESSIBILITY_AUDIT_M4_P2_6.ts:59
     contains "*/" inside a doc comment (JSX snippet), terminating the block
     comment. (Same pattern may exist in the workspaces audit.) -> rename audit
     docs to .md or escape the "*/".
   - deno lint fails with **21 findings**, all in test files:
     designs/test/css.test.ts:329 (await in sync fn),
     split-view/test/split-view-integration.test.ts (unused vars,
     prefer-const x several),
     split-view/components/test/split-view-tab-drop.test.ts:380 (unused fn).
5. **Security-adjacent settings in override.ini**: xpinstall.signatures.required
   = false is fine for local dev but MUST be locked true in production builds.
   Telemetry/datareporting/studies are already off (good, keep).
6. **Stray artifacts**: gittest_tmp/ and root screenshots (screen.png,
   stratus_screen.png) in browser-dev/ should move out of the repo or into
   _dist/.

### 1.4 What is solid (keep building on)

- 5-layer architecture is clean; feature auto-discovery scales.
- 209 host tests + colocated browser-integrated tests (workspaces, split-view,
  vertical tabs, command palette, ipprotection gate) plus WCAG AA audits.
- dev-tool is an unusually good harness for **actually using** the browser:
  status/eval/console/navigate/dom/screenshot against a real instance.
- os-server gives already-tested HTTP + SSE routes — a ready backbone for
  traffic/extension telemetry and for "mods" to consume.
- Pref-driven config with io-ts codecs (M3) means new feature settings slot in
  with migration support.

---

## Part 2 — Research: Making a Firefox Fork Production- & User-Ready

### 2.1 The non-negotiables (sources: Mozilla ESR release process,
mozilla.github.io/policy-templates, Floorp/Noraneko practice)

| Area | Requirement | Stratus status |
|---|---|---|
| **Security updates** | Rebase onto every Firefox ESR security release. Forks that drift get pwned. | WARN — pinned to ESR 153.0.3.3 daily; no rebase cadence defined -> define one (1 week after upstream) |
| **Code signing** | Windows: EV/OV cert + timestamping, or SmartScreen warnings destroy adoption. macOS: Developer ID + notarization. | PLANNED in RELEASE_PLANNING (not done) |
| **Installer** | NSIS/WiX for Windows, pkg/dmg for macOS, tarball/AUR/SBo for Linux; silent + per-user install; uninstaller; upgrade path. | PLANNED (static/installers exists, empty) |
| **Updater** | Own update server + updater.exe (already shipped in _dist) + app.update.url override; staged rollout; rollback. | WARN — updater.exe present; update.xml generator tested; endpoint not configured |
| **Crash reporting** | Configure crash reporter (own endpoint or Mozilla's) with user consent. | NOT CONFIGURED |
| **Telemetry** | Telemetry OFF by default is a selling point (already done). No Mozilla/Floorp pings. | OK — off |
| **Extension safety** | xpinstall.signatures.required TRUE in prod; curated addon list. | FAIL — dev setting leaked into override.ini |
| **Branding/legal** | Remove Firefox/Floorp trademarks from user-facing UI; MPL-2.0 notices preserved; about: dialog, icon, UA string. | FAIL — runtime still Floorp-branded (M2.5) |
| **QA gates** | Unit (209 OK), browser-integrated (OK but see smoke gate), smoke (FAIL lint/type), performance baselines, manual matrix (Win/mac/Linux, install/uninstall/upgrade, private mode, extensions, kiosk). | WARN — smoke gate must be fixed first |
| **Beta pipeline** | Beta channel users get auto-updates; staged rollout %; feedback path. | PLANNED |

Reference model to copy: **Floorp's own release loop** (this repo's ancestor)
and **Firefox Enterprise Policies** as the safe-defaults taxonomy. Note: the
Firefox policies list has **no fullscreen allowlist policy** — the "force
fullscreen for specific sites" feature must be built by us (Part 4.4).

### 2.2 Key Firefox mechanisms this project will build on (sources: MDN,
Firefox source, local runtime)

- **Per-request attribution**: http-on-modify-request /
  http-on-examine-response observers give the channel's loadInfo ->
  triggeringPrincipal (extension = moz-extension://<uuid>/), and
  loadInfo.originAttributes.privateBrowsingId (private vs normal). This is
  the linchpin for *both* traffic overview and extension activity — and for
  per-mode VPN routing.
- **Per-mode proxying**: a custom nsIProtocolProxyFilter receives nsILoadInfo
  and can return different proxy info depending on
  originAttributes.privateBrowsingId. -> VPN-per-mode without any Gecko
  patch (see 3.3).
- **Fullscreen gesture requirement**: full-screen-api.allow-trusted-requests-only
  (default true) blocks no-gesture requestFullscreen(). There is **no
  per-origin policy**. -> requires a small Gecko patch in the fork (see 3.4).
- **Window Management API** (MDN: "place windows on each screen", multi-screen
  fullscreen, permission-gated): controlled by dom.window-management and the
  window-management permission, grantable per-origin via Services.perms. This
  is the "window hopping" enabler for trusted sites. (Verify exact pref name/
  permission in the _dist runtime at implementation time.)
- **Mozilla IP Protection** (browser.ipProtection.enabled): OHTTP proxy for
  select traffic; already wrapped by FloorpIPProtectionGate. This is **not** a
  full VPN — it complements, doesn't replace, the per-mode VPN.

### 2.3 Opera GX — look-and-feel reference (sources: opera.com/gx,
opera.com/gx/features)

Opera GX's identity that our "GX mode" should reproduce:

| GX element | What it is | Stratus translation |
|---|---|---|
| Dark neon theme | Near-black chrome, **neon red #FF1E00** & **cyan #00C8FF** accents, magenta-purple gradient | --stratus-accent variants + "GX Dark" theme template (M7 infra) |
| GX Control | Sidebar with **live CPU/RAM/Network gauges** + per-tab limiters | Our **traffic overview** panel + gauges (Part 3.1) — the same UX |
| Hot Tabs Killer | Kill resource-hungry tabs from a list | Built on traffic/energy telemetry panel |
| GX Corner | Games/news corner widget | Optional later; panel-sidebar + newtab widget slot |
| Integrated Twitch/Discord | Sidebar social panels | Architecture already has panel-sidebar + hub — support third-party panels via os-server |
| Mods / personalization | CSS/UI mods, accent picker, abstract wallpapers, "limit network to X MB/s" | Map to M5 mod platform + M7 theme studio; add wallpaper slot in newtab |
| Gaming fonts/geometry | Condensed display font ("Nexa"-style), chunky rounded tabs, glossy accents | M1 typography: add condensed display face; tab radius/gap tokens already exist |
| Force dark pages | Per-site "force dark" | Rely on existing dark-mode tooling; expose per-site toggle in the trusted-site panel |

Constraint: we build **"Opera GX-inspired"**, not a clone — Stratus keeps its
own name/identity (M2.5 branding) with a "GX" aesthetic theme pack. Opera's
proprietary parts (their VPN service, Flow, Twitch panels, GX Corner content)
are not copied; we re-implement the *patterns* (per-mode VPN proxy, telemetry
panel, sidebar integrations) with our own service/UI.

---

## Part 3 — Product Specification: headline features

### 3.1 Transparent traffic overview (GX-Control style)

**UX**: sidebar panel "Network" showing per-tab live requests/s + MB/s,
per-site traffic in session, per-tab resource list; kill/limit actions;
clear-per-session. Data stays local (never uploaded).

**Implementation (no Gecko patch needed)**:
1. New ESM module
   browser-features/modules/modules/network-monitor/NetworkMonitor.sys.mts:
   - Services.obs listeners on http-on-modify-request and
     http-on-examine-response (and http-on-examine-merged-response).
   - Key by tab (browserId/innerWindowId from loadInfo) + host; count requests,
     sum channel.contentLength and/or listen to nsIChannel.onProgress for byte
     totals.
   - Attribute extension/principal via loadInfo.triggeringPrincipal (feeds 3.2).
   - Expose a session-scoped ring buffer + live totals to the chrome layer and
     to os-server (GET /network/summary, SSE /network/events).
2. Chrome feature browser-features/chrome/common/network-monitor/ (SolidJS):
   live gauge bars in the sidebar; per-tab rows; actions.
3. Settings page section (React) "Privacy & Traffic": toggles, data retention
   (session-only), per-site blocklist.
4. Tests: colocated test/networkMonitor.test.ts — observer fires on real
   navigation, counts > 0, attribution correct, private vs normal buckets.

### 3.2 Transparent extension activity

**UX**: sidebar/panel listing installed extensions with live activity (requests,
bytes, recently-accessed origins, last active time); "what did this extension
do" per site; disable from the panel.

**Implementation**:
- AddonManager.addAddonListener for install/enable/disable/uninstall events.
- Activity attribution reuses the traffic monitor: when
  loadInfo.triggeringPrincipal is moz-extension://<uuid>, resolve uuid -> addon
  via AddonManager.getAddonByID.
- Panel = chrome feature chrome/common/extension-activity/; hook into new
  tab/settings.
- This also feeds M5 (dev platform) and M6 (privacy center) — schedule M8.2
  before M6 so the privacy score has real data.

### 3.3 Built-in VPN — strictly separated normal vs private mode

**Requirement**: independent toggles/state: *"VPN on in private mode does NOT
apply to the normal browser mode"* (and vice versa). Per-mode kill switch.

**Implementation (proxy tunnel, Opera-style, no helper daemon for v1)**:
1. Config prefs (JSON, io-ts codec like floorp.design.configs):
   - stratus.vpn.config = { vpnEnabled:{normal:false, private:false},
     server:{host,port,type:"socks5"|"https",auth}, location:"auto" }
   - stratus.vpn.activeMode reflects last-applied mode.
2. ESM module modules/modules/vpn/VpnManager.sys.mts:
   - Registers an nsIProtocolProxyFilter; in apply() inspect
     loadInfo.originAttributes.privateBrowsingId -> non-private VPN proxy or
     private VPN proxy or direct. This gives **true per-mode separation at the
     request level** (no global pref swapping, no crossover).
   - Bypass rules (localhost, intranet, update endpoints) always direct.
   - Compatible with privacy.clearOnShutdown, resistFingerprinting, DoH
     (network.trr — keep TRR independent; document interplay).
3. UI in Settings -> VPN: two clearly separated cards ("Normal window: OFF/ON",
   "Private window: OFF/ON"), region selector, kill switch; toolbar toggle for
   the *active* window's mode only.
4. Optional Phase 2: real tunnel client (WireGuard/OpenVPN helper) kept behind
   the same per-mode decision; OHTTP/IP Protection (existing ipprotection)
   continues to complement but never auto-enables with the VPN.
5. Tests: proxy filter unit tests (private/normal/always-direct), settings
   round-trip, live check GET https://api.ipify.org diff normal vs private in
   the browser-integrated suite.

### 3.4 Trusted-site actions allowlist ("spoofing" for certain sites)

**Requirement**: a curated set of sites may force browser behaviors that normal
sites cannot: **force fullscreen without user gesture**, **window-hopping**
(move/maximize the browser window across monitors via the Window Management
API), plus optional pointer-lock/audio/notification grants. Everything else
keeps default security behavior. UI-visible, reversible, per-site, opt-in list
("Allowed to take control", default empty).

**Security posture**: this is a *capability allowlist*, not "allow any site to
do anything". Documented in Settings -> Privacy -> "Sites that can control the
window". Empty by default.

**Implementation**:
1. Pref stratus.permissions.trustedSites (JSON array of
   {pattern:"*.example.com", actions:["fullscreen","window-management",
   "pointer-lock","audio","notifications"]}). Patterns matched with
   MatchPattern/WildcardToRegExp (already used by WebExtensions).
2. **No-patch grants** (Services.perms at startup + on change):
   - window-management for allowlisted origins (enables "window hopping" +
     per-screen fullscreen choice).
   - notifications/audio autoplay if listed.
3. **Gecko patch** for no-gesture fullscreen/pointer-lock:
   - Add a stratus.permissions.trustedSites-aware check in the fork's
     dom/base fullscreen path (allow RequestFullscreen() without trusted
     gesture when origin is allowlisted) and the pointer-lock gate.
   - Ships in tools/patches/ (mirrors existing patch workflow; ~1 patch).
4. UI editor: Settings -> Privacy -> trusted sites (add/remove, action toggles).
5. Enforcement: trusted-site action grants do **not** cross into private mode
   unless separately enabled (consistent with the VPN separation requirement).
6. Tests: browser-integrated suite — allowlisted origin can enter fullscreen
   without gesture; non-listed origin still requires gesture;
   window-management permission granted only for allowlisted origin; private
   mode unaffected.

### 3.5 "Our own modifiable browser" — the platform story

Already strong: os-server HTTP/SSE API, WebExtensions (M5), theme studio (M7),
prefs system (M3). M8 adds:
- Traffic/extension APIs exposed to mods via os-server (read-only) and to
  WebExtensions via a Stratus-specific stratus.* namespace (behind permission).
- Uplift the two existing "mod" seams: newtab widget slots + sidebar panels, so
  "GX mods" (themes + panels) are installable without touching core.
- Document the "mod developer" flow (in docs/development/).

### 3.6 Custom DNS & resolvers

**UX**: Settings -> Network -> "DNS" with provider presets (OS default / Mozilla
DoH / Cloudflare / custom URL), a strictness slider (off / fallback / strict),
and a resolver test button ("Test DNS: resolve example.com"). Private windows
can use a different resolver than normal windows (per-mode, like the VPN).

**Implementation**:
- Prefs surfaced in Settings UI:
  - network.trr.mode (0 = off, 2 = fallback, 3 = strict)
  - network.trr.uri / network.trr.custom_uri (custom provider URL)
  - network.trr.default_provider_uri (Mozilla provider)
  - stratus.dns.mode JSON mirror for per-mode resolver (normal / private)
- Resolver check uses Services.dns.resolve + a fetch to a fixed probe host.
- Tests: with DoH strict + custom URI, resolve a hostname and assert the
  resolver answered (not OS cache); mode=3 with an unreachable provider fails
  closed (no fallback leak); private window uses its configured resolver.

### 3.7 Built-in bypass of ISP-blocked sites

**Requirement (user-stated, incl. test fixture)**: the browser must be able to
reach sites blocked at the ISP level — DNS-poisoned and/or SNI-blocked — e.g.
adult sites such as pornhub.com in regions where they are blocked. Test with
known-blocked domains at the *resolution and connection* level.

**How ISP blocks work and the bypass stack**:
1. **DNS poisoning** -> solved by DoH (3.6): resolution no longer goes through
   the ISP resolver.
2. **SNI/TLS blocking** -> solved by ECH (Encrypted Client Hello): the server
   name is hidden inside the TLS handshake. Firefox ships ECH support; prefs:
   network.dns.echconfig.enabled, network.dns.use_https_rr_as_altsvc (ECH
   requires DoH; verify exact pref set in _dist at implementation time).
3. **IP/port blocking** at the ISP edge -> only a VPN or proxy exits the ISP
   network: the per-mode VPN (3.3) is the final layer. With "VPN on for
   private windows", a user can use a private window for bypassed browsing
   without affecting the normal window.

**Automated test (browser-integrated, isolated test profile)**:
- Resolution-level: with DoH strict, Services.dns.resolve("pornhub.com")
  returns real A/AAAA records even when the system resolver is pointed at a
  blackhole DNS (deterministic fixture).
- Connection-level: TLS handshake to a blocked-in-region domain through the
  ECH + DoH path succeeds (assert via the traffic monitor).
- VPN-level: with private-mode VPN enabled, the request exits via the VPN
  proxy (assert via origin-attributes routing in the proxy filter + probe).
- Manual checklist: "VPN for private ON" -> private window -> blocked domain
  loads; normal window stays on the clean network path.
- Note: automated adult-site *content* visits are avoided by policy;
  resolution and handshake-level assertions cover the requirement. The
  bypass must be user-enabled (never default-on for adult domains).

### 3.8 Device fingerprint scrambler

**UX**: Settings -> Privacy -> "Fingerprint protection" with a tier slider:
Basic (fingerprinting protection on, canvas nulled for known trackers),
Strict (+ WebGL spoof, per-site timezone/UA), Maximum (+ resistFingerprinting
noise, canvas/audio randomization). Per-site exceptions always available from
the toolbar shield.

**Implementation**:
- Basic: privacy.fingerprintingProtection + granular overrides
  (privacy.fingerprintingProtection.overrides).
- Strict: + privacy.resistFingerprinting.reduceTimerPrecision, webgl
  renderer-string override, per-site UA override (reuses the site list of 3.4).
- Maximum: privacy.resistFingerprinting = true + all fingerprintingProtection
  categories + audio-context randomization where supported.
- Traffic/extension panels gain a "fingerprint events blocked" counter.
- Tests (browser-integrated, fixture page):
  - Canvas readback returns noisy/empty data at Strict/Maximum, normal at
    Basic (page still draws; only API readback is protected).
  - navigator.platform / userAgent / timezone overrides apply per-site.
  - Canvas + WebGL readback hash differs across two visits at Maximum.
  - The fixture login button still works at every tier (no-impact check).

### 3.9 Built-in tracker remover

**UX**: Settings -> Privacy shows live "trackers blocked today" per category
(cross-site cookies, fingerprinting, cryptominers, social, email) with
domains behind the count. "Remove now" clears partitioned tracker storage for
a site or all sites.

**Implementation**:
- Enable ETP Strict by default via prefs: privacy.trackingprotection.enabled /
  .pbmode.enabled / .fingerprinting.enabled / .cryptomining.enabled /
  .emailtracking.enabled / .socialtracking.enabled, and partitioned cookie
  behavior (Total Cookie Protection is default-on in ESR 153 - verify).
- Block counts come from the same observer machinery as 3.1 (http-on-* with
  classification from nsIClassifiedChannel / url-classifier), plus third-party
  cookie rejection logging.
- "Remove now" calls Services.clearData scoped to partitioned origins.
- Tests: fixture page embedding doubleclick / google-analytics / a min-tracker
  host -> requests are classified+blocked, cookie set fails, counts increment,
  partition storage clears. Manual spot-check on real news sites (counts > 0).

### 3.10 Maximum privacy mode with zero-visit-impact guarantee

**Requirement (user-stated)**: "maximum privacy with none impact of all site
visits functions". Honest engineering answer: max privacy (RFP, WebGL spoof,
strict partitioning) *does* break some sites, so we ship a tiered system with
a **compatibility guard** rather than an unkeepable promise:

1. **Tiers**: Default (strong, invisible: ETP strict + TCP + DoH fallback +
   fingerprintingProtection Basic) / Strict / Maximum (RFP on).
2. **Compatibility guard**:
   - Per-site exception UI (toolbar shield -> "allow this site").
   - Site-health probe: on load failure or breakage signals (window.open
     null, canvas nulled during a login flow, media error with RFP-related
     reasons), offer one-click downgrade for that site only.
   - The M6 privacy score reports how many sites needed exceptions.
3. **"Visit functions check" regression battery** (the key test): a fixture
   list of top real sites (google.com search + login form, youtube.com video
   play, wikipedia.org article, github.com repo page, twitch.tv embed,
   netflix.com player shell, a video site with anti-adblock, a bank login
   sandbox) run at each tier, asserting: page load success, primary
   interaction works, no console error, load time within XX% of baseline.
   Any tier that breaks a fixture must be fixed or the fixture moved to the
   exception list with the reason documented.
4. The battery is part of the release gate (Part 4) and re-runs on every ESR
   rebase (upstream constantly moves these goalposts).

### 3.11 Built-in undetected ad blocker

**Requirement (user-stated)**: an ad blocker that sites cannot easily detect
(anti-adblock walls, paywalls).

**Design: native browser-level blocking (not an extension)**:
- Network-layer blocking with built-in list bundles (EasyList /
  EasyPrivacy-style author lists shipped in the runtime), enforced in an ESM
  module at http-on-modify-request: matching requests are **not hard-canceled**
  but answered with a minimal stub (204 / 1x1), so anti-adblock fetch() probes
  cannot distinguish "blocked" from "server returned nothing".
- Cosmetic filtering: per-site element hiding applied via the browser's own
  style engine with randomized internal selectors — no <style> marker the
  page can recognize.
- No extension surface: nothing exposes chrome.runtime, so extension-detection
  heuristics find nothing.
- Honest limitation (documented): perfect undetectability is not achievable;
  goal is to defeat common heuristics (extension detection, hard-fail probes,
  DOM markers). Ongoing cat-and-mouse is accepted scope.
- Integrates with 3.2/3.8 counters ("ads blocked today").

**Tests**:
- Fixture page with known ad endpoints (doubleclick, googlesyndication) ->
  requests return stub bodies, ad slots collapse via cosmetic rules, console
  shows no error.
- Anti-adblock detector fixture probing (a) fetch to a known ad host,
  (b) chrome.runtime existence, (c) injected style markers -> reports "no
  blocker detected" under the stub strategy.
- Real-site manual spot-checks (news/video sites with anti-adblock) in the
  manual session; one row in the 3.10 battery.

---

## Part 4 — Release gate checklist (must be all green before user deployment)

| # | Gate | Status | Note |
|---|---|---|---|
| 1 | deno task test:host (209) | GREEN | keep green |
| 2 | deno task test:smoke | RED | fix lint (21 findings) + audit .ts parse bug (enumerated in 1.3) |
| 3 | Browser-integrated colocated tests | per feature | add for each M8 feature |
| 4 | Console error audit at startup | WARN | 2 fluent errors + 2 upstream warnings |
| 5 | Runtime rebrand to Stratus (M2.5) — titles, about:, UA, icon | FAIL | no public build before this |
| 6 | xpinstall.signatures.required=true in prod builds | FAIL | release config only |
| 7 | Signing (EV) + NSIS installer + checksums | PLANNED | RELEASE_PLANNING |
| 8 | Auto-update endpoint configured + staged rollout | PLANNED | RELEASE_PLANNING |
| 9 | Privacy defaults validated: telemetry off, VPN/oHTTP disabled by default, site-actions list empty | verify each release | |
| 10 | **Manual use test** (start -> status -> navigate real sites -> private window -> screenshot -> console audit) on the release candidate | include in CI as dev-tool smoke | document in docs/development |
| 11 | Performance baselines re-measured (startup <3s, tab switch <200ms, 100-tab memory <1GB) | M4_P3 process | |

---

## Part 5 — Suggested execution order (M8 slices)

1. **M8.0 Gate repair (0.5-1 day)**: fix lint findings, rename/escape audit
   docs, add the 2 fluent messages. Redo smoke until green. (Unblocks CI.)
2. **M8.1 Traffic overview** (module + panel + settings + os-server + tests).
3. **M8.2 Extension activity** (reuses 3.1 machinery + AddonManager).
4. **M8.3 Per-mode VPN** (prefs + proxy filter + Settings UI + tests + manual
   IP-check test normal vs private).
5. **M8.4 Trusted-site actions** (prefs + Services.perms grants + Gecko patch
   for no-gesture fullscreen + UI + tests).
6. **M8.5 Privacy & network toolkit** (3.6-3.11: DoH per-mode, ECH bypass
   stack, fingerprint tiers, tracker removal, max-privacy guard + visit-functions
   battery, native stub-based ad blocker). Largest slice; split per feature;
   the 3.10 battery starts as a harness with the default tier only.
7. **M8.6 "GX" theme pack** (design tokens, newtab, sidebar gauges skin,
   wallpaper; ships as an M7 template + default theme flag).
8. **M8.7 Release hardening** (rebrand, signing config, installer, updater,
   ESR rebase cadence, beta channel) — overlaps RELEASE_PLANNING.

Each slice: implement -> colocated tests -> dev-tool manual session
(screenshot + console audit) -> commit with evidence in the message.

---

## Appendix A — Sources consulted

- MDN — Fullscreen API (permissions/gate behavior).
- MDN — Window Management API (multi-screen placement, permission gating).
- mozilla.github.io/policy-templates — Firefox enterprise policy list
  (confirms: no fullscreen-allowlist policy exists -> custom patch needed).
- searchfox mozilla-esr153 — netwerk/ipc, StaticPrefList (API/arch evidence).
- Opera GX product & features pages — visual/feature reference.
- Local runtime + this repo (live verification).

## Appendix B — Evidence from this session

- Browser: Gecko 153.0.3, Windows, 3 tabs, example.com + Wikipedia loaded,
  private window opened, screenshot captured.
- host tests 209/209; smoke 2 failing steps (deno check + deno lint,
  21 findings); console: 2 fluent errors x2 windows, Window.fullScreen
  deprecation, SearchService unreachable-code.
### M8.1b Floorp placeholder cleanup — DONE (this commit)
- Removed Floorp boot placeholders: the runtime welcome flow opened
  `https://blog.floorp.app` (release notes) + `https://floorp.app/privacy`
  tabs via `startup.homepage_welcome_url` / `.additional`, and our own
  `openReleaseNotesInRecentWindow()` spawned `about:welcome?upgrade=12`,
  which re-triggered the Floorp flow. Now: welcome_url -> about:blank,
  .additional -> "", `browser.startup.homepage_override.mstone=ignore`,
  `browser.aboutwelcome.enabled=false` at boot (user.js for dev +
  `StratusBranding.applyStratusBrandPrefs()` module for the prod overlay).
- Bundled Stratus legal pages: `static/legal/privacy-policy.html` +
  `release-notes.html` (canonical source) symlinked by the injector into
  `<app>/noraneko-devdir/legal/` and served by the local OS server at
  `http://127.0.0.1:58261/legal/privacy-policy` and `/legal/release-notes`
  (`os-server/legal/routes.sys.mts` + text/html support in server.sys.mts;
  `/legal/*` is exempt from the optional bearer-token auth).
  - Why HTTP, not chrome://: this dev runtime HARD-CRASHES on chrome://
    documents without a custom CSP delivered before load
    (`nsContentSecurityUtils::AssertChromePageHasCSP` — meta CSP is not
    honored on the chrome:// channel path; the baseline-CSP opt-out makes
    the expected policy count 1). `static/legal` pages carry a strict CSP
    meta for their HTTP serving context.
- Branded internal URLs: app.releaseNotesURL(.aboutDialog) -> bundled
  page, app.update.url.manual/details + app.feedback.baseURL ->
  stratus-browser.org.
- Settings > About (route /about/browser, page title About Stratus) gained
  a Privacy card linking our bundled policy (i18n en-US + ja-JP:
  about.privacy / privacyDescription / viewPrivacyPolicy).
- Tests: `branding/test/StratusBranding.test.ts` (2 cases, in-browser pass).
  Live verification: clean boot (no Floorp tabs), both /legal pages 200
  with correct content-type, privacy + release-notes tabs captured in
  screenshots, settings About page shows the policy link; console audit
  free of overlay errors.
- Follow-up (prod, not in this slice): (a) fresh-profile first-run needs
  runtime default prefs (M2.5) or a browser.js patch (M4) so the overlay's
  final-ui-startup pref application happens before the first window's
  welcome tab; (b) runtime about:preferences still shows "Floorp Labs" /
  "About Floorp Daylight" strings -> rebrand backlog (M8.7);
  (c) settings feature links still point at Floorp infra (Stratus Account
  -> accounts.ablaze.one, Privacy help -> support.mozilla, docs ->
  docs.stratus-browser.org) -> product decisions, backlog;
  (d) legal pages depend on the local OS server running (dev: on via
  floorp.mcp.enabled); prod packaging of static/legal into the runtime
  lands with M2.5/system bundle.

### M8.2 Transparent extension activity — DONE (this commit)
- **Registry** `modules/extension-activity/ExtensionRegistry.sys.mts`: live
  add-on set via AddonManager.getAllAddons + addAddonListener
  (install/enable/disable/uninstall); per-addon name/version/enabled/icon;
  `stratus.extensions.updated` topic; enable/disable via `addon.disable()` /
  `addon.enable()` (hard-won: `AddonManager.disableAddon` and
  `addon.setEnabled` DO NOT exist on this runtime; the object methods are
  not enumerable through Xray proxies). Singleton object export mirrors the
  NetworkMonitor shape; auto-initialized from NoranekoStartup.
- **Attribution fix (M8.1 follow-up):** live moz-extension requests CRASHED
  the monitor — `WebExtensionPolicy.getByHost` is NOT a function on this
  runtime. Resolver now prefers getByHost when present, else matches
  `mozExtensionHostname` over `getActiveExtensions()`; never throws
  (degrades to the UUID host). Verified live: background-page fetches
  attributed to activity-probe@stratus.test with host + requests +
  lastActive. Unit core also gained per-host/per-tab/per-extension
  lastActive timestamps.
- **Panel** `chrome/common/extension-activity/`: navbar button + arrow panel;
  rows = installed extensions (icon/fallback, name, version) merged with
  live NetworkMonitor stats (requests, bytes, up to 5 recently-accessed
  origins as chips, relative last-active time), uninstalled-but-tracked
  rows flagged, enable/disable buttons; 1.5 s auto-refresh; i18n en-US +
  ja-JP (`extension-activity` namespace).
  - Learned the hard way: @nora/solid-xul stringifies boolean props via
    setAttribute, so `disabled={false}` renders a DISABLED button; bind as
    `{cond || undefined}` so the renderer removes the attribute. Also the
    root panel element must be `<xul:panel>` (renderer only XUL-ifies
    `xul:`-prefixed tags; `mainPopupSet` needs real XUL popups), and row
    snapshots must flow through createMemo (For + plain const never
    re-renders).
- **Tests**: `extension-activity/test/ExtensionRegistry.test.ts` incl. a
  REAL enable/disable cycle against an installed fixture add-on
  (`tools/test-fixtures/activity-probe/`, MV2, host permission on
  example.com) — installs via installTemporaryAddon, disables, verifies
  registry + addon state, re-enables, uninstalls. NetworkMonitor core
  tests extended for lastActive. Full module suite 19/19, host 209/209.
- **Live verification**: probe installed (temp + permanent), panel opened
  via toolbar button, row showed probes name/stats/hosts/relative time,
  Disable click flipped addon to inactive and panel to "Enable" + dimmed,
  Enable restored traffic; screenshots captured; console audit clean of
  feature errors (only upstream fullScreen deprecation / SearchService
  noise).
- Follow-up (prod, not in this slice): prod packaging of the fixture
  (dev-only); byte accounting for extension traffic (M8.5); panel idle
  refresh is interval-based — fine for v1; addon icons for unpacked
  addons show the fallback badge (iconUrl null).

---

## Part 6 — Slice status log

### M8.0 Gate repair — DONE (commit f8d2372da4af)
- Green smoke suite (6/6), host tests 209/209, fluent l10n console errors removed.

### M8.1 Traffic overview — DONE (this commit)
- **Module** `modules/network-monitor/NetworkMonitor.sys.mts` + `NetworkMonitorCore.ts`:
  parent-process HTTP observer (`http-on-modify-request` /
  `http-on-examine-response` / `http-on-examine-merged-response`); per-host,
  per-tab (browserId via `loadInfo.browsingContextId` -> `BrowsingContext`,
  fallback host->tab match), per-extension (moz-extension principal ->
  WebExtensionPolicy), normal/private split via originAttributes;
  session-scoped ring buffer; throttled `stratus.network.updated` broadcast.
- **Runtime notes (empirical, Gecko 153 dev runtime):** parent observers DO see
  content-channel notifications for `http-on-modify-request` (verified with
  content-initiated `location.href` navigations). `http-on-examine-response`
  fires for browser-UI traffic only; content responses report
  transferSize/contentLength as -1, so **byte accounting stays 0 for web
  content in v1** — requests/tabs/hosts/extensions are exact.
  Follow-up candidates: traceable-channel or content-process collector
  (frame-actor messenger had IPC issues in dev and was dropped; revisit in
  M8.5), or HTTP/2+size via a network-layer patch at M2.5).
- **UI** `chrome/common/network-monitor`: navbar button (self-placement for
  profiles with saved customization), arrow panel with session totals,
  normal/private split, active-tab row, top hosts, extension activity,
  session reset; i18n en-US + ja-JP.
- **os-server** `os-server/network/routes.sys.mts`: GET /network/summary,
  SSE /network/events (registered in server.sys.mts; dormant while
  `floorp.os.enabled=false` in dev).
- **Tests** `NetworkMonitorCore.test.ts` — 11 cases, executed in-browser
  (1 file passed). Live verification: content nav to iana.org recorded
  requests with correct tab attribution (browserId 3); private-mode bucket
  covered by unit tests; panel screenshot captured; console audit clean of
  overlay errors.

