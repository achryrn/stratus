/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { SplitViewLayout } from "../data/types.js";
import {
  persistPaneSizesForPanelIds,
  resolvePaneSizesForPanelIds,
} from "../patches/session-restore.js";
import { forceCleanupDragState } from "../utils/force-cleanup.js";
import {
  formatResizeAnnouncement,
  nextFlexRatio,
  nextGridRatio,
} from "../utils/keyboard-resize.js";

/** Keys handled by divider keyboard resize (WCAG 2.1.1). */
const RESIZE_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

/** aria-valuenow percentage range exposed to screen readers. */
const ARIA_VALUE_MIN = 10;
const ARIA_VALUE_MAX = 90;

const log = console.createInstance({ prefix: "nora@split-view-splitters" });

/**
 * Validate that split-view panel elements exist; keep `panelIds` as the single
 * source of truth for handle placement. Sorting by getBoundingClientRect()
 * was undoing intentional pane swaps (visual order lagged tab order briefly).
 */
function orderFlexPanelIdsToLayout(
  tabpanels: Element,
  panelIds: string[],
): string[] {
  const idSet = new Set(panelIds);
  let found = 0;
  for (const child of tabpanels.children) {
    if (
      child.classList?.contains("split-view-panel") &&
      idSet.has(child.id)
    ) {
      found++;
    }
  }
  if (found !== panelIds.length) {
    log.warn(
      `[orderFlexPanelIdsToLayout] expected ${panelIds.length} split-view-panel(s), ` +
        `found ${found}; keeping upstream panelIds order`,
    );
  }
  return panelIds;
}

/** Preserve each pane's flex weight when reordering ids to DOM/visual order. */
function remapFlexRatiosToOrder(
  originalIds: string[],
  orderedIds: string[],
  ratiosForOriginal: number[],
): number[] {
  const byId = new Map<string, number>();
  for (let i = 0; i < originalIds.length; i++) {
    byId.set(originalIds[i]!, ratiosForOriginal[i]!);
  }
  const fallback = 1 / orderedIds.length;
  return orderedIds.map((id) => byId.get(id) ?? fallback);
}

// Track active drag cleanup so clearSplitHandles can abort in-progress drags
let activeDragCleanup: (() => void) | null = null;

function getTabpanels(): Element | null {
  return document?.getElementById("tabbrowser-tabpanels") ?? null;
}

export function clearSplitHandles(): void {
  // Abort any in-progress drag to prevent orphaned document listeners
  if (activeDragCleanup) {
    activeDragCleanup();
    activeDragCleanup = null;
  }

  const tabpanels = getTabpanels();
  if (!tabpanels) return;
  const handles = tabpanels.querySelectorAll(
    ".floorp-split-handle, .floorp-grid-handle, .split-view-splitter",
  );
  log.debug(`[clearSplitHandles] removing ${handles.length} handle(s)`);
  for (const handle of handles) {
    handle.remove();
  }
  // Strip stale `order` and `flex` inline styles from all children.
  // `insertFlexHandles` sets both on split panels, but native
  // `removeTabsFromSplitview` (Firefox 151+) may already have removed the
  // `.split-view-panel` class before this runs, so we cannot rely on it.
  // Removing from non-split children is a no-op, so it's safe.
  for (const child of tabpanels.children) {
    const style = (child as HTMLElement).style;
    style.removeProperty("order");
    style.removeProperty("flex");
  }
  // Safety net: if a splitter/grid drag was interrupted (mouseup lost,
  // window blurred mid-drag), `data-floorp-dragging` may linger on
  // tabpanels and apply `pointer-events: none` to web content. The
  // `activeDragCleanup()` call above only runs when a drag was in flight;
  // this guarantees a full sweep regardless. Idempotent and a no-op when
  // nothing is leaked.
  forceCleanupDragState(log);
}

