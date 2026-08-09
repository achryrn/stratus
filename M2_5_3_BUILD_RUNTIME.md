# M2.5.3: Build, Test & Validate Stratus Runtime

**Status:** Planning  
**Deliverables:**
1. Bootstrap build environment
2. Build Stratus runtime from source
3. Validate branding and functionality
4. Update floorp-runtime.lock.json
5. Package and archive artifacts

---

## Overview

M2.5.3 executes the complete build pipeline for the Stratus custom runtime:
1. Bootstrap Gecko build tools and dependencies
2. Compile Stratus runtime with custom branding
3. Validate that branding appears correctly
4. Package distribution artifacts
5. Update version lock file

---

## Task 1: Bootstrap Build Environment

### 1.1: Run mach bootstrap

**Command:**

```bash
cd ~/.stratus-dev/stratus-runtime

# Bootstrap (interactive, downloads ~2-3GB)
./mach bootstrap --application=browser
```

**Expected Flow:**

```
This script will install the necessary dependencies for building Firefox.
Firefox for Linux is the default target.

1. Please choose the version you want to build:
   1. Firefox (default)
   2. Firefox for Android
   => 1

2. System packages check:
   Checking for Python 3.11... ✓
   Checking for autoconf... ✓
   Checking for NASM... ✓
   
3. Installing optional dependencies:
   - git: already installed
   - nodejs: installing...
   - mercurial: skipping (optional)

Bootstrap complete!
System is ready for building Stratus runtime.
```

**Timeline:** 10-15 minutes (depends on existing packages)

**Output:**
- Python 3.11+ configured
- LLVM/Clang available
- Build tools installed
- Ready for compilation

### 1.2: Verify Bootstrap Success

**Check:**

```bash
# Test mach system
./mach --help | head -20

# Verify Python
./mach python -c "import sys; print(f'Python {sys.version}')"

# Check build tools
which clang
which clang++
which nasm
```

**Expected Output:**
```
Mozilla's Build System (mach)
...

Python 3.11.9 (main, Aug 9 2026)

/usr/bin/clang
/usr/bin/clang++
/usr/bin/nasm
```

---

## Task 2: Build Stratus Runtime

### 2.1: Configure Build

**Verify .mozconfig:**

```bash
cat ~/.stratus-dev/stratus-runtime/.mozconfig

# Should show:
# ac_add_options --enable-official-branding
# ac_add_options --with-branding=browser/branding/stratus
# ac_add_options --enable-optimize
# ... (other options)
```

### 2.2: Compile

**Command:**

```bash
cd ~/.stratus-dev/stratus-runtime

# Full build (with progress)
./mach build 2>&1 | tee build.log

# Or with limited output:
./mach build
```

**Timeline:**
- Clean build: 45-90 minutes
- Depends on: CPU cores, disk speed, system RAM
- Typical on modern hardware (8-core, SSD): 60 minutes

**Build Stages:**

```
0. Setup (< 1 min)
   - Configuring build system
   
1. Compile C/C++ (30-50 min)
   - Compiling Gecko engine
   - SpiderMonkey JavaScript engine
   - XUL and XPCOM layers
   
2. Link (10-20 min)
   - Linking object files
   - Creating executables
   
3. Package (5-10 min)
   - Bundling resources
   - Creating distribution package
```

**Monitor Progress:**

```bash
# In another terminal, watch build.log
tail -f ~/.stratus-dev/stratus-runtime/build.log

# Monitor system resources
watch -n 1 'ps aux | grep clang | wc -l'
```

### 2.3: Expected Build Output

**Success Indicators:**

```
> task: Building artifact 'stratus-browser'
> Compiling browser/app/...
> Compiling toolkit/...
> Compiling dom/...
> Linking stratus
> 0:00.00 create artifact
> 0:00.00 zip
Build complete. Output: /home/user/.stratus-dev/stratus-runtime/obj-x86_64-unknown-linux-gnu/dist/
```

**Build Artifact Location:**

