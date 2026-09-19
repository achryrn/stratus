/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * RemoteControl window actor (child = web-content scope).
 */

function serializeSafe(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return value;
  }
  if (t === "bigint") {
    return String(value);
  }
  if (t === "function") {
    return { __kind: "function", __text: String(value).slice(0, 160) };
  }
  if (Array.isArray(value)) {
    return value.map((v) => serializeSafe(v)).slice(0, 200);
  }
  if (t === "object") {
    try {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).slice(0, 64)) {
        const v = (value as Record<string, unknown>)[key];
        if (typeof v === "function") {
          continue;
        }
        out[key] = serializeSafe(v);
      }
      return out;
    } catch {
      return { __kind: "unserializable", __text: String(value).slice(0, 160) };
    }
  }
  return String(value);
}

export class RemoteControlChild extends JSWindowActorChild {
  receiveMessage(msg: { name: string; data: unknown }) {
    const d = (msg.data ?? {}) as Record<string, unknown>;
    switch (msg.name) {
      case "RCEval": {
        try {
          const expression = String(d.expression ?? "");
          // eval under the SYSTEM principal is hard-blocked on this build
          // (MOZ_CRASH); run it through the page window so it executes with
          // the content principal, like a page script.
          const contentWindow = this.contentWindow as unknown as {
            eval(expr: string): unknown;
          } | null;
          if (!contentWindow || typeof contentWindow.eval !== "function") {
            return { ok: false, error: "no content window to eval in" };
          }
          const raw = contentWindow.eval(expression);
          return { ok: true, value: serializeSafe(raw) };
        } catch (error) {
          return { ok: false, error: String(error).slice(0, 1000) };
        }
      }
      case "RCRect": {
        try {
          const el = this.document?.querySelector(String(d.selector ?? ""));
          if (!el) {
            return { ok: true, rect: null };
          }
          const r = (el as Element).getBoundingClientRect();
          return {
            ok: true,
            rect: {
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
              x: r.x,
              y: r.y,
            },
          };
        } catch (error) {
          return { ok: false, error: String(error).slice(0, 300) };
        }
      }
      case "RCScroll": {
        try {
          const dx = Number(d.dx ?? 0);
          const dy = Number(d.dy ?? 0);
          const selector = String(d.selector ?? "");
          const baseTarget =
            (selector && this.document?.querySelector(selector)) ||
            this.document?.scrollingElement ||
            this.document?.documentElement;
          if (!baseTarget) {
            return { ok: false, error: "no scroll target" };
          }
          const beforeY = baseTarget.scrollTop;
          const ev = new this.contentWindow!.WheelEvent("wheel", {
            deltaX: dx,
            deltaY: dy,
            deltaMode: 0,
            bubbles: true,
            cancelable: true,
          });
          baseTarget.dispatchEvent(ev);
          const scrolled = baseTarget.scrollTop;
          if (scrolled === beforeY && dy !== 0 && baseTarget !== this.document?.scrollingElement) {
            // Un-trusted wheel events may not scroll; fall back to direct
            // scrollTop movement so the API contract always holds.
            baseTarget.scrollTop += dy;
          }
          return { ok: true, beforeY, afterY: baseTarget.scrollTop };
        } catch (error) {
          return { ok: false, error: String(error).slice(0, 300) };
        }
      }
      case "RCSnapshot": {
        try {
          const doc = this.document;
          return {
            ok: true,
            snapshot: {
              url: this.contentWindow?.location?.href ?? null,
              title: doc?.title ?? null,
              text: (doc?.body?.innerText ?? "").slice(0, 12000),
              anchors: doc?.links?.length ?? 0,
              buttons: doc?.querySelectorAll("button, [role=button]")?.length ?? 0,
              inputs: doc?.querySelectorAll("input, textarea, select")?.length ?? 0,
            },
          };
        } catch (error) {
          return { ok: false, error: String(error).slice(0, 300) };
        }
      }
      default:
        return { ok: false, error: "unknown actor message: " + msg.name };
    }
  }
}
