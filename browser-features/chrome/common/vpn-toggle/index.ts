/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// M8.3: per-mode VPN toolbar toggle. The button reflects and toggles ONLY
// the mode of the window it lives in (normal vs private window) — the two
// modes never share a switch.

import { noraComponent, NoraComponentBase } from "#features-chrome/utils/base";
import { BrowserActionUtils } from "#features-chrome/utils/browser-action.tsx";
import i18next from "i18next";
import { StyleElement } from "./style.tsx";

// Services is a global in the chrome scope on this build.

const BUTTON_ID = "vpn-toggle-button";
const {
  VpnManager,
  VPN_UPDATED_TOPIC,
} = ChromeUtils.importESModule(
  "resource://noraneko/modules/vpn/VpnManager.sys.mjs",
) as {
  VpnManager: {
    getConfig(): { enabled: { normal: boolean; private: boolean } };
    setModeEnabled(mode: "normal" | "private", on: boolean): void;
  };
  VPN_UPDATED_TOPIC: string;
};

type WindowLike = Window & {
  gBrowser?: {
    selectedBrowser?: {
      browsingContext?: {
        originAttributes?: { privateBrowsingId?: number }
      }
    }
  }
};

function thisWindowMode(): "normal" | "private" {
  try {
    const win = window as unknown as WindowLike;
    const pbId =
      win.gBrowser?.selectedBrowser?.browsingContext?.originAttributes
        ?.privateBrowsingId ?? 0;
    return pbId > 0 ? "private" : "normal";
  } catch (e) {
    console.error("[vpn-toggle] window mode detection failed:", e);
    return "normal";
  }
}

@noraComponent(import.meta.hot)
export default class VpnToggleFeature extends NoraComponentBase {
  private node: XULElement | null = null;
  private observer: (() => void) | null = null;

  override init(): void {
    this.logger.debug("Initializing VPN toolbar toggle");
    if (typeof document === "undefined") {
      return;
    }
    this.createToolbarButton();
    // Services.obs.addObserver returns an unregister function at runtime;
    // the fork's .d.ts types it as void, so cast on the boundary.
    this.observer = Services.obs.addObserver(
      () => this.refreshLabel(),
      VPN_UPDATED_TOPIC,
    ) as unknown as (() => void);
  }

  uninit(): void {
    this.observer?.();
    this.observer = null;
  }

  private createToolbarButton(): void {
    BrowserActionUtils.createToolbarClickActionButton(
      BUTTON_ID,
      BUTTON_ID,
      () => {
        const mode = thisWindowMode();
        const config = VpnManager.getConfig();
        const next = !config.enabled[mode];
        VpnManager.setModeEnabled(mode, next);
        this.refreshLabel();
      },
      StyleElement(),
      null,
      null,
      (aNode: XULElement) => {
        this.node = aNode;
        const tooltip = document.createXULElement("tooltip") as XULElement;
        tooltip.id = "vpn-toggle-button-tooltip";
        tooltip.setAttribute("hasbeenopened", "false");
        document.getElementById("mainPopupSet")?.appendChild(tooltip);
        aNode.setAttribute("tooltip", "vpn-toggle-button-tooltip");
        // Initial render; subsequent updates come from refreshLabel (the
        // topic observer in init) which reads the live document.
        this.refreshLabel();
      },
    );
    this.ensureNavbarPlacement();
    // Node may be created after this window\'s util call returns; refresh once
    // after the widget lands so the very first label is correct.
    setTimeout(() => this.refreshLabel(), 0);
  }

  /**
   * The shared util skips addWidgetToArea on profiles that already have a
   * customization state (every real profile). The VPN control is a core
   * product feature, so force it into the navbar whenever it is not
   * placed. Users can still move or remove it afterwards.
   */
  private ensureNavbarPlacement(): void {
    try {
      const { CustomizableUI } = ChromeUtils.importESModule(
        "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
      ) as {
        CustomizableUI: {
          ARENA_NAVBAR?: string;
          AREA_NAVBAR?: string;
          getWidget(id: string): { areaId?: string | null; type?: string } | null;
          addWidgetToArea(id: string, area: string, position?: number): void;
        }
      };
      const w = CustomizableUI.getWidget(BUTTON_ID);
      const area = CustomizableUI.AREA_NAVBAR ?? CustomizableUI.ARENA_NAVBAR;
      if (w && area && (!w.areaId || w.areaId === "none")) {
        CustomizableUI.addWidgetToArea(BUTTON_ID, area, 0);
      }
    } catch (e) {
      console.error("[vpn-toggle] navbar placement failed:", e);
    }
  }

  private refreshLabel(): void {
    const el = document.getElementById(BUTTON_ID) as XULElement | null;
    if (!el) {
      return;
    }
    this.node = el;
    const texts = buildLabel();
    el.setAttribute("label", texts.label);
    el.setAttribute("state", texts.state);
    const tooltip = document.getElementById(
      "vpn-toggle-button-tooltip",
    ) as XULElement | null;
    tooltip?.setAttribute("label", texts.tooltip);
  }
}

function buildLabel(): { label: string; tooltip: string; state: string } {
  const mode = thisWindowMode();
  const config = VpnManager.getConfig();
  const on = config.enabled[mode];
  const other = mode === "normal" ? "private" : "normal";
  const otherOn = config.enabled[other];
  // The chrome loader registers browser-chrome.json under the default
  // namespace "browser-chrome", so keys are dotted (vpn-toggle.*).
  const t = (key: string): string => i18next.t(`vpn-toggle.${key}`);
  const opts = {
    mode: t(`mode-${mode}`),
    state: on ? t("on") : t("off"),
    other: t(`mode-${other}`),
    otherState: otherOn ? t("on") : t("off"),
  } as Record<string, string>;
  return {
    label: on ? t("on-short") : t("off-short"),
    tooltip: (i18next.t as (k: string, o: Record<string, string>) => string)(
      "vpn-toggle.tooltip",
      opts,
    ),
    state: on ? "on" : "off",
  } as { label: string; tooltip: string; state: string };
}