export function insertFlexHandles(
  panelIds: string[],
  orientation: "horizontal" | "vertical",
): void {
  clearSplitHandles();
  const tabpanels = getTabpanels();
  if (!tabpanels || panelIds.length < 2) return;

  const upstreamIds = [...panelIds];
  const orderedIds = orderFlexPanelIdsToLayout(tabpanels, panelIds);
  if (orderedIds.join(",") !== upstreamIds.join(",")) {
    log.debug(
      `[insertFlexHandles] reordered for DOM/visual layout: upstream=[${
        upstreamIds.join(", ")
      }] ` +
        `ordered=[${orderedIds.join(", ")}]`,
    );
  }

  log.debug(
    `[insertFlexHandles] orientation=${orientation}, panels=${orderedIds.length}, ids=[${
      orderedIds.join(", ")
    }]`,
  );

  const sizes = resolvePaneSizesForPanelIds(upstreamIds);
  const baseRatios = normalizeRatios(sizes.flexRatios, upstreamIds.length);
  const ratios = normalizeRatios(
    remapFlexRatiosToOrder(upstreamIds, orderedIds, baseRatios),
    orderedIds.length,
  );
  log.debug(
    `[insertFlexHandles] ratios=[${
      ratios.map((r) => r.toFixed(3)).join(", ")
    }]`,
  );

  for (let i = 0; i < orderedIds.length; i++) {
    const panelEl = document?.getElementById(orderedIds[i]!) as
      | HTMLElement
      | null;
    if (panelEl) {
      panelEl.style.setProperty("flex", `${ratios[i]} 1 0%`);
      // DOM order of tabpanels children can stay creation order; match tabs.
      panelEl.style.setProperty("order", String(2 * i));
    } else {
      log.warn(`[insertFlexHandles] panel element not found: ${orderedIds[i]}`);
    }
  }

  for (let i = 0; i < orderedIds.length - 1; i++) {
    const panelEl = document?.getElementById(orderedIds[i]!);
    if (!panelEl) continue;

    const handle = document?.createXULElement("box");
    if (!handle) continue;

    handle.className = "floorp-split-handle";
    handle.setAttribute("data-orientation", orientation);
    handle.setAttribute("data-index", String(i));
    (handle as HTMLElement).style.setProperty("order", String(2 * i + 1));

    // WCAG 4.1.2: expose as a focusable separator with value semantics.
    handle.setAttribute("role", "separator");
    handle.setAttribute(
      "aria-label",
      orientation === "horizontal"
        ? `Resize divider ${i + 1}: left and right panels`
        : `Resize divider ${i + 1}: top and bottom panels`,
    );
    handle.setAttribute("aria-orientation", orientation);
    handle.setAttribute("aria-valuemin", String(ARIA_VALUE_MIN));
    handle.setAttribute("aria-valuemax", String(ARIA_VALUE_MAX));
    handle.setAttribute(
      "aria-valuenow",
      String(Math.round(ratios[i]! * 100)),
    );
    handle.setAttribute("tabindex", "0");

    handle.addEventListener("mousedown", (e: Event) => {
      onFlexHandleMouseDown(e as MouseEvent, i, orderedIds, orientation);
    });
    handle.addEventListener("keydown", (e: Event) => {
      onFlexHandleKeyDown(
        e as KeyboardEvent,
        i,
        orderedIds,
        orientation,
      );
    });

    panelEl.after(handle);
  }
  log.debug(`[insertFlexHandles] inserted ${orderedIds.length - 1} handle(s)`);
}