```bash
# Linux/macOS
obj-x86_64-unknown-linux-gnu/dist/
obj-aarch64-apple-darwin/dist/

# Windows
obj-x86_64-pc-mingw32/dist/

# Binary name: 'stratus' or 'stratus.exe'
```

**Size:** ~100-150 MB (uncompressed)

---

## Task 3: Validate Build Output

### 3.1: Verify Binary Exists

```bash
STRATUS_BINARY="~/.stratus-dev/stratus-runtime/obj-x86_64-unknown-linux-gnu/dist/stratus"

if [ -f "$STRATUS_BINARY" ]; then
  echo "✓ Binary found: $STRATUS_BINARY"
  file "$STRATUS_BINARY"
  ls -lh "$STRATUS_BINARY"
else
  echo "✗ Binary not found"
  exit 1
fi
```

**Expected Output:**
```
✓ Binary found: /home/user/.stratus-dev/stratus-runtime/obj-x86_64-unknown-linux-gnu/dist/stratus
/home/user/.stratus-dev/stratus-runtime/obj-x86_64-unknown-linux-gnu/dist/stratus: ELF 64-bit LSB shared object, x86-64
-rwxr-xr-x 1 user user 125M Aug  9 03:35 /home/user/.stratus-dev/stratus-runtime/obj-x86_64-unknown-linux-gnu/dist/stratus
```

### 3.2: Test Binary (Smoke Tests)

**Test 1: Version Check**

```bash
STRATUS_BINARY="~/.stratus-dev/stratus-runtime/obj-x86_64-unknown-linux-gnu/dist/stratus"

$STRATUS_BINARY --version
```

**Expected Output:**
```
Stratus Browser 1.0.0-dev
```

**Test 2: About Page (Headless)**

```bash
# Create test profile
TEST_PROFILE="/tmp/stratus-test-profile"
mkdir -p "$TEST_PROFILE"

# Run in headless mode
$STRATUS_BINARY -profile "$TEST_PROFILE" -no-remote about: 2>&1 | head -20
```

**Test 3: Check Branding in Binary**

```bash
# Check for "Stratus" strings in binary
strings "$STRATUS_BINARY" | grep -i "stratus" | head -10

# Expected output:
# Stratus
# Stratus Browser
# stratus-browser.org
```

**Test 4: Preferences Loading**

```bash
# Verify default preferences are embedded
strings "$STRATUS_BINARY" | grep -i "brandShortName"

# Should find branding references
```

### 3.3: Run Automated Tests

**Built-in Tests:**

```bash
cd ~/.stratus-dev/stratus-runtime

# Run unit tests (basic functionality)
./mach test --help
./mach test browser/base/content/tests/

# Run mochitest (functional tests)
./mach mochitest browser/base/content/tests/general/ --headless
```

**Timeline:** 5-15 minutes

**Validation Script: `validate-build.sh`**

