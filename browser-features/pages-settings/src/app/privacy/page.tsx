/* M8.5 privacy & network toolkit settings page */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldHalf } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card.tsx";
import { Button } from "@/components/common/button.tsx";
import { Input } from "@/components/common/input.tsx";
import { rpc } from "../../lib/rpc/rpc.ts";
import { Ban, Palette } from "lucide-react";

const TIER_PREF = "stratus.privacy.tier";
const DNS_PREF = "stratus.dns.config";

type Tier = "default" | "strict" | "maximum";
type DnsProvider = "off" | "mozilla" | "cloudflare" | "custom";
interface DnsMode { provider: DnsProvider; mode: 0 | 2 | 3; customUri: string; }
interface DnsCfg { normal: DnsMode; private: DnsMode; }

const DEFAULT_DNS: DnsCfg = { normal: { provider: "off", mode: 0, customUri: "" }, private: { provider: "off", mode: 0, customUri: "" } };

function parseDns(raw: string | null): DnsCfg {
  if (!raw) return structuredClone(DEFAULT_DNS);
  try {
    const d = JSON.parse(raw) as Partial<DnsCfg>;
    const out = structuredClone(DEFAULT_DNS);
    for (const k of ["normal", "private"] as const) {
      const s = d[k];
      if (!s) continue;
      if (["off", "mozilla", "cloudflare", "custom"].includes(s.provider)) out[k].provider = s.provider;
      if (s.mode === 0 || s.mode === 2 || s.mode === 3) out[k].mode = s.mode;
      out[k].customUri = s.customUri ?? "";
    }
    return out;
  } catch { return structuredClone(DEFAULT_DNS); }
}

