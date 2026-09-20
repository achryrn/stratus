# Stratus runtime CI note

The Windows x64 runtime is cross-compiled on GitHub Actions from this branch.
Built binaries land on the stratus-runtime-build-output branch; failure
diagnostics land on the stratus-ci-logs branch.

Build 2026-09-20: packaging script normalizes the Stratus-named package zip\n(root floorp, exe floorp.exe, application.ini Name floorp) to keep the
overlay runtime contract intact.Filtered the jsshell package from the primary-artifact match.\nRestored the bundle staging mkdir dropped in the packaging edit.\n