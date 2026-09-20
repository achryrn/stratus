// SPDX-License-Identifier: MPL-2.0

import * as path from "@std/path";
import {
  createSymlink,
  exists,
  Logger,
  runCommandChecked,
  safeRemove,
} from "./utils.ts";
import { BIN_DIR, PROD_BIN_DIR, PROJECT_ROOT } from "./defines.ts";

const logger = new Logger("injector");

const DEV_DIR_NAME = "noraneko-devdir";
const PROD_DIR_NAME = "noraneko";

/**
 * Rewrites chrome.manifest so the active overlay wiring (dev symlink farm or
 * production copy) is the only nora/noraneko registration present.
 */
export function setChromeManifestEntry(
  manifest: string,
  entry: string,
): string {
  const kept = manifest.split("\n").filter((line) => {
    const t = line.trim();
    return !t.startsWith("manifest noraneko");
  });
  while (kept.length > 0 && kept[kept.length - 1].trim() === "") kept.pop();
  if (kept.length > 0 && kept[kept.length - 1] !== entry) {
    kept.push(entry);
  }
  return kept.length === 0 ? `${entry}\n` : `${kept.join("\n")}\n`;
}

export interface XhtmlInjectionOptions {
  devPages?: boolean;
  isCI?: boolean;
  allowBrowserHttpLoader?: boolean;
}

export function buildXhtmlInjectionArgs(
  scriptPath: string,
  binPath: string,
  options: XhtmlInjectionOptions = {},
): string[] {
  const args = ["run", "--allow-read", "--allow-write", scriptPath, binPath];
  if (options.devPages) args.push("--dev");
  if (options.allowBrowserHttpLoader) {
    args.push("--allow-browser-http-loader");
  }
  return args;
}