```bash
#!/bin/bash
# Validate Stratus runtime build

set -e

STRATUS_ROOT="$HOME/.stratus-dev/stratus-runtime"
BUILD_OBJ="obj-x86_64-unknown-linux-gnu"  # Adjust for your platform
DIST_DIR="$STRATUS_ROOT/$BUILD_OBJ/dist"
BINARY="$DIST_DIR/stratus"

echo "Validating Stratus runtime build..."
echo ""

# Check 1: Binary exists
if [ -f "$BINARY" ]; then
  echo "✓ Binary exists: $BINARY"
else
  echo "✗ Binary not found: $BINARY"
  exit 1
fi

# Check 2: Binary is executable
if [ -x "$BINARY" ]; then
  echo "✓ Binary is executable"
else
  echo "✗ Binary is not executable"
  exit 1
fi

# Check 3: Check branding strings
if strings "$BINARY" | grep -q "Stratus"; then
  echo "✓ Branding strings found"
else
  echo "✗ Branding strings not found"
  exit 1
fi

# Check 4: Version string
if strings "$BINARY" | grep -q "1.0.0"; then
  echo "✓ Version string found"
else
  echo "⚠ Version string not found (non-critical)"
fi

# Check 5: Privacy URLs
if strings "$BINARY" | grep -q "stratus-browser.org"; then
  echo "✓ Stratus URLs found"
else
  echo "⚠ Stratus URLs not found (non-critical)"
fi

# Check 6: File size reasonable
SIZE=$(stat --format=%s "$BINARY" 2>/dev/null || stat -f%z "$BINARY" 2>/dev/null)
SIZE_MB=$((SIZE / 1024 / 1024))

if [ $SIZE_MB -gt 50 ] && [ $SIZE_MB -lt 300 ]; then
  echo "✓ Binary size reasonable: ${SIZE_MB}MB"
else
  echo "⚠ Binary size unexpected: ${SIZE_MB}MB"
fi

# Check 7: Required libraries
if command -v ldd &> /dev/null; then
  if ldd "$BINARY" | grep -q "libc.so"; then
    echo "✓ System libraries linked"
  else
    echo "⚠ Library check failed (may be static)"
  fi
fi

# Check 8: Build artifacts present
REQUIRED_FILES=(
  "chrome/toolkit/content/global"
  "defaults/pref"
  "extensions"
)

for dir in "${REQUIRED_FILES[@]}"; do
  if [ -d "$DIST_DIR/$dir" ]; then
    echo "✓ Found: $dir"
  else
    echo "⚠ Missing: $dir (may affect features)"
  fi
done

echo ""
echo "✓ Validation complete"
echo ""
echo "Binary ready at: $BINARY"
```

---

## Task 4: Package Distribution Artifacts

### 4.1: Create Archive

**Command:**

```bash
cd ~/.stratus-dev/stratus-runtime

# Package for distribution
./mach package

# This creates platform-specific packages
```

**Expected Output:**

```
Packaging stage...
Compressing artifacts...

Output:
- Linux: stratus-1.0.0-dev.tar.bz2 (~40MB)
- macOS: stratus-1.0.0-dev.dmg (~60MB)
- Windows: stratus-1.0.0-dev.exe (~50MB installer)
```

### 4.2: Create Additional Artifacts

**Create Portable Archives:**

```bash
# Linux portable
cd obj-x86_64-unknown-linux-gnu/dist
tar -czf ~/artifacts/stratus-1.0.0-dev-portable-linux-x64.tar.gz stratus/
cd -

# Create checksums
cd ~/artifacts
sha256sum stratus-* > SHA256SUMS
md5sum stratus-* > MD5SUMS

# Create manifest
cat > MANIFEST.txt << 'EOF'
Stratus Browser v1.0.0-dev Build Artifacts
============================================

Build Date: $(date)
Build Commit: $(git rev-parse HEAD)
Platform: Linux x86-64

Artifacts:
- stratus-1.0.0-dev.tar.bz2 (RPM/Standard)
- stratus-1.0.0-dev-portable-linux-x64.tar.gz (Portable)

Checksums in: SHA256SUMS, MD5SUMS
EOF
```

---

## Task 5: Update floorp-runtime.lock.json

### 5.1: Compute Checksums

```bash
BINARY="~/.stratus-dev/stratus-runtime/obj-x86_64-unknown-linux-gnu/dist/stratus"

# SHA256
SHA256=$(sha256sum "$BINARY" | cut -d' ' -f1)
echo "SHA256: $SHA256"

# File size
SIZE=$(stat --format=%s "$BINARY" 2>/dev/null || stat -f%z "$BINARY" 2>/dev/null)
echo "Size: $SIZE bytes"

# Git commit
COMMIT=$(cd ~/.stratus-dev/stratus-runtime && git rev-parse HEAD)
echo "Commit: $COMMIT"
```

### 5.2: Update Lock File

**File: `floorp/floorp-runtime.lock.json`**

**Current (before):**
```json
{
  "runtime": {
    "name": "floorp-runtime",
    "version": "153.0.3.3",
    "commit": "2d38da4d11be1e0e615f4ddd785ad5e77c95e18d",
    "source": "https://github.com/Floorp-Projects/floorp-runtime"
  }
}
```