export function insertGridHandles(panelIds: string[]): void {
  clearSplitHandles();
  const tabpanels = getTabpanels();
  if (!tabpanels || panelIds.length < 4) {
    log.warn(
      `[insertGridHandles] skipping: tabpanels=${!!tabpanels}, panels=${panelIds.length}`,
    );
    return;
  }

  const sizes = resolvePaneSizesForPanelIds(panelIds);
  if (
    !Number.isFinite(sizes.gridColRatio) || !Number.isFinite(sizes.gridRowRatio)
  ) {
    log.warn(
      `[insertGridHandles] invalid ratios: col=${sizes.gridColRatio}, row=${sizes.gridRowRatio}`,
    );
    return;
  }

  log.debug(
    `[insertGridHandles] colRatio=${sizes.gridColRatio}, rowRatio=${sizes.gridRowRatio}`,
  );

  applyGridTemplate(
    tabpanels as HTMLElement,
    sizes.gridColRatio,
    sizes.gridRowRatio,
  );

  const colHandle = document?.createXULElement("box");
  if (colHandle) {
    colHandle.className = "floorp-grid-handle";
    colHandle.setAttribute("data-orientation", "grid-col");
    setGridHandleAria(colHandle, "grid-col", sizes.gridColRatio);
    colHandle.addEventListener("mousedown", (e: Event) => {
      onGridColHandleMouseDown(e as MouseEvent);
    });
    colHandle.addEventListener("keydown", (e: Event) => {
      onGridHandleKeyDown(e as KeyboardEvent, "grid-col");
    });
    tabpanels.appendChild(colHandle);
  }

  const rowHandle = document?.createXULElement("box");
  if (rowHandle) {
    rowHandle.className = "floorp-grid-handle";
    rowHandle.setAttribute("data-orientation", "grid-row");
    setGridHandleAria(rowHandle, "grid-row", sizes.gridRowRatio);
    rowHandle.addEventListener("mousedown", (e: Event) => {
      onGridRowHandleMouseDown(e as MouseEvent);
    });
    rowHandle.addEventListener("keydown", (e: Event) => {
      onGridHandleKeyDown(e as KeyboardEvent, "grid-row");
    });
    tabpanels.appendChild(rowHandle);
  }

  const centerHandle = document?.createXULElement("box");
  if (centerHandle) {
    centerHandle.className = "floorp-grid-handle";
    centerHandle.setAttribute("data-orientation", "grid-center");
    setGridHandleAria(centerHandle, "grid-center", sizes.gridColRatio);
    centerHandle.addEventListener("mousedown", (e: Event) => {
      onGridCenterHandleMouseDown(e as MouseEvent);
    });
    centerHandle.addEventListener("keydown", (e: Event) => {
      onGridHandleKeyDown(e as KeyboardEvent, "grid-center");
    });
    tabpanels.appendChild(centerHandle);
  }

  log.debug(`[insertGridHandles] 3 grid handles inserted`);
}

export function insertThreePaneGridHandles(panelIds: string[]): void {
  clearSplitHandles();
  const tabpanels = getTabpanels();
  if (!tabpanels || panelIds.length < 3) {
    log.warn(
      `[insertThreePaneGridHandles] skipping: tabpanels=${!!tabpanels}, panels=${panelIds.length}`,
    );
    return;
  }

  const sizes = resolvePaneSizesForPanelIds(panelIds);
  if (
    !Number.isFinite(sizes.gridColRatio) || !Number.isFinite(sizes.gridRowRatio)
  ) {
    log.warn(
      `[insertThreePaneGridHandles] invalid ratios: col=${sizes.gridColRatio}, row=${sizes.gridRowRatio}`,
    );
    return;
  }

  log.debug(
    `[insertThreePaneGridHandles] colRatio=${sizes.gridColRatio}, rowRatio=${sizes.gridRowRatio}`,
  );

  applyGridTemplate(
    tabpanels as HTMLElement,
    sizes.gridColRatio,
    sizes.gridRowRatio,
  );

  const colPct = (sizes.gridColRatio * 100).toFixed(2);
  const colHandle = document?.createXULElement("box");
  if (colHandle) {
    colHandle.className = "floorp-grid-handle";
    colHandle.setAttribute("data-orientation", "grid-3pane-col");
    setGridHandleAria(colHandle, "grid-3pane-col", sizes.gridColRatio);
    colHandle.addEventListener("mousedown", (e: Event) => {
      onGridColHandleMouseDown(e as MouseEvent);
    });
    colHandle.addEventListener("keydown", (e: Event) => {
      onGridHandleKeyDown(e as KeyboardEvent, "grid-3pane-col");
    });
    tabpanels.appendChild(colHandle);
  }

  const rowHandle = document?.createXULElement("box");
  if (rowHandle) {
    rowHandle.className = "floorp-grid-handle";
    rowHandle.setAttribute("data-orientation", "grid-3pane-row");
    setGridHandleAria(rowHandle, "grid-3pane-row", sizes.gridRowRatio);
    rowHandle.addEventListener("mousedown", (e: Event) => {
      onGridRowHandleMouseDown(e as MouseEvent);
    });
    rowHandle.addEventListener("keydown", (e: Event) => {
      onGridHandleKeyDown(e as KeyboardEvent, "grid-3pane-row");
    });
    tabpanels.appendChild(rowHandle);
  }

  log.debug(
    `[insertThreePaneGridHandles] 2 grid handles inserted, leftCol=${colPct}%`,
  );
}