export async function injectXhtmlFromTs(
  options: XhtmlInjectionOptions = {},
): Promise<void> {
  const scriptPath = path.join(PROJECT_ROOT, "tools", "scripts", "xhtml.ts");
  const isCI = options.isCI ?? false;
  let binPath = !isCI ? BIN_DIR : PROD_BIN_DIR;

  // In CI, the default PROJECT_ROOT is incorrect because scripts run from a subdir.
  // We must manually construct the correct path to the build artifacts.
  if (isCI) {
    // The real project root in CI is one level above the script's calculated PROJECT_ROOT.
    const ciProjectRoot = path.resolve(PROJECT_ROOT, "..");
    const distDir = path.join(
      ciProjectRoot,
      "obj-artifact-build-output",
      "dist",
    );

    const canonPlatform = Deno.env.get("CANON_PLATFORM");
    if (canonPlatform === "macOS-x86_64") {
      let appBundleFound = false;
      try {
        for await (const dirEntry of Deno.readDir(distDir)) {
          if (dirEntry.isDirectory && dirEntry.name.endsWith(".app")) {
            binPath = path.join(
              distDir,
              dirEntry.name,
              "Contents",
              "Resources",
            );
            appBundleFound = true;
            logger.info(
              `Found macOS app bundle, setting binPath to: ${binPath}`,
            );
            break;
          }
        }
      } catch (e: unknown) {
        logger.warn(
          `Could not read dist directory ${distDir} for macOS .app bundle search: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
      if (!appBundleFound) {
        logger.warn(
          `macOS platform detected, but no .app bundle found in ${distDir}. Using default PROD_BIN_DIR.`,
        );
        // The default PROD_BIN_DIR is also relative to the wrong root, so we construct an absolute path.
        binPath = path.join(distDir, "bin");
      }
    } else {
      // For non-macOS CI builds, the path is obj-artifact-build-output/dist/bin
      binPath = path.join(distDir, "bin");
      logger.info(`CI platform detected, setting binPath to: ${binPath}`);
    }
  }

  const args = buildXhtmlInjectionArgs(scriptPath, binPath, options);

  const result = runCommandChecked("deno", args);
  if (!result.success) {
    throw new Error(`Failed to inject XHTML: ${result.stderr}`);
  }
  logger.success("XHTML injection complete.");
  // Keep function legitimately async to match callers that await it
  // and satisfy the lint rule requiring at least one await.
  await Promise.resolve();
}

export function createManifest(mode: string, dirPath: string) {
  let manifestContent = [
    "content noraneko content/ contentaccessible=yes",
    "content noraneko-startup startup/ contentaccessible=yes",
    "content noraneko-skin skin/ contentaccessible=yes",
    "resource noraneko resource/ contentaccessible=yes",
    "content noraneko-pages-aboutdialog pages-aboutDialog/ contentaccessible=yes",
    "override chrome://browser/content/aboutDialog.xhtml chrome://noraneko-pages-aboutdialog/content/aboutDialog.html",
  ].join("\n");

  // if (dev) the pages should be served in vite dev server
  // stage and productions needs static contents
  if (mode !== "dev") {
    const devEntries = [
      "content noraneko-newtab pages-newtab/ contentaccessible=yes",
      "content noraneko-welcome pages-welcome/ contentaccessible=yes",
      "content noraneko-notes pages-notes/ contentaccessible=yes",
      "content noraneko-modal-child pages-modal-child/ contentaccessible=yes",
      "content noraneko-settings pages-settings/ contentaccessible=yes",
      "content noraneko-profile-manager pages-profile-manager/ contentaccessible=yes",
    ].join("\n");
    manifestContent += "\n" + devEntries;
  }

  Deno.writeTextFileSync(
    path.join(dirPath, "noraneko.manifest"),
    manifestContent,
  );
}

/**
 * This creates chrome.manifest, and symlinks the dists to firefox binary dir.
 * for production, only symlinks will be created.
 * @param mode
 * @param dirName
 */
/**
 * Copies a mount target into the overlay directory as real files (no
 * symlinks), skipping tooling-only directories such as node_modules.
 */
function copyMount(targetPath: string, destPath: string): void {
  function walk(from: string, to: string): void {
    Deno.mkdirSync(to, { recursive: true });
    for (const entry of Deno.readDirSync(from)) {
      if (entry.isDirectory && entry.name === "node_modules") continue;
      const src = path.join(from, entry.name);
      const dst = path.join(to, entry.name);
      if (entry.isDirectory) {
        walk(src, dst);
      } else if (entry.isSymlink) {
        Deno.copyFileSync(path.resolve(Deno.readLinkSync(src)), dst);
      } else {
        Deno.copyFileSync(src, dst);
      }
    }
  }
  walk(targetPath, destPath);
}

/**
 * Wires the overlay into the runtime tree.
 *
 * - "dev" | "stage" | "test": registers the symlink farm (noraneko-devdir)
 *   pointing at the built package outputs, so HMR servers can serve them.
 * - "production": copies the built package outputs as real files into
 *   noraneko/, producing a portable tree with no dev server and no symlinks.
 *
 * Only the active wiring is referenced from chrome.manifest; the inactive
 * overlay directory is removed.
 */
export function run(mode: string, dirName?: string): void {
  const isProduction = mode === "production";
  const activeDir = dirName ?? (isProduction ? PROD_DIR_NAME : DEV_DIR_NAME);
  const inactiveDir = isProduction ? DEV_DIR_NAME : PROD_DIR_NAME;

  // Rewrite chrome.manifest so the active wiring is the only registration.
  const manifestPath = path.join(BIN_DIR, "chrome.manifest");
  if (exists(manifestPath)) {
    const manifest = Deno.readTextFileSync(manifestPath);
    const entry = `manifest ${activeDir}/noraneko.manifest`;
    Deno.writeTextFileSync(manifestPath, setChromeManifestEntry(manifest, entry));
  }

  const dirPath = path.join(BIN_DIR, activeDir);
  try {
    if (exists(dirPath)) {
      safeRemove(dirPath);
    }
    Deno.mkdirSync(dirPath, { recursive: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(`Failed to prepare directory ${dirPath}: ${msg}`);
    throw e;
  }

  createManifest(mode, dirPath);

  const mounts: Array<[string, string]> = [
    ["content", "bridge/loader-features/_dist"],
    ["startup", "bridge/startup/_dist"],
    ["skin", "browser-features/skin"],
    ["legal", "static/legal"],
    ["resource", "bridge/loader-modules/_dist"],
    ["pages-newtab", "browser-features/pages-newtab/_dist"],
    ["pages-settings", "browser-features/pages-settings/_dist"],
    ["pages-welcome", "browser-features/pages-welcome/_dist"],
    ["pages-notes", "browser-features/pages-notes/_dist"],
    ["pages-modal-child", "browser-features/pages-modal-child/_dist"],
    ["pages-profile-manager", "browser-features/pages-profile-manager/_dist"],
    ["pages-aboutDialog", "browser-features/pages-aboutDialog/_dist"],
  ];

  for (const [subdir, target] of mounts) {
    const destPath = path.resolve(dirPath, subdir);
    const targetPath = path.resolve(target);
    try {
      if (exists(destPath)) {
        safeRemove(destPath);
      }
    } catch {
      // ignore
    }

    if (isProduction) {
      copyMount(targetPath, destPath);
      logger.success(`Copied ${subdir} into production overlay.`);
    } else {
      try {
        createSymlink(destPath, targetPath);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.warn(
          `Failed to create symlink ${destPath} -> ${targetPath}: ${msg}`,
        );
      }
    }
  }

  // Keep only the active overlay directory in the tree.
  const inactivePath = path.join(BIN_DIR, inactiveDir);
  if (exists(inactivePath)) {
    safeRemove(inactivePath);
  }

  logger.success(`Manifest injected successfully (${mode}, ${activeDir}).`);
}
