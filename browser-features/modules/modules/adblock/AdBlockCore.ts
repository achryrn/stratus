/**
 * M8.5b built-in undetected ad blocker — pure decision core.
 *
 * Blocking is a TRANSPARENT redirect to a 1x1 GIF stub (empirically proven on
 * this runtime: http-on-modify-request + nsIHttpChannel.redirectTo(data:image/
 * gif,...) makes <img> and fetch()-style probes resolve SUCCESSFULLY) instead of
 * a hard cancel, so anti-adblock checks that treat network failures as "blocked"
 * cannot detect it. No extension is involved, so chrome.runtime probes are moot.
 */

export interface AdBlockRule {
  /** Host pattern: "doubleclick.net" or "*.doubleclick.net" (host and subdomains). */
  host: string;
  /** Optional :port suffix for local fixtures. */
  port: number | null;
}

/** 1x1 transparent GIF. */
export const STUB_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Starter author list (EasyList/EasyPrivacy-style hosts commonly targeted by
 * anti-adblock walls and ad networks). Shipped compact; extendable at build time.
 */
export const BUILTIN_AD_LIST: string[] = [
  "doubleclick.net",
  "googlesyndication.com",
  "googletagservices.com",
  "adservice.google.com",
  "googleadservices.com",
  "adnxs.com",
  "adsrvr.org",
  "taboola.com",
  "outbrain.com",
  "criteo.com",
  "criteo.net",
  "ads-twitter.com",
  "adroll.com",
  "amazon-adsystem.com",
  "casalemedia.com",
  "moatads.com",
  "pubmatic.com",
  "rubiconproject.com",
  "openx.net",
  "adsafeprotected.com",
];

export function parseRule(raw: string): AdBlockRule | null {
  let r = raw.trim().toLowerCase();
  if (!r) return null;
  r = r.replace(/^https?:\/\//, "").split("/")[0];
  if (r.startsWith("*.")) r = r.slice(2);
  const m = /^([^:]+)(?::(\d+))?$/.exec(r);
  if (!m) return null;
  const host = m[1]!.replace(/^\.+/, "");
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) return null;
  return { host, port: m[2] ? Number(m[2]) : null };
}

export function buildRules(list: string[]): AdBlockRule[] {
  const out: AdBlockRule[] = [];
  for (const line of list) {
    const r = parseRule(line);
    if (r) out.push(r);
  }
  return out;
}

export function matchesAdUrl(rules: AdBlockRule[], rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const port = u.port ? Number(u.port) : null;
    for (const rule of rules) {
      if (rule.port !== null && port !== rule.port) continue;
      if (host === rule.host || host.endsWith("." + rule.host)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