export function updateHandles(
  panelIds: string[],
  layout: SplitViewLayout,
): void {
  log.debug(
    `[updateHandles] layout=${layout}, panels=${panelIds.length}, ids=[${
      panelIds.join(", ")
    }]`,
  );
  if (layout === "grid-2x2" && panelIds.length === 4) {
    insertGridHandles(panelIds);
  } else if (
    (layout === "grid-3pane-left-main" ||
      layout === "grid-3pane-right-main" ||
      layout === "grid-3pane-top-main" ||
      layout === "grid-3pane-bottom-main") &&
    panelIds.length === 3
  ) {
    insertThreePaneGridHandles(panelIds);
  } else if (layout === "vertical") {
    insertFlexHandles(panelIds, "vertical");
  } else {
    insertFlexHandles(panelIds, "horizontal");
  }
}

// ===== Keyboard resize (WCAG 2.1.1, 2.4.7, 4.1.2) =====

/** Set ARIA separator semantics + tabindex on a grid handle. */
function setGridHandleAria(
  handle: Element,
  orientation: string,
  initialRatio: number,
): void {
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "horizontal");
  handle.setAttribute("aria-valuemin", String(ARIA_VALUE_MIN));
  handle.setAttribute("aria-valuemax", String(ARIA_VALUE_MAX));
  handle.setAttribute(
    "aria-valuenow",
    String(Math.round(initialRatio * 100)),
  );
  handle.setAttribute("tabindex", "0");
  const labels: Record<string, string> = {
    "grid-col": "Resize divider: column split",
    "grid-row": "Resize divider: row split",
    "grid-center": "Resize divider: column and row split",
    "grid-3pane-col": "Resize divider: main column split",
    "grid-3pane-row": "Resize divider: stacked rows split",
  };
  handle.setAttribute("aria-label", labels[orientation] ?? "Resize divider");
}

/** Create or reuse a visually-hidden live region for resize announcements. */
function getResizeLiveRegion(): HTMLElement | null {
  let region = document?.getElementById("floorp-split-resize-live") as
    | HTMLElement
    | null;
  if (!region && document?.body) {
    region = document?.createElement("div");
    if (region) {
      region.id = "floorp-split-resize-live";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      region.style.position = "absolute";
      region.style.width = "1px";
      region.style.height = "1px";
      region.style.overflow = "hidden";
      region.style.clip = "rect(0 0 0 0)";
      region.style.whiteSpace = "nowrap";
      document?.body.appendChild(region);
    }
  }
  return region;
}

function announceResize(message: string): void {
  const region = getResizeLiveRegion();
  if (!region) return;
  region.textContent = "";
  // Force reflow so repeated identical announcements still fire (NVDA/JAWS).
  void region.offsetHeight;
  region.textContent = message;
}

/** Recompute flex ratios from panel flex styles; persist to session. */
function persistCurrentFlexRatios(panelIds: string[]): void {
  const ratios: number[] = [];
  for (const id of panelIds) {
    const el = document?.getElementById(id) as HTMLElement | null;
    if (el) {
      const flex = parseFloat(el.style.getPropertyValue("flex") || "1");
      ratios.push(Number.isFinite(flex) ? flex : 1);
    } else {
      ratios.push(1);
    }
  }
  const normalizedRatios = normalizeRatios(ratios, panelIds.length);
  persistPaneSizesForPanelIds(panelIds, {
    ...resolvePaneSizesForPanelIds(panelIds),
    flexRatios: normalizedRatios,
  });
}

