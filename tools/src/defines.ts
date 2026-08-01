// SPDX-License-Identifier: MPL-2.0

import * as path from "@std/path";

/**
 * Branding and platform-related constants used by build tools.
 * Modernized for ESNext + latest TypeScript while preserving Deno APIs.
 */

/**
 * Branding identity.
 *
 * `base_name` / `display_name` describe the *runtime artifact* (the prebuilt
 * Floorp-Runtime we download and validate). They MUST stay `floorp`/`Floorp`
 * for now: `assertRuntimeTree()` in the initializer validates `application.ini
 * Name === display_name`, extraction strips the top-level dir named
 * `base_name`, and every tool path (BIN_DIR/BIN_PATH_EXE) derives from them.
 *
 * `product` is the *user-visible* browser identity (Stratus). The overlay
 * chrome UI, pages, i18n, and tooling metadata use `product.name`.
 *
 * Phase 2.5 (runtime rebuild) will align `base_name`/`display_name` with
 * `product` once we build our own branded runtime artifact.
 */
export const BRANDING = {
  base_name: "floorp",
  display_name: "Floorp",
  dev_suffix: "noraneko-dev",
  product: {
    name: "Stratus",
    vendor: "Stratus Browser Project",
    version: "0.1.0",
    releaseChannel: "alpha",
    updateHost: "", // e.g. "https://updates.stratus-browser.org/"
    website: "https://stratus-browser.org",
    docs: "https://docs.stratus-browser.org",
    blog: "https://blog.stratus-browser.org",
    repository: "stratus-browser/stratus",
  },
} as const;

export type Platform = "windows" | "darwin" | "linux";

/** Resolve runtime platform (Deno-only) */
const detectPlatform = (): Platform => {
  const raw = Deno.build.os;
  switch (raw) {
    case "windows":
      return "windows";
    case "darwin":
      return "darwin";
    default:
      return "linux";
  }
};

export const PLATFORM: Platform = detectPlatform();

export const VERSION = ["windows", "linux"].includes(PLATFORM) ? "002" : "000";

export const PROJECT_ROOT = path.resolve(
  path.dirname(path.fromFileUrl(import.meta.url)),
  "..",
  "..",
);

export const PATHS = {
  root: PROJECT_ROOT,
  bin_root: path.join(PROJECT_ROOT, "_dist", "bin"),
  noraneko_out: path.join(PROJECT_ROOT, "_dist", "noraneko"),
  buildid2: path.join(PROJECT_ROOT, "_dist", "buildid2"),
  profile_test: path.join(PROJECT_ROOT, "_dist", "profile", "test"),
  loader_features: path.join(PROJECT_ROOT, "bridge/loader-features"),
  features_chrome: path.join(PROJECT_ROOT, "browser-features/chrome"),
  i18n: path.join(PROJECT_ROOT, "i18n"),
  loader_modules: path.join(PROJECT_ROOT, "bridge/loader-modules"),
  modules: path.join(PROJECT_ROOT, "browser-features/modules"),
  mozbuild_output: path.join(PROJECT_ROOT, "obj-artifact-build-output/dist"),
} as const;

export const BIN_DIR =
  PLATFORM !== "darwin"
    ? path.join(PATHS.bin_root, BRANDING.base_name)
    : path.join(
        PATHS.bin_root,
        BRANDING.base_name,
        `${BRANDING.display_name}.app`,
        "Contents",
        "Resources",
      );

export const BIN_ROOT_DIR = PATHS.bin_root;
export const BIN_PATH = path.join(BIN_DIR, BRANDING.base_name);

export const PROD_BIN_DIR = "../obj-artifact-build-output/dist/bin";

export const BIN_PATH_EXE =
  PLATFORM !== "darwin"
    ? BIN_PATH + (PLATFORM === "windows" ? ".exe" : "-bin")
    : path.join(
        PATHS.bin_root,
        BRANDING.base_name,
        `${BRANDING.display_name}.app`,
        "Contents",
        "MacOS",
        BRANDING.base_name,
      );

export const BIN_VERSION = path.join(BIN_DIR, "nora.version.txt");

export const DEV_SERVER = {
  ready_string: "nora-{bbd11c51-3be9-4676-b912-ca4c0bdcab94}-dev",
  default_port: 8080,
} as const;

export type BinArchive =
  | {
      filename: string;
      format: "zip";
      platform: "windows";
      architecture: "x86_64";
    }
  | {
      filename: string;
      format: "tar.xz";
      platform: "linux";
      architecture: "x86_64" | "aarch64";
    }
  | {
      filename: string;
      format: "dmg";
      platform: "darwin";
      architecture: "universal";
    };

export function getBinArchive(): BinArchive {
  if (PLATFORM === "windows") {
    return {
      filename: `${BRANDING.base_name}-windows-x86_64-moz-artifact.zip`,
      format: "zip",
      platform: "windows",
      architecture: "x86_64",
    };
  }

  if (PLATFORM === "linux") {
    // Map Deno arch to expected strings
    const denoArch = Deno.build.arch;
    return {
      filename: `${BRANDING.base_name}-linux-${denoArch}-moz-artifact.tar.xz`,
      format: "tar.xz",
      platform: "linux",
      architecture: denoArch as "x86_64" | "aarch64",
    };
  }

  if (PLATFORM === "darwin") {
    return {
      filename: `${BRANDING.base_name}-macOS-universal-moz-artifact.dmg`,
      format: "dmg",
      platform: "darwin",
      architecture: "universal",
    };
  }

  throw new Error(
    `Unsupported platform: ${PLATFORM}. Supported: windows (x86_64), linux (x86_64, aarch64), darwin (universal)`,
  );
}

export function platformSupported(): boolean {
  try {
    return !!getBinArchive();
  } catch {
    return false;
  }
}
