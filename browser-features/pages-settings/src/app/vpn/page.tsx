import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/card.tsx";
import { Button } from "@/components/common/button.tsx";
import { Input } from "@/components/common/input.tsx";
import { Switch } from "@/components/common/switch.tsx";
import { rpc } from "../../lib/rpc/rpc.ts";

const VPN_CONFIG_PREF = "stratus.vpn.config";

interface VpnConfig {
  enabled: { normal: boolean; private: boolean };
  proxy: { host: string; port: number; type: "http" | "socks" };
  location: string;
}

const DEFAULT_CONFIG: VpnConfig = {
  enabled: { normal: false, private: false },
  proxy: { host: "", port: 0, type: "http" },
  location: "auto",
};

async function loadConfig(): Promise<VpnConfig> {
  const raw = (await rpc.getStringPref(VPN_CONFIG_PREF)) ?? null;
  if (!raw) {
    return structuredClone(DEFAULT_CONFIG);
  }
  try {
    const data = JSON.parse(raw) as Partial<VpnConfig>;
    return {
      enabled: {
        normal: data.enabled?.normal === true,
        private: data.enabled?.private === true,
      },
      proxy: {
        host: typeof data.proxy?.host === "string" ? data.proxy.host : "",
        port: Number(data.proxy?.port) || 0,
        type: data.proxy?.type === "socks" ? "socks" : "http",
      },
      location: typeof data.location === "string" ? data.location : "auto",
    };
  } catch (e) {
    console.error("[vpn-settings] bad config pref:", e);
    return structuredClone(DEFAULT_CONFIG);
  }
}

export default function VpnSettingsPage() {
  const { t } = useTranslation();
  const [cfg, setCfg] = useState<VpnConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadConfig().then(setCfg);
  }, []);

  const persist = useCallback(async (next: VpnConfig) => {
    await rpc.setStringPref(VPN_CONFIG_PREF, JSON.stringify(next));
    setCfg(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }, []);

  if (!cfg) {
    return <div className="p-4">{t("vpn.loading")}</div>;
  }

  const toggle = (mode: "normal" | "private", on: boolean): void => {
    void persist({
      ...cfg,
      enabled: { ...cfg.enabled, [mode]: on },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5" />
        <h1 className="text-xl font-bold">{t("vpn.title")}</h1>
      </div>
      <p className="text-sm opacity-70">{t("vpn.description")}</p>

      <Card>
        <CardHeader>
          <CardTitle>{t("vpn.normalCard.title")}</CardTitle>
          <CardDescription>{t("vpn.normalCard.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm">
            {cfg.enabled.normal ? t("vpn.on") : t("vpn.off")}
          </span>
          <Switch
            checked={cfg.enabled.normal}
            onChange={(e) => toggle("normal", e.target.checked)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("vpn.privateCard.title")}</CardTitle>
          <CardDescription>{t("vpn.privateCard.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm">
            {cfg.enabled.private ? t("vpn.on") : t("vpn.off")}
          </span>
          <Switch
            checked={cfg.enabled.private}
            onChange={(e) => toggle("private", e.target.checked)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("vpn.proxyCard.title")}</CardTitle>
          <CardDescription>{t("vpn.proxyCard.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Input
              className="flex-1"
              placeholder="127.0.0.1"
              value={cfg.proxy.host}
              onChange={(e) =>
                void persist({
                  ...cfg,
                  proxy: { ...cfg.proxy, host: e.target.value },
                })
              }
            />
            <Input
              className="w-28"
              type="number"
              placeholder="8080"
              value={String(cfg.proxy.port)}
              onChange={(e) =>
                void persist({
                  ...cfg,
                  proxy: { ...cfg.proxy, port: Number(e.target.value) || 0 },
                })
              }
            />
            <select
              className="rounded-md border px-2 py-1 text-sm"
              value={cfg.proxy.type}
              onChange={(e) =>
                void persist({
                  ...cfg,
                  proxy: {
                    ...cfg.proxy,
                    type: e.target.value === "socks" ? "socks" : "http",
                  },
                })
              }
            >
              <option value="http">HTTP</option>
              <option value="socks">SOCKS5</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm">{t("vpn.regionLabel")}</label>
            <select
              className="rounded-md border px-2 py-1 text-sm"
              value={cfg.location}
              onChange={(e) =>
                void persist({ ...cfg, location: e.target.value })
              }
            >
              <option value="auto">{t("vpn.regionAuto")}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        {saved && <span className="text-sm text-green-600">{t("vpn.saved")}</span>}
        <Button onClick={() => void loadConfig().then(setCfg)}>
          {t("vpn.reload")}
        </Button>
      </div>
    </div>
  );
}
