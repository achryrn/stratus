/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * M4 Phase 2.6 remediation: keyboard resize for split-view dividers.
 *
 * Pure logic module (no DOM) so the resize math is unit-testable in the
 * browser test harness. The splitters component wires these helpers to
 * real handles (tabindex + ARIA separator + keydown listeners).
 *
 * WCAG 2.1 AA:
 * - 2.1.1 Keyboard: divider fully operable with arrow keys
 * - 2.4.7 Focus Visible: focus indicator via CSS :focus-visible
 * - 4.1.2 Name, Role, Value: role="separator" + aria-valuenow/min/max
 */

export const KEYBOARD_RESIZE_STEP = 0.05; // 5% per arrow press
export const KEYBOARD_RESIZE_FINE_STEP = 0.01; // Shift+arrow = 1%
export const KEYBOARD_RESIZE_MIN = 0.1; // 10% floor
export const KEYBOARD_RESIZE_MAX = 0.9; // 90% ceiling

/**
 * Compute the next ratio for a flex divider (between two panes).
 *
 * @param currentRatio - current ratio of the pane BEFORE the divider (0-1)
 * @param key - "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End"
 * @param fine - true when Shift is held (1% steps)
 * @returns the new ratio clamped to [MIN, MAX]
 */
export function nextFlexRatio(
  currentRatio: number,
  key: string,
  fine: boolean,
): number {
  const step = fine ? KEYBOARD_RESIZE_FINE_STEP : KEYBOARD_RESIZE_STEP;
  switch (key) {
    case "ArrowLeft":
    case "ArrowUp":
      return clampRatio(currentRatio - step);
    case "ArrowRight":
    case "ArrowDown":
      return clampRatio(currentRatio + step);
    case "Home":
      return KEYBOARD_RESIZE_MIN;
    case "End":
      return KEYBOARD_RESIZE_MAX;
    default:
      return currentRatio;
  }
}

/**
 * Compute the next grid ratio for a grid divider (column or row).
 * Same semantics as flex but operates on the grid ratio directly.
 */
export function nextGridRatio(
  currentRatio: number,
  key: string,
  fine: boolean,
): number {
  return nextFlexRatio(currentRatio, key, fine);
}

export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) {
    return 0.5;
  }
  return Math.max(KEYBOARD_RESIZE_MIN, Math.min(KEYBOARD_RESIZE_MAX, ratio));
}

/**
 * Human-readable announcement for a resize action (used by the live region).
 */
export function formatResizeAnnouncement(
  ratio: number,
  orientation: "horizontal" | "vertical",
): string {
  const pct = Math.round(ratio * 100);
  return orientation === "horizontal"
    ? `Left panel ${pct}%, right panel ${100 - pct}%`
    : `Top panel ${pct}%, bottom panel ${100 - pct}%`;
}