/** Apply a keyboard-driven flex ratio step to the divider at `handleIndex`. */
function applyFlexKeyboardStep(
  handle: XULElement,
  handleIndex: number,
  panelIds: string[],
  orientation: "horizontal" | "vertical",
  key: string,
  fine: boolean,
): void {
  const panelBefore = document?.getElementById(panelIds[handleIndex]) as
    | HTMLElement
    | null;
  const panelAfter = document?.getElementById(panelIds[handleIndex + 1]) as
    | HTMLElement
    | null;
  if (!panelBefore || !panelAfter) return;

  const beforeRect = panelBefore.getBoundingClientRect();
  const afterRect = panelAfter.getBoundingClientRect();
  const totalSize = (orientation === "horizontal"
    ? beforeRect.width
    : beforeRect.height) + (orientation === "horizontal"
    ? afterRect.width
    : afterRect.height);
  if (!totalSize || totalSize <= 0) return;

  const currentRatio = beforeRect.width / totalSize;
  const nextRatio = nextFlexRatio(currentRatio, key, fine);
  if (nextRatio === currentRatio) return;

  panelBefore.style.setProperty("flex", `${nextRatio} 1 0%`);
  panelAfter.style.setProperty("flex", `${1 - nextRatio} 1 0%`);
  handle.setAttribute("aria-valuenow", String(Math.round(nextRatio * 100)));
  announceResize(formatResizeAnnouncement(nextRatio, orientation));
  persistCurrentFlexRatios(panelIds);
  log.debug(
    `[flexKey] handle=${handleIndex} key=${key} fine=${fine} ratio=${nextRatio.toFixed(3)}`,
  );
}

function onFlexHandleKeyDown(
  e: KeyboardEvent,
  handleIndex: number,
  panelIds: string[],
  orientation: "horizontal" | "vertical",
): void {
  if (!RESIZE_KEYS.has(e.key)) return;
  e.preventDefault();
  e.stopPropagation();
  const handle = e.currentTarget as XULElement;
  applyFlexKeyboardStep(
    handle,
    handleIndex,
    panelIds,
    orientation,
    e.key,
    e.shiftKey,
  );
}

function onGridHandleKeyDown(
  e: KeyboardEvent,
  orientation: string,
): void {
  if (!RESIZE_KEYS.has(e.key)) return;
  e.preventDefault();
  e.stopPropagation();

  const tabpanels = getTabpanels() as HTMLElement | null;
  if (!tabpanels) return;
  const panelIds = getCurrentGridPanelIds();
  if (panelIds.length < 2) return;

  const sizes = resolvePaneSizesForPanelIds(panelIds);
  const handle = e.currentTarget as XULElement;
  const fine = e.shiftKey;
  const isColumn = orientation === "grid-col" ||
    orientation === "grid-3pane-col" ||
    orientation === "grid-center";
  const isRow = orientation === "grid-row" ||
    orientation === "grid-3pane-row" ||
    orientation === "grid-center";

  if (isColumn) {
    const current = sizes.gridColRatio;
    const next = nextGridRatio(current, e.key, fine);
    if (next === current) return;
    sizes.gridColRatio = next;
    applyGridTemplate(tabpanels, next, sizes.gridRowRatio);
    handle.setAttribute("aria-valuenow", String(Math.round(next * 100)));
    announceResize(`Left column ${Math.round(next * 100)}%, right column ${
      Math.round((1 - next) * 100)
    }%`);
  }
  if (isRow) {
    const current = sizes.gridRowRatio;
    const next = nextGridRatio(current, e.key, fine);
    if (next === current) return;
    sizes.gridRowRatio = next;
    applyGridTemplate(tabpanels, sizes.gridColRatio, next);
    if (orientation === "grid-center") {
      handle.setAttribute(
        "aria-valuenow",
        String(Math.round(next * 100)),
      );
      announceResize(
        `Top row ${Math.round(next * 100)}%, bottom row ${
          Math.round((1 - next) * 100)
        }%`,
      );
    }
  }

  persistPaneSizesForPanelIds(panelIds, sizes);
  log.debug(`[gridKey] orientation=${orientation} key=${e.key} col=${
    sizes.gridColRatio.toFixed(3)
  } row=${sizes.gridRowRatio.toFixed(3)}`);
}

// ===== Flex handle drag logic =====

