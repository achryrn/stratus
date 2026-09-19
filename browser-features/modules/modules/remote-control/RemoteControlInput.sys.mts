/* MPL-2.0 */

import type { InputRequest } from "./RemoteControlTypes.ts";

/**
 * REAL operating-system-level input through the browser window's
 * nsIDOMWindowUtils instance (sendNativeMouseEvent / sendNativeKeyEvent /
 * sendNativeMouseScrollEvent). Verified live on ESR 153: the methods exist on
 * the windowUtils INSTANCE (not on the Ci.nsIDOMWindowUtils namespace object)
 * and move the actual OS cursor (GetCursorPos reflects the movement) and
 * produce real WM-level button/key events.
 */

type Rect = { left: number; top: number; width: number; height: number };

interface ActorLike {
  sendQuery(name: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
}

function ws(window: unknown): { sendNativeMouseEvent(x: number, y: number, msg: number, button: number, mods: number, widget: unknown): void; sendNativeKeyEvent(layout: number, keyCode: number, mods: number, chars: string, unmodChars: string): void; sendNativeMouseScrollEvent(x: number, y: number, msg: number, dx: number, dy: number, dz: number, mods: number, flags: number, element: unknown): void } {
  return (window as { windowUtils: never }).windowUtils as ReturnType<typeof ws>;
}

const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;

export function buttonId(button: InputRequest["button"] = "left"): number {
  if (button === "middle") return MIDDLE;
  if (button === "right") return RIGHT;
  return LEFT;
}

/** Ask the content actor for an element's rect (CSS px inside the page). */
export async function elementRect(
  browser: { browsingContext?: { currentWindowGlobal?: { getActor(name: string): ActorLike } | null } | null },
  selector: string,
): Promise<Rect | null> {
  const wg = browser.browsingContext?.currentWindowGlobal;
  if (!wg) return null;
  const actor = wg.getActor("RemoteControl");
  const res = (await actor.sendQuery("RCRect", { selector })) as { ok?: boolean; rect?: Rect | null };
  return res.ok ? (res.rect ?? null) : null;
}

/**
 * Translate a content element to SCREEN coordinates: content CSS rect ->
 * (browser frame offset in the chrome window) -> (window position on screen),
 * scaled by the page zoom.
 */
export function elementCenterScreen(
  window_: { screenX: number; screenY: number },
  frameRect: { left: number; top: number },
  rect: Rect,
  zoom: number,
): { x: number; y: number } {
  return {
    x: Math.round(window_.screenX + frameRect.left + (rect.left + rect.width / 2) * zoom),
    y: Math.round(window_.screenY + frameRect.top + (rect.top + rect.height / 2) * zoom),
  };
}

function press(window_: unknown, x: number, y: number, message: number, button: number, mods: number): void {
  ws(window_).sendNativeMouseEvent(x, y, message, button, mods, null);
}


/** One down+up click at screen coordinates. */
export function nativeClick(
  window_: unknown,
  x: number,
  y: number,
  button: number,
  double: boolean,
  mods: number,
): void {
  const W = Ci.nsIDOMWindowUtils as unknown as {
    NATIVE_MOUSE_MESSAGE_MOVE: number;
    NATIVE_MOUSE_MESSAGE_BUTTON_DOWN: number;
    NATIVE_MOUSE_MESSAGE_BUTTON_UP: number;
    MOUSE_BUTTONS_NO_BUTTON: number;
  };
  const clicks = double ? 2 : 1;
  for (let i = 0; i < clicks; i++) {
    press(window_, x, y, W.NATIVE_MOUSE_MESSAGE_MOVE, W.MOUSE_BUTTONS_NO_BUTTON, mods);
    press(window_, x, y, W.NATIVE_MOUSE_MESSAGE_BUTTON_DOWN, button, mods);
    press(window_, x, y, W.NATIVE_MOUSE_MESSAGE_BUTTON_UP, button, mods);
  }
}

export function nativeWheel(window_: unknown, x: number, y: number, dx: number, dy: number, dz: number, mods = 0): void {
  ws(window_).sendNativeMouseScrollEvent(x, y, 0, dx, dy, dz, mods, 0, null);
}

/** Key name -> Windows virtual key code (sendNativeKeyEvent keyCode slot). */
const NAMED_KEYS: Record<string, number> = {
  Enter: 13,
  Return: 13,
  Tab: 9,
  Backspace: 8,
  Delete: 46,
  Escape: 27,
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
  Home: 36,
  End: 35,
  PageUp: 33,
  PageDown: 34,
  Space: 32,
  " ": 32,
  F5: 116,
};

export function nativeKey(window_: unknown, key: string, mods = 0): void {
  const w = ws(window_);
  if (key.length === 1 && !NAMED_KEYS[key]) {
    // Modern signature: (layout, keyCode, mods, characters, unmodified).
    w.sendNativeKeyEvent(0, 0, mods, key, key);
    return;
  }
  const vk = NAMED_KEYS[key] ?? key.toUpperCase().charCodeAt(0);
  w.sendNativeKeyEvent(0, vk, mods, "", "");
}

export function nativeType(window_: unknown, text: string, mods = 0): void {
  const w = ws(window_);
  for (const ch of text) {
    w.sendNativeKeyEvent(0, 0, mods, ch, ch);
  }
}
