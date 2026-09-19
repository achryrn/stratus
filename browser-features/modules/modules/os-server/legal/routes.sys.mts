// SPDX-License-Identifier: MPL-2.0

/**
 * Bundled Stratus legal pages (/legal/*) served over the local OS server.
 *
 * Serving over HTTP (content principal) avoids the Gecko dev-runtime
 * assertion that chrome:// documents must declare a custom CSP before
 * load; it also keeps the pages reachable across settings UI and
 * update-triggered tabs (offline, localhost-only, no third party).
 *
 * Files are read from the overlay's <app>/noraneko-devdir/legal dir, which
 * the injector symlinks to static/legal (canonical source in the repo).
 */

import type { NamespaceBuilder } from "../router.sys.mts";

const LEGAL_ROOT = "noraneko-devdir";
const LEGAL_DIR = "legal";

async function readLegalPage(
  fileName: string,
): Promise<string | null> {
  try {
    const appDir = Services.dirsvc.get("GreD", Ci.nsIFile).path;
    const filePath = PathUtils.join(appDir, LEGAL_ROOT, LEGAL_DIR, fileName);
    return await IOUtils.readUTF8(filePath);
  } catch (e) {
    console.error("[os-server] Failed to read legal page", fileName, e);
    return null;
  }
}

export function registerLegalRoutes(api: NamespaceBuilder): void {
  api.namespace("/legal", (n: NamespaceBuilder) => {
    for (const entry of [
      { route: "privacy-policy", file: "privacy-policy.html" },
      { route: "release-notes", file: "release-notes.html" },
    ]) {
      n.get(`/${entry.route}`, async () => {
        const html = await readLegalPage(entry.file);
        if (html === null) {
          return { status: 404, body: "legal page not found" };
        }
        return {
          status: 200,
          body: html,
          contentType: "text/html; charset=utf-8",
        };
      });
    }
  });
}
