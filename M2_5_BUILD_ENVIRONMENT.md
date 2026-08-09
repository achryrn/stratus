# M2.5.1 Task 2: Build Environment Setup & Verification

**Milestone:** M2.5.1 — Fork & Repository Setup  
**Task:** 2.5.1.3 — Verify Build Environment  
**Duration:** 1-2 days | **Effort:** 8-12 hours | **Owner:** Build Engineer  
**Master Plan:** `M2_5_TASK_BREAKDOWN.md`  

---

## Overview

This document records the verified build environment for the Stratus Browser project (Floorp fork). It serves as the canonical reference for:

1. Required toolchain versions and installation state
2. Runtime lock file grounding (pin to `daily-998` commit `2d38da4d`)
3. Reproducible build machine state
4. Verification commands and expected outputs

---

## 1. Host Machine State (Reference Build)

**Recorded:** 2026-08-09 (Windows 11)

| Component | Required | Verified | Notes |
|-----------|----------|----------|-------|
| OS | Windows 11 22H2+ | ✅ | Non-admin user account |
| CPU | x86-64, 8+ cores | ✅ | Parallel builds |
| RAM | 16 GB min, 32 GB recommended | ✅ | Mach requires ~8GB peak |
| Disk | 120 GB free | ✅ | SSD recommended |
| Git | 2.55.0+ | ✅ | `git --version` |
| Deno | 2.9.4+ | ✅ | `deno --version` |
| Python | 3.8+ | ✅ | Mach bootstrap requires |
| Visual Studio | 2022 Build Tools | ✅ | `Desktop development with C++` workload |
| LLVM/Clang | 18+ | ✅ | `clang --version` |
| NASM | 2.14+ | ✅ | `nasm --version` |
| Perl | 5.30+ (Strawberry) | ✅ | `perl --version` |
| Rust (optional) | 1.70+ | ⚠️ | Needed for some crates |

### Toolchain Installation Notes

```powershell
# Verify core toolchain (one-shot)
deno --version
git --version
python --version
clang --version
nasm --version
perl --version
```

Expected output shape:
```
deno 2.9.4 (release, x86_64-pc-windows-msvc)
git version 2.55.0.windows.1
Python 3.12.x
clang version 18.x.x
NASM version 2.16.x
This is perl 5, version 36, subversion 0 (v5.36.0)
```

---

## 2. Runtime Lock File Grounding

**File:** `floorp-runtime.lock.json` (committed, canonical)

### Pinned Source Identity

```json
{
  "schemaVersion": 1,
  "source": {
    "repository": "Floorp-Projects/Floorp-Runtime",
    "trackingRef": "nora-0.2.0",
    "ref": "daily-998",
    "commit": "2d38da4d11be1e0e615f4ddd785ad5e77c95e18d",
    "tree": "e555a371e1a24f18c8085058461f92c06e0b997d",
    "release": { "id": 359773143, "immutable": false },
    "materials": { "count": 53, "totalBytes": 220264 }
  }
}
```

**Key facts:**
- Runtime source: `Floorp-Projects/Floorp-Runtime`
- Tracking ref: `nora-0.2.0`
- Exact ref: `daily-998`
- Commit: `2d38da4d11be1e0e615f4ddd785ad5e77c95e18d`
- Tree: `e555a371e1a24f18c8085058461f92c06e0b997d`
- Materials: 53 files (manifests, tests, support assets) — **not** the full source tree
- Total material size: ~220 KB (manifest/test fragments only)

### Why Materials Are Locked (Not Full Source)

The lock file pins **build-relevant materials** (test manifests, support files) to a specific commit so that:
- Builds are reproducible against the exact runtime revision
- Test manifests match the runtime under test
- The full source fork lives in the M2.5.1 fork (Task 2.5.1.1), not in this repo

### Lock Validation CLI

```powershell
# Validate lock file structure (no network)
deno run -A tools/runtime-lock/runtime_lock_cli.ts validate-lock

# Validate live GitHub release identity + asset metadata (network)
deno run -A tools/runtime-lock/runtime_lock_cli.ts validate-release-metadata

# Validate this host's native artifact (download + inspect, no install)
deno run -A tools/runtime-lock/runtime_lock_cli.ts validate-native --out _dist/validate

# Transactionally install exact locked runtime into _dist/bin
deno run -A tools/runtime-lock/runtime_lock_cli.ts install-native
```

**Expected success output:** `validate-lock` prints parsed lock summary with `schemaVersion: 1`, source ref `daily-998`, commit hash, and material count `53`. Any error means the lock file or environment is misconfigured.

---

## 3. Reproducible Build Machine Documentation

### Environment Variables (recorded)

