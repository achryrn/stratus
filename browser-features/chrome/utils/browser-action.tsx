// SPDX-License-Identifier: MPL-2.0

// NOTICE: Do not add toolbar buttons code here. Create new folder or file for new toolbar buttons.

import { render } from "@nora/solid-xul";
import { createRoot, getOwner, type JSXElement } from "solid-js";

const { CustomizableUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
);

// deno-lint-ignore no-namespace
export namespace BrowserActionUtils {
  export function createToolbarClickActionButton(
    widgetId: string,
    l10nId: string | null,
    onCommandFunc: () => void,
    styleElement: JSXElement | null = null,
    area: TCustomizableUIArea | null = CustomizableUI.AREA_NAVBAR,
    position: number | null = 0,
    onCreatedFunc: null | ((aNode: XULElement) => void) = null,
  ) {
    // Add style Element for toolbar button icon.
    // This render is runnning every open browser window.
    if (styleElement) {
      render(() => styleElement, document?.head, {
        marker: document?.head?.lastChild as Element,
      });
    }

    // Create toolbar button only once per profile. Subsequent window opens reuse
    // the existing widget and respect saved customization data.
    // custom type is temporary widget type. It will be changed to button type.
    const widget = CustomizableUI.getWidget(widgetId);
    if (widget && widget.type !== "custom") {
      return;
    }
    (async () => {
      CustomizableUI.createWidget({
        id: widgetId,
        type: "button",
        // NOTE: the overlay repo ships NO Fluent (.ftl) resources, so
        // document.l10n.formatValue() would log "[fluent] Missing message"
        // for every overlay widget on every window open. Features set real
        // labels/tooltips in onCreated (i18next or XUL tooltip elements).
        // The raw l10nId here only serves as a transient fallback text.
        tooltiptext: l10nId ?? null,
        label: l10nId ?? null,
        removable: true,
        onCommand: () => {
          onCommandFunc?.();
        },
        onCreated: (aNode: XULElement) => {
          onCreatedFunc?.(aNode);
        },
        defaultArea: area ?? undefined,
      });

      if (!area) {
        return;
      }

      try {
        await (CustomizableUI.readyPromise ?? Promise.resolve());
      } catch (error) {
        console.error(
          "Failed waiting for CustomizableUI readiness for",
          widgetId,
          error,
        );
        return;
      }

      const hasUserCustomized =
        typeof Services !== "undefined" &&
        Services.prefs?.prefHasUserValue?.("browser.uiCustomization.state");

      if (hasUserCustomized) {
        return;
      }

      if (position === null || position === undefined) {
        CustomizableUI.addWidgetToArea(widgetId, area);
      } else {
        CustomizableUI.addWidgetToArea(widgetId, area, position);
      }
    })();
  }

  export function createMenuToolbarButton(
    widgetId: string,
    l10nId: string,
    targetViewId: string,
    popupElement: JSXElement,
    onViewShowingFunc?: ((event: Event) => void) | null,
    onCreatedFunc?: ((aNode: XULElement) => void) | null,
    area: string = CustomizableUI.AREA_NAVBAR,
    styleElement: JSXElement | null = null,
    position: number | null = 0,
  ) {
    if (styleElement) {
      render(() => styleElement, document?.head, {
        marker: document?.head?.lastChild as Element,
      });
    }

    if (popupElement) {
      render(() => popupElement, document?.getElementById("mainPopupSet"), {
        marker: document?.getElementById("mainPopupSet")?.lastChild as Element,
      });
    }

    const widget = CustomizableUI.getWidget(widgetId);
    if (widget && widget.type !== "custom") {
      return;
    }

    const owner = getOwner();
    (async () => {
      CustomizableUI.createWidget({
        id: widgetId,
        type: "view",
        viewId: targetViewId,
        // See note above the toolbar-click helper: no .ftl resources exist
        // for overlay ids; fall back to the raw id text (same visible result
        // Fluent produced for a missing message) without the console errors.
        tooltiptext: l10nId,
        label: l10nId,
        removable: true,
        onCreated: (aNode: XULElement) => {
          createRoot(() => onCreatedFunc?.(aNode), owner);
        },
        onViewShowing: (event: Event) => {
          createRoot(() => onViewShowingFunc?.(event), owner);
        },
        defaultArea: area,
      });

      try {
        await (CustomizableUI.readyPromise ?? Promise.resolve());
      } catch (error) {
        console.error(
          "Failed waiting for CustomizableUI readiness for",
          widgetId,
          error,
        );
        return;
      }

      const hasUserCustomized =
        typeof Services !== "undefined" &&
        Services.prefs?.prefHasUserValue?.("browser.uiCustomization.state");

      if (hasUserCustomized) {
        return;
      }

      if (position === null || position === undefined) {
        CustomizableUI.addWidgetToArea(widgetId, area);
      } else {
        CustomizableUI.addWidgetToArea(widgetId, area, position);
      }
    })();
  }
}