function onFlexHandleMouseDown(
  e: MouseEvent,
  handleIndex: number,
  panelIds: string[],
  orientation: "horizontal" | "vertical",
): void {
  e.preventDefault();
  const tabpanels = getTabpanels() as HTMLElement | null;
  if (!tabpanels) return;

  log.debug(
    `[flexDrag:start] handleIndex=${handleIndex}, orientation=${orientation}`,
  );
  tabpanels.setAttribute("data-floorp-dragging", "true");

  const panelBefore = document?.getElementById(panelIds[handleIndex]) as
    | HTMLElement
    | null;
  const panelAfter = document?.getElementById(panelIds[handleIndex + 1]) as
    | HTMLElement
    | null;
  if (!panelBefore || !panelAfter) {
    log.warn(
      `[flexDrag:start] panel element not found: before=${!!panelBefore}, after=${!!panelAfter}`,
    );
    return;
  }

  const isHorizontal = orientation === "horizontal";
  const startPos = isHorizontal ? e.clientX : e.clientY;
  const beforeRect = panelBefore.getBoundingClientRect();
  const afterRect = panelAfter.getBoundingClientRect();
  const startBefore = isHorizontal ? beforeRect.width : beforeRect.height;
  const startAfter = isHorizontal ? afterRect.width : afterRect.height;
  const totalSize = startBefore + startAfter;

  const minPaneSize = 140;
  let frameRequested = false;
  let pendingBefore = startBefore;
  let pendingAfter = startAfter;

  const applyFrame = () => {
    frameRequested = false;
    const ratioBefore = pendingBefore / totalSize;
    const ratioAfter = pendingAfter / totalSize;
    panelBefore.style.setProperty("flex", `${ratioBefore} 1 0%`);
    panelAfter.style.setProperty("flex", `${ratioAfter} 1 0%`);
  };

  const onMouseMove = (e: MouseEvent) => {
    const currentPos = isHorizontal ? e.clientX : e.clientY;
    const delta = currentPos - startPos;
    const newBefore = Math.max(
      minPaneSize,
      Math.min(startBefore + delta, totalSize - minPaneSize),
    );
    const newAfter = totalSize - newBefore;
    pendingBefore = newBefore;
    pendingAfter = newAfter;
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(applyFrame);
    }
  };

  const cleanup = () => {
    tabpanels.removeAttribute("data-floorp-dragging");
    document?.removeEventListener("mousemove", onMouseMove);
    document?.removeEventListener("mouseup", onMouseUp);
    if (activeDragCleanup === cleanup) activeDragCleanup = null;
  };

  const onMouseUp = () => {
    // Apply final position directly (rAF might miss it)
    applyFrame();
    cleanup();

    const ratios: number[] = [];
    for (const id of panelIds) {
      const el = document?.getElementById(id) as HTMLElement | null;
      if (el) {
        const flex = parseFloat(el.style.getPropertyValue("flex") || "1");
        ratios.push(flex);
      } else {
        ratios.push(1);
      }
    }
    const normalizedRatios = normalizeRatios(ratios, panelIds.length);
    log.debug(
      `[flexDrag:end] ratios=[${
        normalizedRatios.map((r) => r.toFixed(3)).join(", ")
      }]`,
    );
    const currentSizes = resolvePaneSizesForPanelIds(panelIds);
    persistPaneSizesForPanelIds(panelIds, {
      ...currentSizes,
      flexRatios: normalizedRatios,
    });
  };

  // Cancel any prior drag, register this one
  activeDragCleanup?.();
  activeDragCleanup = cleanup;
  document?.addEventListener("mousemove", onMouseMove);
  document?.addEventListener("mouseup", onMouseUp);
}

// ===== Grid handle drag logic =====

interface GridDragAxis {
  mouseProperty: "clientX" | "clientY";
  rectStart: "left" | "top";
  rectSize: "width" | "height";
  gridTemplate: "grid-template-columns" | "grid-template-rows";
  cssVar: "--floorp-grid-col-ratio" | "--floorp-grid-row-ratio";
  sizeKey: "gridColRatio" | "gridRowRatio";
}

const COL_AXIS: GridDragAxis = {
  mouseProperty: "clientX",
  rectStart: "left",
  rectSize: "width",
  gridTemplate: "grid-template-columns",
  cssVar: "--floorp-grid-col-ratio",
  sizeKey: "gridColRatio",
};

const ROW_AXIS: GridDragAxis = {
  mouseProperty: "clientY",
  rectStart: "top",
  rectSize: "height",
  gridTemplate: "grid-template-rows",
  cssVar: "--floorp-grid-row-ratio",
  sizeKey: "gridRowRatio",
};