```powershell
# Build configuration (persist in user profile, NOT in repo)
$env:MOZBUILD_STATE_PATH   = "$env:USERPROFILE\.mozbuild"
$env:MOZCONFIG             = "browser/config/mozconfig.win64"  # after fork
# Optional (authenticated GitHub API for release validation)
# $env:FLOORP_RUNTIME_GITHUB_TOKEN = "ghp_..."
```

### Directory Layout (after M2.5.1 fork)

```
browser-dev/
├── floorp/                     # This repo (stratus-main)
│   ├── browser-features/       # Chrome features (ESM + SolidJS)
│   ├── tools/                  # Build pipeline + runtime-lock CLI
│   ├── floorp-runtime.lock.json
│   └── ...
├── floorp-runtime/             # M2.5.1 fork of Floorp-Runtime (full Gecko source)
│   ├── browser/
│   ├── mozilla-central files...
│   └── moz.configure
└── _dist/                      # Build output (gitignored)
    ├── bin/                    # Installed locked runtime
    └── validate/               # validate-native output
```

### Bootstrap & Clean Build Sequence (Post-Fork)

```powershell
# 1. Enter runtime source
cd ..\floorp-runtime

# 2. Bootstrap mach (first time only)
python mach bootstrap

# 3. Configure build
python mach configure

# 4. Build (parallel, use all cores)
python mach build -j 16

# 5. Verify artifacts
python mach artifact ls

# 6. Launch test build
python mach run
```

**Expected artifacts (Windows):**
- `obj-x86_64-pc-windows-msvc/dist/bin/browser.exe`
- `.../xul.dll` (~150 MB)
- `.../omni.ja` (packed chrome)
- `.../application.ini`

### Clean Build Time Baseline (Reference)

| Build Type | Expected Time | Machine |
|-----------|---------------|---------|
| Fresh bootstrap (first) | 45-90 min | 16-core, 32GB, NVMe |
| Incremental (single patch) | 2-10 min | Same |
| Packaging | 5-10 min | Same |
| Test run (xpcshell subset) | 2-5 min | Same |

---

## 4. Verification Checklist

### 4.1 Toolchain Verification

- [ ] `deno --version` → 2.9.4+
- [ ] `git --version` → 2.55.0+
- [ ] `python --version` → 3.8+
- [ ] `clang --version` → 18+
- [ ] `nasm --version` → 2.14+
- [ ] `perl --version` → 5.30+
- [ ] VS2022 Build Tools with C++ workload present
- [ ] `deno task test:host` passes in this repo (209 tests)

### 4.2 Lock File Verification

- [ ] `floorp-runtime.lock.json` present at repo root
- [ ] `validate-lock` passes with `schemaVersion: 1`
- [ ] Source ref = `daily-998`, commit = `2d38da4d`
- [ ] Material count = 53, totalBytes = 220264

### 4.3 Network Verification

- [ ] `validate-release-metadata` resolves release ID `359773143`
- [ ] GitHub API accessible (rate limit check)
- [ ] If rate-limited: set `FLOORP_RUNTIME_GITHUB_TOKEN`

### 4.4 Native Runtime Verification

- [ ] `install-native` installs to `_dist/bin` without error
- [ ] `browser.exe` launches from `_dist/bin`
- [ ] Browser window opens with Floorp branding (pre-fork)
- [ ] About dialog shows Gecko ESR 153.0.3.3
- [ ] Clean shutdown (no crash reporter dialog)

---

## 5. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `validate-lock` fails | Lock JSON corrupt/mismatched | Re-clone repo; verify lock untouched |
| GitHub 403/rate limit | Unauthenticated API | Set `FLOORP_RUNTIME_GITHUB_TOKEN` |
| `install-native` hash mismatch | Artifact replaced upstream | Use pinned commit; report upstream |
| `mach bootstrap` fails | Missing VS workload | Install "Desktop development with C++" |
| `clang` not found | LLVM not on PATH | Install LLVM 18+, add to PATH |
| Python version error | Wrong Python | Use python.org 3.12, not Windows Store stub |
| Disk space error | obj dir too large | `mach clobber`, ensure 120GB free |
| Build OOM | RAM < 16GB | Reduce `-j` to 8, close other apps |

---

## 6. Success Criteria (Task 2.5.1.3)

- [ ] All toolchain versions verified and documented
- [ ] `validate-lock` + `validate-release-metadata` pass
- [ ] `install-native` succeeds (if applicable on this host)
- [ ] Clean bootstrap build completes without errors
- [ ] Browser launches from `_dist/bin`
- [ ] Build time and machine state recorded for reproducibility
- [ ] Environment variables documented (non-secret)

---

**Document Version:** 1.0  
**Created:** 2026-08-09  
**Status:** Reference — update after M2.5.1 fork execution
