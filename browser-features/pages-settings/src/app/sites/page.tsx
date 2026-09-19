/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * M8.4 trusted-site actions allowlist settings page.
 * Sites listed here may control the window (move/resize, notifications,
 * autoplay) and — while they are the focused tab — trigger fullscreen
 * without a user gesture. Empty by default; private windows excluded.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MonitorUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card.tsx";
import { Button } from "@/components/common/button.tsx";
import { Input } from "@/components/common/input.tsx";
import { Switch } from "@/components/common/switch.tsx";
import { rpc } from "../../lib/rpc/rpc.ts";

const TRUSTED_SITES_PREF = "stratus.permissions.trustedSites";

type TrustedAction = "fullscreen" | "window-management" | "notifications" | "autoplay";

interface TrustedSiteEntry {
  id: string;
  pattern: string;
  actions: Record<TrustedAction, boolean>;
}

const ACTIONS: TrustedAction[] = ["fullscreen", "window-management", "notifications", "autoplay"];

function parse(raw: string | null): TrustedSiteEntry[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is TrustedSiteEntry =>
      typeof x === "object" && x !== null && typeof (x as TrustedSiteEntry).pattern === "string"
    );
  } catch {
    return [];
  }
}

export default function TrustedSitesPage() {
  const { t } = useTranslation();
  const [sites, setSites] = useState<TrustedSiteEntry[] | null>(null);
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void rpc.getStringPref(TRUSTED_SITES_PREF).then((raw) => setSites(parse(raw)));
  }, []);

  const persist = useCallback(async (next: TrustedSiteEntry[]) => {
    await rpc.setStringPref(TRUSTED_SITES_PREF, JSON.stringify(next));
    setSites(next);
    setSaved(true);
    globalThis.setTimeout(() => setSaved(false), 2500);
  }, []);

  const add = (): void => {
    const pattern = input.trim().toLowerCase();
    if (!pattern) return;
    const current = sites ?? [];
    if (current.some((s) => s.pattern === pattern)) return;
    const entry: TrustedSiteEntry = {
      id: "site-" + Date.now().toString(36),
      pattern,
      actions: { fullscreen: true, "window-management": true, notifications: true, autoplay: false },
    };
    void persist([...current, entry]);
    setInput("");
  };

  const remove = (id: string): void => {
    void persist((sites ?? []).filter((s) => s.id !== id));
  };

  const toggleAction = (id: string, action: TrustedAction): void => {
    const current = sites ?? [];
    void persist(current.map((s) =>
      s.id === id ? { ...s, actions: { ...s.actions, [action]: !s.actions[action] } } : s
    ));
  };

  if (!sites) {
    return <div className="p-4">{t("sites.loading")}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MonitorUp className="size-5" />
        <h1 className="text-xl font-bold">{t("sites.title")}</h1>
      </div>
      <p className="text-sm opacity-70">{t("sites.description")}</p>

      <Card>
        <CardHeader>
          <CardTitle>{t("sites.addCard.title")}</CardTitle>
          <CardDescription>{t("sites.addCard.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input
            className="flex-1"
            placeholder="*.example.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          />
          <Button onClick={add}>{t("sites.add")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sites.list.title")}</CardTitle>
          <CardDescription>{t("sites.list.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sites.length === 0 && (
            <span className="text-sm opacity-60">{t("sites.empty")}</span>
          )}
          {sites.map((s) => (
            <div key={s.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{s.pattern}</span>
                <Button variant="outline" size="sm" onClick={() => remove(s.id)}>
                  {t("sites.remove")}
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {ACTIONS.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm">
                    <Switch checked={s.actions[a]} onChange={() => toggleAction(s.id, a)} />
                    {t("sites.actions." + a)}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {sites.some((s) => s.actions.fullscreen) && (
        <p className="text-xs text-amber-600">{t("sites.fullscreenWarning")}</p>
      )}

      <div className="flex items-center gap-3">
        {saved && <span className="text-sm text-green-600">{t("sites.saved")}</span>}
      </div>
    </div>
  );
}
