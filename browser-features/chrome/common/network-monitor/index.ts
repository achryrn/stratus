/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render, createRootHMR } from "@nora/solid-xul";
import { createSignal } from "solid-js";
import { noraComponent, NoraComponentBase } from "#features-chrome/utils/base";
import { BrowserActionUtils } from "#features-chrome/utils/browser-action.tsx";

const { CustomizableUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
);
import i18next from "i18next";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { MountedNetworkPanel, NETWORK_PANEL_ID } from "./network-panel.tsx";
import { StyleElement } from "./style.tsx";

const PANEL_ID = NETWORK_PANEL_ID;
const BUTTON_ID = "network-monitor-button";

type PopupPanelLike = Element & {
  state?: string;
  openPopup(anchor: Element, position: string): void;
  hidePopup(): void;
};

@noraComponent(import.meta.hot)
export default class NetworkMonitorFeature extends NoraComponentBase {
  private buttonNode: XULElement | null = null;

  init(): void {
    this.logger.debug("Initializing network monitor toolbar feature");

    if (typeof document === "undefined") {
      return;
    }

    const tryInit = (): void => {
      this.ensurePanel();
      this.createToolbarButton();
      this.ensureButtonPlaced();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryInit, { once: true });
    } else {
      tryInit();
    }
  }

  private ensurePanel(): void {
    if (document.getElementById(PANEL_ID)) {
      return;
    }
    const popupSet = document.getElementById("mainPopupSet");
    if (!popupSet) {
      return;
    }
    render(MountedNetworkPanel, popupSet, {
      marker: popupSet.lastChild as Element | null ?? undefined,
      hotCtx: import.meta.hot,
    });
  }

  /**
   * Ensure the button ends up in the navbar. The shared helper skips
   * addWidgetToArea when the profile already has saved UI customization, which
   * leaves new widgets floating (visible only via overflow/customize). This
   * feature's button is a core product affordance, so place it whenever the
   * widget exists but reports no toolbar area.
   */
  private ensureButtonPlaced(): void {
    void (async () => {
      try {
        await CustomizableUI.readyPromise;
      } catch (error) {
        console.error(
          "[network-monitor] Failed waiting for CustomizableUI readiness:",
          error,
        );
        return;
      }
      const widget = CustomizableUI.getWidget(BUTTON_ID) as {
        type?: string;
        area?: string | null;
      } | null;
      if (widget && widget.type && !widget.area) {
        try {
          CustomizableUI.addWidgetToArea(BUTTON_ID, CustomizableUI.AREA_NAVBAR, 0);
        } catch (error) {
          console.error("[network-monitor] Failed to place toolbar button:", error);
        }
      }
    })();
  }

  private createToolbarButton(): void {
    BrowserActionUtils.createToolbarClickActionButton(
      BUTTON_ID,
      BUTTON_ID,
      () => {
        const panel = document.getElementById(PANEL_ID) as PopupPanelLike | null;
        const node = this.buttonNode;
        if (!panel || !node) {
          return;
        }
        if (panel.state === "open" || panel.state === "showing") {
          panel.hidePopup();
        } else {
          panel.openPopup(node, "after_start");
        }
      },
      StyleElement(),
      null,
      null,
      (aNode: XULElement) => {
        this.buttonNode = aNode;

        const tooltip = document!.createXULElement("tooltip") as XULElement;
        tooltip.id = "network-monitor-button-tooltip";
        tooltip.setAttribute("hasbeenopened", "false");
        document!.getElementById("mainPopupSet")?.appendChild(tooltip);
        aNode.setAttribute("tooltip", "network-monitor-button-tooltip");

        createRootHMR(
          () => {
            const [texts, setTexts] = createSignal({
              buttonLabel: "Network Monitor",
              tooltipText: "Show live network activity",
            });

            const apply = (): void => {
              aNode.setAttribute("label", texts().buttonLabel);
              tooltip.setAttribute("label", texts().tooltipText);
            };

            apply();
            addI18nObserver(() => {
              setTexts({
                buttonLabel: i18next.t("network-monitor.button-label", {
                  defaultValue: "Network Monitor",
                }),
                tooltipText: i18next.t("network-monitor.button-tooltip", {
                  defaultValue: "Show live network activity",
                }),
              });
              apply();
            });
          },
          import.meta.hot,
        );
      },
    );
  }
}