function createGridDragHandler(
  axes: GridDragAxis[],
): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    e.preventDefault();
    const tabpanels = getTabpanels() as HTMLElement | null;
    if (!tabpanels) return;

    const label = axes.map((a) => a.sizeKey).join("+");
    log.debug(`[gridDrag:${label}:start]`);
    tabpanels.setAttribute("data-floorp-dragging", "true");

    const tabpanelsRect = tabpanels.getBoundingClientRect();
    let frameRequested = false;
    const pending: Record<string, number> = {};
    for (const axis of axes) {
      pending[axis.sizeKey] = resolvePaneSizesForPanelIds(
        getCurrentGridPanelIds(),
      )[axis.sizeKey];
    }

    const applyFrame = () => {
      frameRequested = false;
      for (const axis of axes) {
        const pct = (pending[axis.sizeKey] * 100).toFixed(2);
        tabpanels.style.setProperty(
          axis.gridTemplate,
          `${pct}% calc(100% - ${pct}%)`,
        );
        tabpanels.style.setProperty(axis.cssVar, `${pct}%`);
      }
    };

    const onMouseMove = (ev: MouseEvent) => {
      for (const axis of axes) {
        const ratio = (ev[axis.mouseProperty] - tabpanelsRect[axis.rectStart]) /
          tabpanelsRect[axis.rectSize];
        pending[axis.sizeKey] = Math.max(0.15, Math.min(0.85, ratio));
      }
      if (!frameRequested) {
        frameRequested = true;
        requestAnimationFrame(applyFrame);
      }
    };

    const cleanup = () => {
      tabpanels.removeAttribute("data-floorp-dragging");
      document?.removeEventListener("mousemove", onMouseMove);
      document?.removeEventListener("mouseup", onMouseUp);
      if (activeDragCleanup === cleanup) activeDragCleanup = null;
    };

    const onMouseUp = () => {
      applyFrame();
      cleanup();
      log.debug(
        `[gridDrag:${label}:end] ${
          axes.map((a) => `${a.sizeKey}=${pending[a.sizeKey].toFixed(3)}`).join(
            ", ",
          )
        }`,
      );
      const panelIds = getCurrentGridPanelIds();
      const currentSizes = resolvePaneSizesForPanelIds(panelIds);
      const updated = { ...currentSizes };
      for (const axis of axes) {
        updated[axis.sizeKey] = pending[axis.sizeKey];
      }
      persistPaneSizesForPanelIds(panelIds, updated);
    };

    // Cancel any prior drag, register this one
    activeDragCleanup?.();
    activeDragCleanup = cleanup;
    document?.addEventListener("mousemove", onMouseMove);
    document?.addEventListener("mouseup", onMouseUp);
  };
}

const onGridColHandleMouseDown = createGridDragHandler([COL_AXIS]);
const onGridRowHandleMouseDown = createGridDragHandler([ROW_AXIS]);
const onGridCenterHandleMouseDown = createGridDragHandler([COL_AXIS, ROW_AXIS]);

// ===== Utilities =====

function applyGridTemplate(
  tabpanels: HTMLElement,
  colRatio: number,
  rowRatio: number,
): void {
  const colPct = (colRatio * 100).toFixed(2);
  const rowPct = (rowRatio * 100).toFixed(2);
  tabpanels.style.setProperty(
    "grid-template-columns",
    `${colPct}% calc(100% - ${colPct}%)`,
  );
  tabpanels.style.setProperty(
    "grid-template-rows",
    `${rowPct}% calc(100% - ${rowPct}%)`,
  );
  tabpanels.style.setProperty("--floorp-grid-col-ratio", `${colPct}%`);
  tabpanels.style.setProperty("--floorp-grid-row-ratio", `${rowPct}%`);
}

function getCurrentGridPanelIds(): string[] {
  const tabpanels = getTabpanels();
  if (!tabpanels) {
    return [];
  }
  const ids: string[] = [];
  for (const child of tabpanels.children) {
    if (child.classList?.contains("split-view-panel") && child.id) {
      ids.push(child.id);
    }
  }
  return ids;
}

function normalizeRatios(ratios: number[], count: number): number[] {
  if (count <= 0) return [];
  if (ratios.length === count) {
    const validRatios = ratios.map((
      r,
    ) => (Number.isFinite(r) && r >= 0 ? r : 0));
    const sum = validRatios.reduce((a, b) => a + b, 0);
    if (sum > 0) return validRatios.map((r) => r / sum);
  }
  return Array.from({ length: count }, () => 1 / count);
}
