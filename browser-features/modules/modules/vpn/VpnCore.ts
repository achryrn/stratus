// SPDX-License-Identifier: MPL-2.0

/**
 * M8.3: framework-free per-mode VPN decision.
 *
 * Decides whether the CURRENT mode should route through the configured
 * proxy, so "VPN on in private mode" never applies to normal browsing and
 * vice versa. Bypass targets (loopback, RFC1918 intranet, .local mDNS,
 * update endpoints) are always direct.
 */

export type VpnMode = "normal" | "private";
export type ProxyType = "http" | "socks";

export interface VpnProxyConfig {
  host: string;
  port: number;
  type: ProxyType;
}

export interface VpnConfig {
  enabled: { normal: boolean; private: boolean };
  proxy: VpnProxyConfig;
  /** Region selector. v1: only "auto" is offered. */
  location: string;
}

export const DEFAULT_VPN_CONFIG: VpnConfig = {
  enabled: { normal: false, private: false },
  proxy: { host: "", port: 0, type: "http" },
  location: "auto",
};

export function cloneConfig(cfg: VpnConfig): VpnConfig {
  return {
    enabled: { normal: cfg.enabled.normal, private: cfg.enabled.private },
    proxy: { host: cfg.proxy.host, port: cfg.proxy.port, type: cfg.proxy.type },
    location: cfg.location,
  };
}

/** Always-direct hostnames (loopback + local network + update infra). */
export function isAlwaysDirectHost(host: string): boolean {
  const h = (host || "").toLowerCase().replace(/\.$/, "");
  if (!h) {
    return true;
  }
  if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]") {
    return true;
  }
  if (h.endsWith(".local") || h.endsWith(".localhost")) {
    return true;
  }
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return true;
    }
  }
  if (h === "updates.floorp.app") {
    return true;
  }
  return false;
}

export type LoadInfoLike = {
  originAttributes?: { privateBrowsingId?: number } | null;
} | null;

export function modeOfLoadInfo(loadInfo: LoadInfoLike): VpnMode {
  return loadInfo?.originAttributes?.privateBrowsingId &&
    loadInfo.originAttributes.privateBrowsingId > 0
    ? "private"
    : "normal";
}

/**
 * Whether the given mode is set to route through the proxy right now.
 * A configured proxy endpoint is required (host + port).
 */
export function isModeProxyEnabled(config: VpnConfig, mode: VpnMode): boolean {
  return config.enabled[mode] === true &&
    !!config.proxy.host &&
    config.proxy.port > 0;
}

/**
 * no_proxies_on value for the proxy pref: everything that must ALWAYS go
 * direct (loopback, RFC1918, .local, update infra, local dev servers).
 */
export function buildNoProxyList(): string {
  return [
    "localhost",
    "127.0.0.1",
    "::1",
    "10.*",
    "172.16.*",
    "172.17.*",
    "172.18.*",
    "172.19.*",
    "172.20.*",
    "172.21.*",
    "172.22.*",
    "172.23.*",
    "172.24.*",
    "172.25.*",
    "172.26.*",
    "172.27.*",
    "172.28.*",
    "172.29.*",
    "172.30.*",
    "172.31.*",
    "192.168.*",
    "*.local",
    "updates.floorp.app",
    "localhost:5181",
    "localhost:5183",
  ].join(", ");
}