export default function PrivacyPage() {
  const { t } = useTranslation();
  const [tier, setTier] = useState<Tier | null>(null);
  const [dns, setDns] = useState<DnsCfg | null>(null);
  const [trackers, setTrackers] = useState<Record<string, number> | null>(null);
  const [saved, setSaved] = useState(false);
  const [adOn, setAdOn] = useState(false);
  const [adCount, setAdCount] = useState(0);
  const [gxPreset, setGxPreset] = useState<string>("gx");

  const loadTrackers = useCallback(async () => {
    const raw = await rpc.getStringPref("stratus.privacy.trackers", "{}");
    try { setTrackers(JSON.parse(raw)); } catch { setTrackers(null); }
  }, []);

  const loadGx = useCallback(async () => {
    try {
      const v = await rpc.getStringPref("stratus.theme.preset", "gx");
      setGxPreset(v === "classic" ? "classic" : "gx");
    } catch {
      setGxPreset("gx");
    }
  }, []);

  const loadAdBlocker = useCallback(async () => {
    const on = await rpc.getBoolPref("stratus.adblock.enabled", false);
    const n = await rpc.getIntPref("stratus.adblock.count", 0);
    setAdOn(on);
    setAdCount(n);
  }, []);

  useEffect(() => {
    void rpc.getStringPref(TIER_PREF).then((v) => setTier(v === "strict" || v === "maximum" ? v : "default"));
    void rpc.getStringPref(DNS_PREF).then((v) => setDns(parseDns(v)));
    void loadTrackers();
    void loadAdBlocker();
    void loadGx();
  }, [loadTrackers, loadAdBlocker, loadGx]);

  const persistTier = (next: Tier): void => {
    setTier(next);
    void rpc.setStringPref(TIER_PREF, next);
    setSaved(true); window.setTimeout(() => setSaved(false), 2200);
  };

  const persistDns = (next: DnsCfg): void => {
    setDns(next);
    void rpc.setStringPref(DNS_PREF, JSON.stringify(next));
    setSaved(true); window.setTimeout(() => setSaved(false), 2200);
  };

  const setModeDns = (mode: "normal" | "private", patch: Partial<DnsMode>): void => {
    if (!dns) return;
    void persistDns({ ...dns, [mode]: { ...dns[mode], ...patch } });
  };

  if (!tier || !dns) {
    return <div className="p-4">{t("privacy.loading")}</div>;
  }

  const TIERS: { id: Tier; label: string; desc: string }[] = [
    { id: "default", label: t("privacy.tiers.default.label"), desc: t("privacy.tiers.default.desc") },
    { id: "strict", label: t("privacy.tiers.strict.label"), desc: t("privacy.tiers.strict.desc") },
    { id: "maximum", label: t("privacy.tiers.maximum.label"), desc: t("privacy.tiers.maximum.desc") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShieldHalf className="size-5" />
        <h1 className="text-xl font-bold">{t("privacy.title")}</h1>
      </div>
      <p className="text-sm opacity-70">{t("privacy.description")}</p>

      <Card>
        <CardHeader>
          <CardTitle>{t("privacy.tiers.title")}</CardTitle>
          <CardDescription>{t("privacy.tiers.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {TIERS.map((tierItem) => (
            <label key={tierItem.id} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <input type="radio" name="tier" checked={tier === tierItem.id} onChange={() => persistTier(tierItem.id)} className="mt-1" />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{tierItem.label}</span>
                <span className="text-xs opacity-70">{tierItem.desc}</span>
              </span>
            </label>
          ))}
          {tier === "maximum" && <p className="text-xs text-amber-600">{t("privacy.maximumWarning")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("privacy.dns.title")}</CardTitle>
          <CardDescription>{t("privacy.dns.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(["normal", "private"] as const).map((m) => (
            <div key={m} className="rounded-md border p-3 flex flex-col gap-2">
              <span className="text-sm font-medium">{m === "normal" ? t("privacy.dns.normal") : t("privacy.dns.private")}</span>
              <div className="flex flex-wrap items-center gap-2">
                <select className="rounded-md border px-2 py-1 text-sm" value={dns[m].provider} onChange={(e) => setModeDns(m, { provider: e.target.value as DnsProvider, mode: e.target.value === "off" ? 0 : dns[m].mode })}>
                  <option value="off">{t("privacy.dns.off")}</option>
                  <option value="mozilla">{t("privacy.dns.mozilla")}</option>
                  <option value="cloudflare">{t("privacy.dns.cloudflare")}</option>
                  <option value="custom">{t("privacy.dns.custom")}</option>
                </select>
                {dns[m].provider !== "off" && (
                  <select className="rounded-md border px-2 py-1 text-sm" value={dns[m].mode === 3 ? "strict" : "fallback"} onChange={(e) => setModeDns(m, { mode: e.target.value === "strict" ? 3 : 2 })}>
                    <option value="fallback">{t("privacy.dns.fallback")}</option>
                    <option value="strict">{t("privacy.dns.strict")}</option>
                  </select>
                )}
                {dns[m].provider === "custom" && (
                  <Input className="w-64" placeholder="https://dns.example/dns-query" value={dns[m].customUri} onChange={(e) => setModeDns(m, { customUri: e.target.value })} />
                )}
              </div>
              {dns[m].mode > 0 && <span className="text-xs opacity-60">{t("privacy.dns.echNote")}</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("privacy.gx.title")}</CardTitle>
          <CardDescription>{t("privacy.gx.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Palette className="size-4 opacity-60" />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="gx" checked={gxPreset === "gx"} onChange={async () => {
                await rpc.setStringPref("stratus.theme.preset", "gx");
                setGxPreset("gx");
              }} />
              {t("privacy.gx.gx")}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="gx" checked={gxPreset === "classic"} onChange={async () => {
                await rpc.setStringPref("stratus.theme.preset", "classic");
                setGxPreset("classic");
              }} />
              {t("privacy.gx.classic")}
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("privacy.adblock.title")}</CardTitle>
          <CardDescription>{t("privacy.adblock.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={adOn} onChange={async (e) => {
              await rpc.setBoolPref("stratus.adblock.enabled", e.target.checked);
              void loadAdBlocker();
            }} className="size-4" />
            <span className="text-sm">{t("privacy.adblock.toggle")}</span>
          </label>
          <div className="flex items-center gap-3">
            <Ban className="size-4 opacity-60" />
            <span className="text-sm">{t("privacy.adblock.blocked")}: {adCount}</span>
            <Button variant="outline" size="sm" onClick={() => void rpc.setStringPref("stratus.adblock.clear", String(Date.now()))}>{t("privacy.adblock.reset")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("privacy.trackers.title")}</CardTitle>
          <CardDescription>{t("privacy.trackers.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {trackers ? (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded bg-muted px-2 py-1">{t("privacy.trackers.tracking")}: {trackers.tracking ?? 0}</span>
              <span className="rounded bg-muted px-2 py-1">{t("privacy.trackers.fingerprinting")}: {trackers.fingerprinting ?? 0}</span>
              <span className="rounded bg-muted px-2 py-1">{t("privacy.trackers.cryptomining")}: {trackers.cryptomining ?? 0}</span>
              <span className="rounded bg-muted px-2 py-1">{t("privacy.trackers.email")}: {trackers.email ?? 0}</span>
              <span className="rounded bg-muted px-2 py-1">{t("privacy.trackers.social")}: {trackers.social ?? 0}</span>
            </div>
          ) : (<span className="text-sm opacity-60">{t("privacy.trackers.empty")}</span>)}
          <div className="flex items-center gap-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => void rpc.setStringPref("stratus.privacy.trackersClear", String(Date.now()))}>{t("privacy.trackers.removeAll")}</Button>
            <Button variant="outline" size="sm" onClick={loadTrackers}>{t("privacy.trackers.refresh")}</Button>
          </div>
        </CardContent>
      </Card>

      {saved && <span className="text-sm text-green-600">{t("privacy.saved")}</span>}
    </div>
  );
}
