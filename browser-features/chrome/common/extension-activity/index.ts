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
import { MountedExtensionPanel, EXTENSION_PANEL_ID } from "./extension-panel.tsx";
import { StyleElement } from "./style.tsx";

const PANEL_ID = EXTENSION_PANEL_ID;
const BUTTON_ID = "extension-activity-button";

type PopupPanelLike = Element & {
  state?: string;
  openPopup(anchor: Element, position: string): void;
  hidePopup(): void;
};

@noraComponent(import.meta.hot)
export default class ExtensionActivityFeature extends NoraComponentBase {
  private buttonNode: XULElement | null = null;

  init(): void {
    this.logger.debug("Initializing extension activity toolbar feature");

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
    render(MountedExtensionPanel, popupSet, {
      marker: popupSet.lastChild as Element | null ?? undefined,
      hotCtx: import.meta.hot,
    });
  }

  private ensureButtonPlaced(): void {
    void (async () => {
      try {
        await CustomizableUI.readyPromise;
      } catch (error) {
        console.error(
          "[extension-activity] Failed waiting for CustomizableUI readiness:",
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
          CustomizableUI.addWidgetToArea(BUTTON_ID, CustomizableUI.AREA_NAVBAR, 1);
        } catch (error) {
          console.error("[extension-activity] Failed to place toolbar button:", error);
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
        tooltip.id = "extension-activity-button-tooltip";
        tooltip.setAttribute("hasbeenopened", "false");
        document!.getElementById("mainPopupSet")?.appendChild(tooltip);
        aNode.setAttribute("tooltip", "extension-activity-button-tooltip");

        createRootHMR(
          () => {
            const [texts, setTexts] = createSignal({
              buttonLabel: "Extensions",
              tooltipText: "Show extension activity",
            });

            const apply = (): void => {
              aNode.setAttribute("label", texts().buttonLabel);
              tooltip.setAttribute("label", texts().tooltipText);
            };

            apply();
            addI18nObserver(() => {
              setTexts({
                buttonLabel: i18next.t("extension-activity.button-label", {
                  defaultValue: "Extensions",
                }),
                tooltipText: i18next.t("extension-activity.button-tooltip", {
                  defaultValue: "Show extension activity",
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
