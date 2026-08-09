// SPDX-License-Identifier: MPL-2.0
// @colocated-env browser

/**
 * M4 Phase 2.6: Split-View Divider Keyboard Accessibility Tests
 *
 * Covers the pure resize math + announcement formatting from
 * utils/keyboard-resize.ts. The DOM wiring (tabindex, role=separator,
 * keydown listeners) is exercised in split-view-integration.test.ts.
 *
 * WCAG 2.1 AA requirements verified:
 * - 2.1.1 Keyboard: Arrow/Home/End resize the divider
 * - 2.1.1 Keyboard: Shift+Arrow fine adjustment
 * - 2.1.1 Keyboard: values clamp to a usable range (10%-90%)
 * - 4.1.2 Name/Role/Value: announcement strings are deterministic
 */

import {
  assertEquals,
  runTests,
} from "../../../test/utils/test_harness.ts";
import {
  clampRatio,
  formatResizeAnnouncement,
  KEYBOARD_RESIZE_FINE_STEP,
  KEYBOARD_RESIZE_MAX,
  KEYBOARD_RESIZE_MIN,
  KEYBOARD_RESIZE_STEP,
  nextFlexRatio,
  nextGridRatio,
} from "../utils/keyboard-resize.ts";

// ---------------------------------------------------------------------------
// Arrow key step tests
// ---------------------------------------------------------------------------

function testArrowRightIncreasesFlexRatio(): void {
  const next = nextFlexRatio(0.5, "ArrowRight", false);
  assertEquals(
    next,
    0.5 + KEYBOARD_RESIZE_STEP,
    "ArrowRight should increase the before-pane ratio by one step",
  );
}

function testArrowLeftDecreasesFlexRatio(): void {
  const next = nextFlexRatio(0.5, "ArrowLeft", false);
  assertEquals(
    next,
    0.5 - KEYBOARD_RESIZE_STEP,
    "ArrowLeft should decrease the before-pane ratio by one step",
  );
}

function testVerticalKeysMatchHorizontalSemantics(): void {
  // For vertical splits, Up shrinks the top pane (same as Left on horizontal).
  assertEquals(
    nextFlexRatio(0.4, "ArrowUp", false),
    nextFlexRatio(0.4, "ArrowLeft", false),
    "ArrowUp should behave like ArrowLeft",
  );
  assertEquals(
    nextFlexRatio(0.4, "ArrowDown", false),
    nextFlexRatio(0.4, "ArrowRight", false),
    "ArrowDown should behave like ArrowRight",
  );
}

function testShiftArrowUsesFineStep(): void {
  assertEquals(
    nextFlexRatio(0.5, "ArrowRight", true),
    0.5 + KEYBOARD_RESIZE_FINE_STEP,
    "Shift+ArrowRight should use the fine 1% step",
  );
  assertEquals(
    nextFlexRatio(0.5, "ArrowLeft", true),
    0.5 - KEYBOARD_RESIZE_FINE_STEP,
    "Shift+ArrowLeft should use the fine 1% step",
  );
}

function testHomeAndEndJumpToBounds(): void {
  assertEquals(
    nextFlexRatio(0.5, "Home", false),
    KEYBOARD_RESIZE_MIN,
    "Home should jump to the minimum ratio",
  );
  assertEquals(
    nextFlexRatio(0.5, "End", false),
    KEYBOARD_RESIZE_MAX,
    "End should jump to the maximum ratio",
  );
}

function testRatioClampedToMinimum(): void {
  const next = nextFlexRatio(0.05, "ArrowLeft", false);
  assertEquals(
    next,
    KEYBOARD_RESIZE_MIN,
    "ratio should not go below the 10% floor",
  );
}

function testRatioClampedToMaximum(): void {
  const next = nextFlexRatio(0.95, "ArrowRight", false);
  assertEquals(
    next,
    KEYBOARD_RESIZE_MAX,
    "ratio should not go above the 90% ceiling",
  );
}

function testUnknownKeyReturnsCurrent(): void {
  assertEquals(
    nextFlexRatio(0.5, "Tab", false),
    0.5,
    "unhandled keys should leave the ratio unchanged",
  );
}

function testGridRatioUsesSameMath(): void {
  assertEquals(
    nextGridRatio(0.5, "ArrowRight", false),
    nextFlexRatio(0.5, "ArrowRight", false),
    "grid ratios should share flex math",
  );
}

function testClampRatioHandlesInvalidInput(): void {
  assertEquals(clampRatio(NaN), 0.5, "NaN should fall back to 0.5");
  assertEquals(clampRatio(Infinity), 0.5, "Infinity should fall back to 0.5");
  assertEquals(clampRatio(-1), KEYBOARD_RESIZE_MIN, "negative clamps to min");
  assertEquals(clampRatio(2), KEYBOARD_RESIZE_MAX, ">1 clamps to max");
}

// ---------------------------------------------------------------------------
// Announcement formatting tests
// ---------------------------------------------------------------------------

function testHorizontalAnnouncement(): void {
  assertEquals(
    formatResizeAnnouncement(0.4, "horizontal"),
    "Left panel 40%, right panel 60%",
    "horizontal announcement should name left/right panels with percentages",
  );
}

function testVerticalAnnouncement(): void {
  assertEquals(
    formatResizeAnnouncement(0.25, "vertical"),
    "Top panel 25%, bottom panel 75%",
    "vertical announcement should name top/bottom panels",
  );
}

function testAnnouncementRoundsToPercent(): void {
  assertEquals(
    formatResizeAnnouncement(1 / 3, "horizontal"),
    "Left panel 33%, right panel 67%",
    "announcement should round to whole percentages",
  );
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function runAllTests(): Promise<void> {
  await runTests("split-view-keyboard-resize.test.ts", [
    { name: "a11y: ArrowRight increases flex ratio", fn: testArrowRightIncreasesFlexRatio },
    { name: "a11y: ArrowLeft decreases flex ratio", fn: testArrowLeftDecreasesFlexRatio },
    { name: "a11y: vertical keys mirror horizontal", fn: testVerticalKeysMatchHorizontalSemantics },
    { name: "a11y: Shift+arrow fine step", fn: testShiftArrowUsesFineStep },
    { name: "a11y: Home/End bounds", fn: testHomeAndEndJumpToBounds },
    { name: "a11y: ratio clamped to min", fn: testRatioClampedToMinimum },
    { name: "a11y: ratio clamped to max", fn: testRatioClampedToMaximum },
    { name: "a11y: unknown key no-op", fn: testUnknownKeyReturnsCurrent },
    { name: "a11y: grid ratio shares math", fn: testGridRatioUsesSameMath },
    { name: "a11y: clamp invalid input", fn: testClampRatioHandlesInvalidInput },
    { name: "a11y: horizontal announcement", fn: testHorizontalAnnouncement },
    { name: "a11y: vertical announcement", fn: testVerticalAnnouncement },
    { name: "a11y: announcement rounds", fn: testAnnouncementRoundsToPercent },
  ]);
}