**Updated (after):**
```json
{
  "runtime": {
    "name": "stratus-runtime",
    "version": "1.0.0-dev",
    "commit": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "source": "https://github.com/{YOUR_USERNAME}/stratus-runtime",
    "upstream": {
      "name": "floorp-runtime",
      "version": "153.0.3.3",
      "commit": "2d38da4d11be1e0e615f4ddd785ad5e77c95e18d",
      "source": "https://github.com/Floorp-Projects/floorp-runtime"
    },
    "build": {
      "timestamp": "2026-08-09T03:37:04.479Z",
      "platform": "linux-x64",
      "compiler": "clang-17",
      "optimization": "release"
    },
    "artifacts": {
      "binary": "stratus",
      "size_bytes": 131072000,
      "sha256": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
      "download_url": "https://github.com/{YOUR_USERNAME}/stratus-runtime/releases/download/v1.0.0-dev/stratus-runtime-1.0.0-dev.tar.gz"
    }
  }
}
```

**Update Script:**

```bash
#!/bin/bash
# Update floorp-runtime.lock.json

set -e

RUNTIME_DIR="$HOME/.stratus-dev/stratus-runtime"
BROWSER_DIR="$HOME/Documents/Project/browser-dev/floorp"
LOCK_FILE="$BROWSER_DIR/floorp-runtime.lock.json"

# Get build information
COMMIT=$(cd "$RUNTIME_DIR" && git rev-parse HEAD)
BINARY="$RUNTIME_DIR/obj-x86_64-unknown-linux-gnu/dist/stratus"
SHA256=$(sha256sum "$BINARY" | cut -d' ' -f1)
SIZE=$(stat --format=%s "$BINARY")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo "Updating runtime lock file..."
echo "  Commit: $COMMIT"
echo "  SHA256: $SHA256"
echo "  Size: $SIZE bytes"

# Create new lock file using jq
jq --arg commit "$COMMIT" \
   --arg sha256 "$SHA256" \
   --arg size "$SIZE" \
   --arg timestamp "$TIMESTAMP" \
   '.runtime.name = "stratus-runtime" |
    .runtime.version = "1.0.0-dev" |
    .runtime.commit = $commit |
    .runtime.source = "https://github.com/{YOUR_USERNAME}/stratus-runtime" |
    .build.timestamp = $timestamp |
    .build.platform = "linux-x64" |
    .artifacts.sha256 = $sha256 |
    .artifacts.size_bytes = ($size | tonumber)' \
   "$LOCK_FILE" > "$LOCK_FILE.tmp"

mv "$LOCK_FILE.tmp" "$LOCK_FILE"

echo "✓ Lock file updated: $LOCK_FILE"

# Verify JSON syntax
if jq empty "$LOCK_FILE" 2>/dev/null; then
  echo "✓ JSON syntax valid"
else
  echo "✗ JSON syntax error"
  exit 1
fi

# Show updated content
echo ""
echo "Updated content:"
jq '.' "$LOCK_FILE"
```

---

## Task 6: Final Validation & Cleanup

### 6.1: Integration Test

**Test: Browser-dev Build with New Runtime**

```bash
# In browser-dev workspace
cd ~/Documents/Project/browser-dev/floorp

# Run build with new runtime
deno task feles-build dev

# Expected:
# - Build completes successfully
# - No runtime-related errors
# - New runtime loaded correctly
```

### 6.2: Cleanup Build Artifacts

```bash
cd ~/.stratus-dev/stratus-runtime

# Remove build cache (optional, saves disk space)
./mach clobber

# Or preserve for incremental builds
# Keep obj-* directories for faster rebuilds

# Archive old builds (if multiple versions)
tar -czf ~/artifacts/stratus-runtime-build-cache-$(date +%Y%m%d).tar.gz obj-*/
```

### 6.3: Document Build Results

**File: `BUILD_REPORT_M2_5_3.md`**

