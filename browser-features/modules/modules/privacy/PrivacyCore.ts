/**
 * M8.5a privacy toolkit — pure decision core.
 * Tier mapping (documented in the settings page):
 *  default: ETP Strict + Total Cookie Protection + fingerprinting protection,
 *           DNS resolver as configured per mode.
 *  strict:  default + all fingerprintingProtection categories, timer precision.
 *  maximum: strict + resistFingerprinting (full RFP noise; may break sites —
 *           per-site guard documented; the 3.10 compatibility battery starts
 *           at the default tier).
 */

export type PrivacyTier = "default" | "strict" | "maximum";
export const PRIVACY_TIERS: PrivacyTier[] = ["default", "strict", "maximum"];

export type DnsProvider = "off" | "mozilla" | "cloudflare" | "custom";
export type DnsStrictness = "fallback" | "strict";

export interface DnsModeConfig {
  provider: DnsProvider;
  mode: 0 | 2 | 3;
  customUri: string;
}

export interface DnsConfig {
  normal: DnsModeConfig;
  private: DnsModeConfig;
}

export const DEFAULT_DNS_CONFIG: DnsConfig = {
  normal: { provider: "off", mode: 0, customUri: "" },
  private: { provider: "off", mode: 0, customUri: "" },
};

/**
 * Map a provider + strictness choice onto a DnsModeConfig.
 * provider off -> mode 0 (system resolver); strictness ignored then.
 */
export function dnsConfigFor(
  provider: DnsProvider,
  strictness: DnsStrictness,
  customUri: string,
): DnsModeConfig {
  if (provider === "off") {
    return { provider: "off", mode: 0, customUri: "" };
  }
  return {
    provider,
    mode: strictness === "strict" ? 3 : 2,
    customUri: provider === "custom" ? customUri.trim() : "",
  };
}

/** Provider URI for a config, or null when mode is 0. */
export function dnsUriFor(
  cfg: DnsModeConfig,
  fallbackUri: string,
): string | null {
  if (cfg.mode <= 0) return null;
  if (cfg.provider === "custom") return cfg.customUri || null;
  return fallbackUri;
}

export function parseDnsConfig(raw: string | null | undefined): DnsConfig {
  const base = structuredClone(DEFAULT_DNS_CONFIG);
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as { normal?: Partial<DnsModeConfig>; private?: Partial<DnsModeConfig> };
    for (const mode of ["normal", "private"] as const) {
      const s = d[mode];
      if (!s) continue;
      if (typeof s.provider === "string" && (["off", "mozilla", "cloudflare", "custom"] as string[]).includes(s.provider)) {
        base[mode].provider = s.provider as DnsProvider;
      }
      const m = Number(s.mode);
      if (m === 0 || m === 2 || m === 3) base[mode].mode = m as 0 | 2 | 3;
      base[mode].customUri = typeof s.customUri === "string" ? s.customUri : "";
    }
  } catch {
    /* keep defaults */
  }
  return base;
}

export function serializeDnsConfig(cfg: DnsConfig): string {
  return JSON.stringify(cfg);
}

/**
 * Tracker classification: nsIClassifiedChannel matched lists map to the
 * public categories shown in the UI.
 */
export type TrackerCategory = "tracking" | "fingerprinting" | "cryptomining" | "email" | "social";
export const TRACKER_CATEGORIES: TrackerCategory[] = [
  "tracking",
  "fingerprinting",
  "cryptomining",
  "email",
  "social",
];

export function classifyMatchedList(list: string): TrackerCategory {
  const l = list.toLowerCase();
  if (l.includes("fingerprint")) return "fingerprinting";
  if (l.includes("cryptomining")) return "cryptomining";
  if (l.includes("email")) return "email";
  if (l.includes("social")) return "social";
  return "tracking";
}

export interface TrackerState {
  counts: Record<TrackerCategory, number>;
  domains: Record<TrackerCategory, string[]>;
}

export function emptyTrackerState(): TrackerState {
  return {
    counts: { tracking: 0, fingerprinting: 0, cryptomining: 0, email: 0, social: 0 },
    domains: { tracking: [], fingerprinting: [], cryptomining: [], email: [], social: [] },
  };
}

export function recordTracker(
  state: TrackerState,
  category: TrackerCategory,
  host: string,
): TrackerState {
  const next: TrackerState = {
    counts: { ...state.counts },
    domains: { tracking: [...state.domains.tracking], fingerprinting: [...state.domains.fingerprinting], cryptomining: [...state.domains.cryptomining], email: [...state.domains.email], social: [...state.domains.social] },
  };
  next.counts[category] += 1;
  if (!next.domains[category].includes(host)) {
    next.domains[category].push(host);
    if (next.domains[category].length > 12) next.domains[category].shift();
  }
  return next;
}

export function mergeTracker(a: TrackerState, b: TrackerState): TrackerState {
  const out = emptyTrackerState();
  for (const c of TRACKER_CATEGORIES) {
    out.counts[c] = a.counts[c] + b.counts[c];
    out.domains[c] = [...a.domains[c], ...b.domains[c]].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 12);
  }
  return out;
}
