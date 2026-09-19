// SPDX-License-Identifier: MPL-2.0

// M8.3: os-server API for the per-mode VPN config (settings page + tools).

import type { NamespaceBuilder } from "../router.sys.mts";
import {
  getVpnConfig,
  setVpnModeEnabled,
  setVpnProxy,
  setVpnLocation,
  getActiveVpnMode,
  setActiveVpnMode,
} from "../../vpn/VpnManager.sys.mjs";

type VpnPostBody = {
  mode?: "normal" | "private";
  enabled?: boolean;
  proxy?: { host?: string; port?: number; type?: "http" | "socks" };
  location?: string;
  activeMode?: "normal" | "private" | "";
};

export function registerVpnRoutes(api: NamespaceBuilder): void {
  api.namespace("/vpn", (n: NamespaceBuilder) => {
    n.get("/config", () => ({
      status: 200,
      body: { config: getVpnConfig(), activeMode: getActiveVpnMode() },
    }));

    n.post<VpnPostBody, unknown>("/config", (ctx) => {
      const data = ctx.json<VpnPostBody>();
      if (!data) {
        return { status: 400, body: { error: "empty body" } };
      }
      if (data.mode) {
        setVpnModeEnabled(data.mode, data.enabled === true);
      }
      if (data.proxy) {
        setVpnProxy({
          host: data.proxy.host ?? "",
          port: Number(data.proxy.port) || 0,
          type: data.proxy.type === "socks" ? "socks" : "http",
        });
      }
      if (typeof data.location === "string") {
        setVpnLocation(data.location);
      }
      if (typeof data.activeMode === "string") {
        setActiveVpnMode(data.activeMode as "normal" | "private" | "");
      }
      return { status: 200, body: { config: getVpnConfig(), activeMode: getActiveVpnMode() } };
    });
  });
}
