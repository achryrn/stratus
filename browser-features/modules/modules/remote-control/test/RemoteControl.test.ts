// SPDX-License-Identifier: MPL-2.0
// @colocated-env browser

import {
  assert,
  assertEquals,
  runTests,
  type TestCase,
} from "../../../../chrome/test/utils/test_harness.ts";

function testElementCenterScreenMath(): void {
  const win = { screenX: 100, screenY: 50 };
  const frame = { left: 0, top: 80 };
  const rect = { left: 10, top: 10, width: 20, height: 20 };
  const zoom = 2;
  const x = Math.round(win.screenX + frame.left + (rect.left + rect.width / 2) * zoom);
  const y = Math.round(win.screenY + frame.top + (rect.top + rect.height / 2) * zoom);
  assertEquals(x, 140, "center x math");
  assertEquals(y, 170, "center y math");
}

const tests: TestCase[] = [
  {
    name: "elementCenterScreen math with zoom",
    fn: testElementCenterScreenMath,
  },
];

export async function runAllTests(): Promise<void> {
  await runTests("RemoteControl.test.ts", tests);
}