```markdown
# M2.5.3 Build Report

**Date:** 2026-08-09  
**Status:** SUCCESS ✓

## Build Metrics

- **Build Duration:** 62 minutes
- **Binary Size:** 131.1 MB
- **Platform:** Linux x86-64
- **Compiler:** Clang 17.0.0

## Validation Results

- ✓ Binary created and executable
- ✓ Branding strings present
- ✓ Version correct (1.0.0-dev)
- ✓ Privacy defaults embedded
- ✓ All required libraries linked
- ✓ Smoke tests passed
- ✓ Unit tests: 209/209 passed

## Artifacts

- Binary: `stratus-runtime-1.0.0-dev`
- SHA256: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...`
- Package: `stratus-1.0.0-dev.tar.bz2`

## Next Steps

- Integrate into browser-dev build
- Test with Noraneko overlay
- Validate in feles-build pipeline
```

---

## Complete Build Execution Script

**File: `build-stratus-runtime.sh`**

```bash
#!/bin/bash
# Complete Stratus runtime build script

set -e

RUNTIME_DIR="${HOME}/.stratus-dev/stratus-runtime"
ARTIFACTS_DIR="${HOME}/artifacts"
LOG_FILE="$RUNTIME_DIR/build-$(date +%Y%m%d_%H%M%S).log"

echo "=========================================="
echo "Stratus Runtime Build Pipeline"
echo "=========================================="
echo ""

# Step 1: Bootstrap
echo "[1/5] Bootstrapping build environment..."
cd "$RUNTIME_DIR"
./mach bootstrap --application=browser 2>&1 | tee -a "$LOG_FILE"

# Step 2: Build
echo ""
echo "[2/5] Building Stratus runtime..."
echo "This may take 45-90 minutes..."
./mach build 2>&1 | tee -a "$LOG_FILE"

# Step 3: Validate
echo ""
echo "[3/5] Validating build output..."
./validate-build.sh

# Step 4: Package
echo ""
echo "[4/5] Packaging artifacts..."
./mach package 2>&1 | tee -a "$LOG_FILE"

# Step 5: Update lock file
echo ""
echo "[5/5] Updating runtime lock..."
./update-lock-file.sh

echo ""
echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo "Runtime: $RUNTIME_DIR"
echo "Log: $LOG_FILE"
echo ""
```

---

## Success Criteria

- [ ] Bootstrap completes without errors
- [ ] Build completes (may take 60-90 minutes)
- [ ] Binary exists and is executable
- [ ] Branding strings present in binary
- [ ] Smoke tests pass (--version, about:)
- [ ] All validation checks pass
- [ ] Artifacts packaged successfully
- [ ] floorp-runtime.lock.json updated
- [ ] JSON lock file valid syntax
- [ ] Build report generated
- [ ] Log file archived

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails with "clang not found" | Run bootstrap again: `./mach bootstrap` |
| Out of disk space | Ensure 50GB free; clean with `./mach clobber` |
| Python 3.11 not found | Install: `sudo apt install python3.11` |
| NASM missing | Install: `sudo apt install nasm` |
| Build hangs | Check system resources; increase swap if needed |
| Binary too large | Normal for unstripped debug build; strip if needed |
| Branding not appearing | Verify `.mozconfig` has `--with-branding=browser/branding/stratus` |

---

## Performance Optimization Tips

### Speed Up Subsequent Builds

```bash
# Use ccache (if available)
ac_add_options --with-ccache

# Reduce link-time code generation
ac_add_options --disable-lto

# Skip tests
./mach build --skip-tests

# Incremental builds are much faster:
./mach build  # Second build: 5-15 minutes
```

### Monitor Build Resources

```bash
# In another terminal
watch -n 1 'top -b -n 1 | head -20'

# Check disk usage
watch -n 5 'df -h'
```

---

## Next Steps (After M2.5.3)

1. **Integrate into browser-dev**
   - Update feles-build to use new runtime
   - Test full pipeline

2. **CI/CD Setup** (Release phase)
   - Nightly builds
   - Automated testing
   - Release packaging

3. **Distribution** (Release phase)
   - Update server setup
   - Code signing
   - User download/install flow
