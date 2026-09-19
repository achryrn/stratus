/**
 * M8.4 trusted-site actions allowlist — pure decision core.
 *
 * A curated set of sites may trigger browser behaviors that normal sites cannot
 * (fullscreen without a user gesture while the allowlisted site is focused,
 * notification/autoplay/window-management grants). Everything else keeps the
 * default security behavior. Empty by default, UI-visible and reversible.
 */

export type TrustedAction =
  "fullscreen" | "window-management" | "notifications" | "autoplay";

export const TRUSTED_ACTIONS: TrustedAction[] = [
  "fullscreen",
  "window-management",
  "notifications",
  "autoplay",
];

export interface TrustedSiteEntry {
  /** Stable id for removal/toggling. */
  id: string;
  /** Host pattern: "example.com", "*.example.com", with optional ":port". */
  pattern: string;
  actions: Record<TrustedAction, boolean>;
}

export type TrustedSitesConfig = TrustedSiteEntry[];

export const EMPTY_TRUSTED_SITES: TrustedSitesConfig = [];

export function defaultActions(): Record<TrustedAction, boolean> {
  return {
    fullscreen: false,
    "window-management": false,
    notifications: true,
    autoplay: false,
  };
}

/** Parse + validate the JSON config pref. Never throws. */
export function parseTrustedSites(raw: string | null | undefined): TrustedSitesConfig {
  if (!raw) {
    return structuredClone(EMPTY_TRUSTED_SITES);
  }
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      return structuredClone(EMPTY_TRUSTED_SITES);
    }
    const out: TrustedSitesConfig = [];
    for (const item of data) {
      if (typeof item !== "object" || item === null) continue;
      const rec = item as Record<string, unknown>;
      if (typeof rec.pattern !== "string" || !validPattern(rec.pattern)) continue;
      const id = typeof rec.id === "string" && rec.id ? rec.id : makeId();
      const rawActions = (typeof rec.actions === "object" && rec.actions !== null
        ? (rec.actions as Record<string, unknown>)
        : {});
      const actions = defaultActions();
      for (const a of TRUSTED_ACTIONS) {
        if (typeof rawActions[a] === "boolean") {
          actions[a] = rawActions[a] as boolean;
        }
      }
      out.push({ id, pattern: normalizePattern(rec.pattern), actions });
    }
    return out;
  } catch {
    return structuredClone(EMPTY_TRUSTED_SITES);
  }
}

export function serializeTrustedSites(cfg: TrustedSitesConfig): string {
  return JSON.stringify(cfg);
}

let idCounter = 0;
export function makeId(): string {
  idCounter += 1;
  return "site-" + Date.now().toString(36) + "-" + idCounter.toString(36);
}

/** Strip scheme/path; keep host (lowercased) and optional port. */
export function normalizePattern(input: string): string {
  let p = input.trim().toLowerCase();
  if (!p) return p;
  // drop scheme + path
  p = p.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").split("/")[0];
  // drop userinfo
  p = p.replace(/^.*@/, "");
  return p;
}

export function validPattern(input: string): boolean {
  const p = normalizePattern(input);
  if (!p) return false;
  if (/^\*/.test(p) && !p.startsWith("*.")) return false;
  const host = p.replace(/^\*\./, "").replace(/:\d+$/, "");
  if (!/^[a-z0-9.-]+$/i.test(host)) return false;
  return host.includes(".") || host === "localhost";
}

function hostAndPort(pattern: string): { host: string; port: number | null } {
  const p = pattern.replace(/^\*\./, "");
  const m = /^(\[?[a-z0-9.-]+\]?)(?::(\d+))?$/.exec(p);
  if (!m) return { host: p.replace(/^\*\./, ""), port: null };
  const host = m[1]!;
  const port = m[2] ? Number(m[2]) : null;
  return { host, port };
}

function wildcardMatch(patternHost: string, host: string): boolean {
  if (patternHost === host) return true;
  const suffix = "." + patternHost;
  return host.endsWith(suffix);
}

export interface TrustedMatch {
  entry: TrustedSiteEntry;
  allowed: Record<TrustedAction, boolean>;
}

export interface HostInfo {
  host: string;
  hostPort: string;
}

/**
 * Resolve whether a host (from the focused tab URL, or an Origin) is on the
 * allowlist and which actions are active. Exported entry-point for the manager
 * and tests. hostPort includes the port ("127.0.0.1:5999") when present.
 */
export function matchTrustedSite(
  cfg: TrustedSitesConfig,
  info: HostInfo,
): TrustedMatch | null {
  const host = info.host.toLowerCase();
  const hostPort = info.hostPort.toLowerCase();
  for (const entry of cfg) {
    const { host: pHost, port } = hostAndPort(entry.pattern);
    if (!wildcardMatch(pHost, host)) continue;
    if (port !== null) {
      const p = hostPort.split(":")[1] ?? (host === "localhost" ? "80" : "");
      const actualPort = Number(p) || 80;
      if (actualPort !== port) continue;
    }
    return { entry, allowed: { ...entry.actions } };
  }
  return null;
}

/** Convenience: does any entry match and grant the action? */
export function isTrustedActionGranted(
  cfg: TrustedSitesConfig,
  info: HostInfo,
  action: TrustedAction,
): boolean {
  const m = matchTrustedSite(cfg, info);
  return m ? m.allowed[action] : false;
}

export function hostInfoFromUrl(raw: string): HostInfo {
  try {
    const u = new URL(raw);
    return { host: u.hostname.toLowerCase(), hostPort: (u.hostname + (u.port ? ":" + u.port : "")).toLowerCase() };
  } catch {
    return { host: "", hostPort: "" };
  }
}
