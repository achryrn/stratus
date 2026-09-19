# Stratus Browser — Project Documentation Index

**Last Updated:** 2026-08-09  
**Branch:** `stratus-main`  

This index catalogs all project documentation, planning documents, test suites, and reference materials for the Stratus Browser project (Floorp fork on Gecko ESR 153.0.3.3).

---

## 📋 Master Documents

| Document | Purpose | Lines |
|----------|---------|-------|
| [`PROJECT_ROADMAP_SUMMARY.md`](PROJECT_ROADMAP_SUMMARY.md) | Complete project overview: phases M1→Release, metrics, risks, timeline | 747 |
| [`SESSION_SUMMARY_2026_08_09.md`](SESSION_SUMMARY_2026_08_09.md) | Session report: M4 Phase 2 completion & M5-M7 planning | 569 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System architecture reference (M3 final status) | — |

---

## 🏗️ M2.5 — Runtime Fork & Build System

| Document | Purpose |
|----------|---------|
| [`M2_5_RUNTIME_FORK_PLANNING.md`](M2_5_RUNTIME_FORK_PLANNING.md) | Runtime fork plan: architecture, 3 task clusters, risks, timeline (3 weeks) |
| [`M2_5_TASK_BREAKDOWN.md`](M2_5_TASK_BREAKDOWN.md) | Execution checklist: 12 detailed tasks with verification steps |

---

## 🧩 M4 — Feature Integration

### Planning & Execution

| Document | Purpose |
|----------|---------|
| [`M4_PHASE_3_PRODUCTION_BUILD.md`](M4_PHASE_3_PRODUCTION_BUILD.md) | Production build & validation plan (2 weeks, 60h) |

### Test Suites

| Document | Purpose | Tests |
|----------|---------|-------|
| `browser-features/chrome/common/workspaces/test/workspaces-integration.test.ts` | Workspaces lifecycle & CRUD suite | 31 |
| `browser-features/chrome/common/workspaces/test/workspaces-vertical-tabs-integration.test.ts` | Workspaces × vertical tabs integration | 19 |
| `browser-features/chrome/common/split-view/test/split-view-integration.test.ts` | Split-view layout & navigation suite | 27 |

### Accessibility Audits

| Document | Scope | Findings |
|----------|-------|----------|
| `browser-features/chrome/common/workspaces/test/ACCESSIBILITY_AUDIT_M4_P2_3.ts` | Workspaces WCAG 2.1 AA | 2 major (contrast, focus) |
| `browser-features/chrome/common/split-view/test/ACCESSIBILITY_AUDIT_M4_P2_6.ts` | Split-view WCAG 2.1 AA | 1 major (divider focus) |
| `browser-features/chrome/common/workspaces/test/PLATFORM_TESTING_M4_P2_4.ts` | Cross-platform test procedures | 5 scenarios |

---

## 🧑‍💻 M5 — Developer Platform

| Document | Purpose |
|----------|---------|
| [`M5_DEVELOPER_PLATFORM_PLANNING.md`](M5_DEVELOPER_PLATFORM_PLANNING.md) | Master plan (4 weeks, 160h): APIs, sandbox, marketplace |
| [`M5_TASK_BREAKDOWN.md`](M5_TASK_BREAKDOWN.md) | Execution checklist: 10 tasks (manifest, permissions, lifecycle, sandbox, worker, backend, frontend, docs, CLI, M4 APIs, review) |

---

## 🔒 M6 — Privacy Center

| Document | Purpose |
|----------|---------|
| [`M6_PRIVACY_CENTER_PLANNING.md`](M6_PRIVACY_CENTER_PLANNING.md) | Master plan (3 weeks, 120h): score, tracking, cookies, permissions, policies |
| [`M6_TASK_BREAKDOWN.md`](M6_TASK_BREAKDOWN.md) | Execution checklist: 6 tasks |

---

## 🎨 M7 — Theme Studio

| Document | Purpose |
|----------|---------|
| [`M7_THEME_STUDIO_PLANNING.md`](M7_THEME_STUDIO_PLANNING.md) | Master plan (4 weeks, 160h): editor, marketplace, engine, templates, sync |
| [`M7_TASK_BREAKDOWN.md`](M7_TASK_BREAKDOWN.md) | Execution checklist: 6 tasks |

---

## 🚀 Release — CI/CD & Distribution

| Document | Purpose |
|----------|---------|
| [`RELEASE_PLANNING.md`](RELEASE_PLANNING.md) | Master plan (2 weeks, 80h): pipeline, signing, installer, channels, QA, beta |
| [`RELEASE_TASK_BREAKDOWN.md`](RELEASE_TASK_BREAKDOWN.md) | Execution checklist: 8 tasks |

---

## 🎮 M8 — Opera GX Vision & Production Readiness

| Document | Purpose |
|----------|---------|
| [`M8_OPERAGX_VISION_PLANNING.md`](M8_OPERAGX_VISION_PLANNING.md) | Live assessment + research + specs: Opera GX look, traffic overview, extension activity, per-mode VPN, trusted-site actions, release gates |

---

## 📈 Project Status

```
Phase           Status      Timeline          Effort
────────────────────────────────────────────────────────
M1  Design      ✅ Done      Week 1-2          40h
M3  Config      ✅ Done      Week 3-6          160h
M4  Features    🟢 Active    Week 7-12         240h
M2.5 Runtime    🟡 Planned   Week 13-15        50h
M4 Phase 3      📋 Planned   Week 16-17        60h
M5  Platform    📋 Planned   Week 18-21        160h
M6  Privacy     📋 Planned   Week 22-24        120h
M7  Themes      📋 Planned   Week 25-28        160h
Release         📋 Planned   Week 29-30        80h
Beta            📋 Planned   Week 31-36        —
```

**Next milestone:** M8.0 — repair smoke gate (lint + audit docs), then M2.5.1 / M8 slices (see `M8_OPERAGX_VISION_PLANNING.md`)
